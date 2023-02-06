package com.stepcounter.step.services

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Build.VERSION_CODES
import android.os.Process
import android.provider.Settings
import android.util.SparseArray
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class PermissionService(reactContext: ReactApplicationContext?) : PermissionListener {
    private val mCallbacks: SparseArray<Callback> = SparseArray()
    private var mSharedPrefs: SharedPreferences? = null
    private val activity: Activity?
    private var mRequestCode = 0

    init {
        applicationContext = reactContext
        activity = Activity()
    }

    private val permissionAwareActivity: PermissionAwareActivity
        get() {
            checkNotNull(activity) { "Tried to use permissions API while not attached to an " + "Activity." }
            check(activity is PermissionAwareActivity) {
                ("Tried to use permissions API but the host Activity doesn't" + " implement PermissionAwareActivity.")
            }
            return activity
        }

    fun requestPermission(permission: String, promise: Promise) {
        if (permissionNotExists(permission)) {
            promise.resolve(UNAVAILABLE)
            return
        }
        if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
            promise.resolve(
                if (applicationContext!!.checkPermission(
                        permission,
                        Process.myPid(),
                        Process.myUid(),
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    GRANTED
                } else {
                    BLOCKED
                },
            )
            return
        }
        if (applicationContext!!.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
            promise.resolve(GRANTED)
            return
        }
        if (!this.isNeedRequestPermission(permission, activity!!, promise)) {
            return
        }
        try {
            val rationaleStatuses = BooleanArray(1)
            rationaleStatuses[0] =
                permissionAwareActivity.shouldShowRequestPermissionRationale(permission)
            mCallbacks.put(
                mRequestCode,
                Callback { args: Array<Any> ->
                    val results = args[0] as IntArray
                    if (results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED) {
                        promise.resolve(GRANTED)
                    } else {
                        val perActivity = args[1] as PermissionAwareActivity
                        val boolArray = args[2] as BooleanArray
                        if (perActivity.shouldShowRequestPermissionRationale(permission)) {
                            promise.resolve(DENIED)
                        } else if (boolArray[0]) {
                            promise.resolve(BLOCKED)
                            mSharedPrefs!!.edit().putBoolean(permission, true).apply()
                        }
                    }
                },
            )
            permissionAwareActivity.requestPermissions(arrayOf(permission), mRequestCode, this)
            mRequestCode++
        } catch (e: IllegalStateException) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    private fun isNeedRequestPermission(
        permission: String,
        activity: Activity,
        promise: Promise,
    ): Boolean {
        mSharedPrefs =
            activity.applicationContext.getSharedPreferences(SETTING_NAME, Context.MODE_PRIVATE)
        val notBlocked = mSharedPrefs != null && mSharedPrefs!!.getBoolean(permission, false)
        val result = if (activity.applicationContext.checkPermission(
                permission,
                Process.myPid(),
                Process.myUid(),
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            GRANTED
        } else {
            DENIED
        }
        return if (result == GRANTED) {
            promise.resolve(result)
            true
        } else if (!notBlocked) {
            // not supporting reset the permission with "Ask me every time"
            promise.resolve(BLOCKED)
            false
        } else {
            promise.resolve(DENIED)
            false
        }
    }

    fun openSettings(promise: Promise) {
        try {
            val intent = Intent()
            val packageName = applicationContext!!.packageName
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.data = Uri.fromParts("package", packageName, null)
            applicationContext!!.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ): Boolean {
        return try {
            val mCallback = mCallbacks[requestCode]
            mCallback.invoke(grantResults, permissionAwareActivity)
            mCallbacks.remove(requestCode)
            mCallbacks.size() == 0
        } catch (_: Exception) {
            false
        }
    }

    fun checkPermission(permission: String?): String {
        if ((permission == null) || permissionNotExists(permission)) {
            return UNAVAILABLE
        }
        return if (applicationContext!!.checkPermission(
                permission,
                Process.myPid(),
                Process.myUid(),
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            GRANTED
        } else {
            DENIED
        }
    }

    fun shouldShowRequestPermissionRationale(permission: String?, promise: Promise) {
        if (permission == null || Build.VERSION.SDK_INT < VERSION_CODES.M) {
            promise.resolve(false)
            return
        }
        try {
            promise.resolve(
                permissionAwareActivity.shouldShowRequestPermissionRationale(permission),
            )
        } catch (e: IllegalStateException) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    @Suppress("unused")
    fun checkMultiplePermissions(permissions: Array<String>): WritableMap {
        val output: WritableMap = WritableNativeMap()
        for (permission in permissions.iterator()) {
            if (permissionNotExists(permission)) {
                output.putString(permission, UNAVAILABLE)
            } else if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
                output.putString(
                    permission,
                    if (applicationContext!!.checkPermission(
                            permission,
                            Process.myPid(),
                            Process.myUid(),
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        GRANTED
                    } else {
                        BLOCKED
                    },
                )
            } else if (applicationContext!!.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                output.putString(permission, GRANTED)
            } else {
                output.putString(permission, DENIED)
            }
        }
        return output
    }

    fun requestMultiplePermissions(permissions: Array<String>, promise: Promise) {
        val output: WritableMap = WritableNativeMap()
        val permissionsToCheck = ArrayList<String>()
        var checkedPermissionsCount = 0
        for (permission in permissions.iterator()) {
            if (permissionNotExists(permission)) {
                output.putString(permission, UNAVAILABLE)
                checkedPermissionsCount++
            } else if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
                output.putString(
                    permission,
                    if (applicationContext!!.checkPermission(
                            permission,
                            Process.myPid(),
                            Process.myUid(),
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        GRANTED
                    } else {
                        BLOCKED
                    },
                )
                checkedPermissionsCount++
            } else if (applicationContext!!.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                output.putString(permission, GRANTED)
                checkedPermissionsCount++
            } else {
                permissionsToCheck.add(permission)
            }
        }
        if (permissions.size == checkedPermissionsCount) {
            promise.resolve(output)
            return
        }
        try {
            val activity = permissionAwareActivity
            mCallbacks.put(
                mRequestCode,
                Callback { args: Array<Any> ->
                    val results = args[0] as IntArray
                    val perActivity = args[1] as PermissionAwareActivity
                    for (j in permissionsToCheck.indices) {
                        val permission = permissionsToCheck[j]
                        if (results.isNotEmpty() && results[j] == PackageManager.PERMISSION_GRANTED) {
                            output.putString(permission, GRANTED)
                        } else {
                            if (perActivity.shouldShowRequestPermissionRationale(permission)) {
                                output.putString(permission, DENIED)
                            } else {
                                output.putString(permission, BLOCKED)
                            }
                        }
                    }
                    promise.resolve(output)
                },
            )
            activity.requestPermissions(permissionsToCheck.toTypedArray(), mRequestCode, this)
            mRequestCode++
        } catch (e: IllegalStateException) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    private fun getFieldName(permission: String): String? {
        if (permission == "android.permission.ACTIVITY_RECOGNITION") return "ACTIVITY_RECOGNITION"
        if (permission == "android.permission.BODY_SENSORS") return "BODY_SENSORS"
        if (permission == "android.permission.BODY_SENSORS_BACKGROUND") return "BODY_SENSORS_BACKGROUND"
        if (permission == "android.permission.WRITE_EXTERNAL_STORAGE") return "WRITE_EXTERNAL_STORAGE"
        if (permission == "android.permission.HIGH_SAMPLING_RATE_SENSORS") return "HIGH_SAMPLING_RATE_SENSORS"
        return null
    }

    private fun permissionNotExists(permission: String): Boolean {
        val fieldName = getFieldName(permission) ?: return true
        return try {
            permission::class.java.getField(fieldName)
            false
        } catch (ignored: NoSuchFieldException) {
            true
        }
    }

    @Suppress("unused")
    fun checkNotifications(promise: Promise) {
        val enabled = NotificationManagerCompat.from(applicationContext!!).areNotificationsEnabled()
        val output = Arguments.createMap()
        val settings = Arguments.createMap()
        output.putString("status", if (enabled) GRANTED else BLOCKED)
        output.putMap("settings", settings)
        promise.resolve(output)
    }

    companion object {
        private const val BLOCKED = "blocked"
        private const val SETTING_NAME = "@RNSNPermissions:NonRequestables"
        private const val GRANTED = "granted"
        private const val DENIED = "denied"
        private const val UNAVAILABLE = "unavailable"
        private const val ERROR_INVALID_ACTIVITY = "E_INVALID_ACTIVITY"
        var applicationContext: Context? = null
    }
}