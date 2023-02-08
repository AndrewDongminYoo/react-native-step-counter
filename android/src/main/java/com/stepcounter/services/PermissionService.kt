package com.stepcounter.services

import android.content.Intent
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

class PermissionService(reactContext: ReactApplicationContext) : PermissionListener {
    private val mCallbacks: SparseArray<Callback> = SparseArray()
    private val applicationContext = reactContext
    private var mRequestCode = 0

    private val permissionAwareActivity: PermissionAwareActivity
        get() {
            val activity = applicationContext.currentActivity
            checkNotNull(activity) { "Tried to use permissions API while not attached to an " + "Activity." }
            check(activity is PermissionAwareActivity) {
                ("Tried to use permissions API but the host Activity doesn't" + " implement PermissionAwareActivity.")
            }
            return activity
        }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray,
    ): Boolean {
        mCallbacks[requestCode].invoke(grantResults, permissionAwareActivity)
        mCallbacks.remove(requestCode)
        return mCallbacks.size() == 0
    }

    private fun getFieldName(permission: String): String? {
        if (permission == "android.permission.ACTIVITY_RECOGNITION") return "ACTIVITY_RECOGNITION"
        if (permission == "android.permission.BODY_SENSORS") return "BODY_SENSORS"
        if (permission == "android.permission.BODY_SENSORS_BACKGROUND") return "BODY_SENSORS_BACKGROUND"
        return if (permission.startsWith("android.permission")) permission.removePrefix("android.permission") else null
    }

    private fun permissionExists(permission: String): Boolean {
        val fieldName = getFieldName(permission) ?: return false
        return try {
            permission::class.java.getField(fieldName)
            true
        } catch (ignored: NoSuchFieldException) {
            false
        }
    }

    fun checkPermission(permission: String?): String {
        if (permission == null || !permissionExists(permission)) {
            return UNAVAILABLE
        }
        val context = applicationContext.baseContext
        if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
            return if (context.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                GRANTED
            } else {
                BLOCKED
            }
        } else if (context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
            return GRANTED
        } else {
            return DENIED
        }
    }

    @Suppress("unused")
    fun requestPermission(permission: String, promise: Promise) {
        if (!permissionExists(permission)) {
            promise.resolve(UNAVAILABLE)
            return
        }
        val context = applicationContext.baseContext
        if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
            promise.resolve(
                if (context.checkPermission(
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
        if (context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
            promise.resolve(GRANTED)
            return
        }
        try {
            var activity = permissionAwareActivity
            mCallbacks.put(
                mRequestCode,
                Callback { args ->
                    val results = args[0] as IntArray
                    if (results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED) {
                        promise.resolve(GRANTED)
                    } else {
                        activity = args[1] as PermissionAwareActivity
                        if (activity.shouldShowRequestPermissionRationale(permission)) {
                            promise.resolve(DENIED)
                        } else {
                            promise.resolve(BLOCKED)
                        }
                    }
                },
            )
            activity.requestPermissions(arrayOf(permission), mRequestCode, this)
            mRequestCode++
        } catch (e: IllegalStateException) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    fun checkMultiplePermissions(permissions: ReadableArray, promise: Promise) {
        val output: WritableMap = WritableNativeMap()
        val context = applicationContext.baseContext
        for (i in 0 until permissions.size()) {
            val permission = permissions.getString(i)
            if (!permissionExists(permission)) {
                output.putString(permission, UNAVAILABLE)
            } else if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
                output.putString(
                    permission,
                    if (context.checkPermission(
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
            } else if (context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                output.putString(permission, GRANTED)
            } else {
                output.putString(permission, DENIED)
            }
        }
        promise.resolve(output)
    }

    fun requestMultiplePermissions(permissions: ReadableArray, promise: Promise?) {
        val output: WritableMap = WritableNativeMap()
        val permissionsToCheck = ArrayList<String>()
        var checkedPermissionsCount = 0
        val context = applicationContext.baseContext
        for (i in 0 until permissions.size()) {
            val permission = permissions.getString(i)
            if (!permissionExists(permission)) {
                output.putString(permission, UNAVAILABLE)
                checkedPermissionsCount++
            } else if (Build.VERSION.SDK_INT < VERSION_CODES.M) {
                output.putString(
                    permission,
                    if (context.checkPermission(
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
            } else if (context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                output.putString(permission, GRANTED)
                checkedPermissionsCount++
            } else {
                permissionsToCheck.add(permission)
            }
        }
        if (permissions.size() == checkedPermissionsCount) {
            promise?.resolve(output)
            return
        }
        try {
            var activity = permissionAwareActivity
            mCallbacks.put(
                mRequestCode,
                Callback { args ->
                    val results = args[0] as IntArray
                    activity = args[1] as PermissionAwareActivity
                    for (j in permissionsToCheck.indices) {
                        val permission = permissionsToCheck[j]
                        if (results.isNotEmpty() && results[j] == PackageManager.PERMISSION_GRANTED) {
                            output.putString(permission, GRANTED)
                        } else {
                            if (activity.shouldShowRequestPermissionRationale(permission)) {
                                output.putString(permission, DENIED)
                            } else {
                                output.putString(permission, BLOCKED)
                            }
                        }
                    }
                    promise?.resolve(output)
                },
            )
            activity.requestPermissions(permissionsToCheck.toTypedArray(), mRequestCode, this)
            mRequestCode++
        } catch (e: IllegalStateException) {
            promise?.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    @Suppress("unused")
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
    fun checkNotifications(promise: Promise) {
        val enabled = NotificationManagerCompat.from(applicationContext).areNotificationsEnabled()
        val output = Arguments.createMap()
        val settings = Arguments.createMap()
        output.putString("status", if (enabled) GRANTED else BLOCKED)
        output.putMap("settings", settings)
        promise.resolve(output)
    }

    @Suppress("unused")
    fun openSettings(promise: Promise) {
        try {
            val reactContext = applicationContext
            val intent = Intent()
            val packageName = reactContext.packageName
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.data = Uri.fromParts("package", packageName, null)
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(ERROR_INVALID_ACTIVITY, e)
        }
    }

    companion object {
        private const val GRANTED = "granted"
        private const val BLOCKED = "blocked"
        private const val DENIED = "denied"
        private const val UNAVAILABLE = "unavailable"
        private const val ERROR_INVALID_ACTIVITY = "E_INVALID_ACTIVITY"
    }
}