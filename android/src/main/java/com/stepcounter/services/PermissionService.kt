package com.stepcounter.services

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager.*
import android.net.Uri
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.os.Process
import android.provider.Settings
import android.util.SparseArray
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

    private val bodySensorPermission = Manifest.permission.BODY_SENSORS
    private val activityReconPermission =
        if (SDK_INT >= VERSION_CODES.Q) Manifest.permission.ACTIVITY_RECOGNITION else ""
    private val highRateSensorPermission =
        if (SDK_INT >= VERSION_CODES.S) Manifest.permission.HIGH_SAMPLING_RATE_SENSORS else ""
    private val backgroundSensorPermission =
        if (SDK_INT >= VERSION_CODES.TIRAMISU) Manifest.permission.BODY_SENSORS_BACKGROUND else ""

    val permissionArray: Array<String>
        get() {
            return arrayOf(
                bodySensorPermission,
                activityReconPermission,
                highRateSensorPermission,
                backgroundSensorPermission,
            )
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

    private fun checkPermission(permission: String?): String {
        if (permission == null || !permissionExists(permission)) {
            return UNAVAILABLE
        }
        val context = applicationContext.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            return if (context.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_GRANTED
            ) {
                GRANTED
            } else {
                BLOCKED
            }
        }
        return if (context.checkSelfPermission(permission) == PERMISSION_GRANTED) {
            GRANTED
        } else {
            DENIED
        }
    }

    private fun requestPermission(permission: String): String {
        if (!permissionExists(permission)) {
            return UNAVAILABLE
        }
        val context = applicationContext.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            return if (context.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_GRANTED
            ) {
                GRANTED
            } else {
                DENIED
            }
        } else if (context.checkSelfPermission(permission) == PERMISSION_GRANTED) {
            return GRANTED
        } else {
            val activity = permissionAwareActivity
            activity.requestPermissions(arrayOf(permission), mRequestCode, this)
            mRequestCode++
            return if (activity.shouldShowRequestPermissionRationale(permission)) {
                DENIED
            } else {
                BLOCKED
            }
        }
    }

    fun checkMultiplePermissions(strArr: Array<String>?): WritableMap {
        val permissions = strArr ?: permissionArray
        val output: WritableMap = WritableNativeMap()
        for (i in permissions.indices) {
            val permission = permissions[i]
            val granted = checkPermission(permission)
            output.putString(permission, granted)
        }
        return output
    }

    fun requestMultiplePermissions(strArr: Array<String>?): WritableMap {
        val permissions: Array<String> = strArr ?: permissionArray
        val output: WritableMap = WritableNativeMap()
        var checkedPermissionsCount = 0
        for (permission in permissions.iterator()) {
            requestPermission(permission)
            val granted = checkPermission(permission)
            output.putString(permission, granted)
            checkedPermissionsCount++
        }
        if (permissions.size == checkedPermissionsCount) {
            return output
        }
        val activity = permissionAwareActivity
        activity.requestPermissions(permissions, mRequestCode, this)
        mRequestCode++
        return output
    }

    fun openSettings(): Boolean {
        return try {
            val reactContext = applicationContext
            val intent = Intent()
            val packageName = reactContext.packageName
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.data = Uri.fromParts("package", packageName, null)
            reactContext.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        private const val GRANTED = "granted"
        private const val BLOCKED = "blocked"
        private const val DENIED = "denied"
        private const val UNAVAILABLE = "unavailable"
    }
}