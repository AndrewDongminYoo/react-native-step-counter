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

    private val bodySensorPermission = Manifest.permission.BODY_SENSORS
    private val activityReconPermission =
        if (SDK_INT >= VERSION_CODES.Q) Manifest.permission.ACTIVITY_RECOGNITION else ""
    private val backgroundSensorPermission =
        if (SDK_INT >= VERSION_CODES.TIRAMISU) Manifest.permission.BODY_SENSORS_BACKGROUND else ""

    /**
     * The permission array that will be requested and checked.
     * @return [Array] Never returns null.
     * values of [permissionString][Manifest.permission] are:
     * [BODY_SENSORS|BODY_SENSORS_BACKGROUND][Manifest.permission_group.SENSORS],
     * [ACTIVITY_RECOGNITION][Manifest.permission.ACTIVITY_RECOGNITION],
     */
    val permissionArray: Array<String>
        get() {
            return arrayOf(
                bodySensorPermission,
                activityReconPermission,
                backgroundSensorPermission,
            )
        }

    /**
     * the value of function getPermissionAwareActivity returns.
     * @return [PermissionAwareActivity] Never returns null.
     * @throws IllegalStateException if the current activity is null.
     * @throws IllegalStateException if the current activity is not a [PermissionAwareActivity].
     */
    private val permissionActivity: PermissionAwareActivity
        get() {
            val activity = applicationContext.currentActivity
            checkNotNull(activity) { "Tried to use permissions API while not attached to an " + "Activity." }
            check(activity is PermissionAwareActivity) {
                ("Tried to use permissions API but the host Activity doesn't" + " implement PermissionAwareActivity.")
            }
            return activity
        }

    /**
     * PermissionListener interface override
     * @param requestCode The request code.
     * @param permissions The requested permissions.
     * @param grantResults The grant results for the corresponding permissions
     * which is either [PERMISSION_GRANTED] or [PERMISSION_DENIED].
     * @return [Boolean] Never returns null.
     */
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray,
    ): Boolean {
        mCallbacks[requestCode].invoke(grantResults, permissionActivity)
        mCallbacks.remove(requestCode)
        return mCallbacks.size() == 0
    }

    /**
     * Request multiple permissions.
     * @param permission The permission to get field name.
     * @return The field name of the permission.
     */
    private fun getFieldName(permission: String): String? {
        if (permission == "android.permission.ACTIVITY_RECOGNITION") return "ACTIVITY_RECOGNITION"
        if (permission == "android.permission.BODY_SENSORS") return "BODY_SENSORS"
        if (permission == "android.permission.BODY_SENSORS_BACKGROUND") return "BODY_SENSORS_BACKGROUND"
        return if (permission.startsWith("android.permission")) permission.removePrefix("android.permission") else null
    }

    /**
     * Check if a permission is available on the current device.
     *
     * @param permission The permission to check.
     * @return true if the permission is NOT available or NON-EXISTS, false otherwise.
     */
    private fun permissionNotExists(permission: String): Boolean {
        if (permission.isBlank()) return true
        val fieldName = getFieldName(permission) ?: return true
        return try {
            permission::class.java.getField(fieldName)
            false
        } catch (_: NoSuchFieldException) {
            true
        }
    }

    /**
     * Check if a permission is granted.
     * @param permission The permission to check.
     * @return The permission status.\
     * one of [GRANTED], [DENIED], [UNAVAILABLE]
     */
    private fun checkPermission(permission: String): String {
        if (permissionNotExists(permission)) {
            return UNAVAILABLE
        }
        val context = applicationContext.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            return if (context.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_GRANTED
            ) GRANTED else DENIED
        }
        return if (context.checkSelfPermission(
                permission
            ) == PERMISSION_GRANTED
        ) GRANTED else DENIED
    }

    /**
     * request a permission to this baseContext.
     * @param permission The permission to query.
     * @return The permission status.\
     * one of [GRANTED], [BLOCKED], [DENIED], [UNAVAILABLE]
     */
    private fun requestPermission(permission: String): String {
        if (permissionNotExists(permission)) return UNAVAILABLE
        val baseContext = applicationContext.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            if (baseContext.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_DENIED
            ) return GRANTED
        } else if (baseContext.checkSelfPermission(
                permission
            ) == PERMISSION_GRANTED
        ) return GRANTED
        permissionActivity.requestPermissions(
            arrayOf(
                permission
            ), mRequestCode, this
        )
        mRequestCode++
        return if (permissionActivity.shouldShowRequestPermissionRationale(
                permission
            )
        ) DENIED else BLOCKED
    }

    /**
     * Check multiple permissions.
     * @param strArr The permissions to check.
     * @return writable map of permissions and their status.
     * the each values are one of [GRANTED], [DENIED], [UNAVAILABLE]
     */
    fun checkMultiplePermissions(strArr: Array<String>?): WritableMap {
        val permissions: Array<String> = strArr ?: permissionArray
        val output = WritableNativeMap()
        for (permission in permissions) {
            val granted = checkPermission(permission)
            output.putString(permission, granted)
        }
        return output
    }

    /**
     * Request multiple permissions.
     * @param strArr The permissions to request.
     * @return writable map of permissions and their status.
     * the each values are one of [GRANTED], [DENIED], [BLOCKED], [UNAVAILABLE]
     */
    fun requestMultiplePermissions(strArr: Array<String>?): WritableMap {
        val permissions: Array<String> = strArr ?: permissionArray
        val output = WritableNativeMap()
        for (permission in permissions) {
            val granted = requestPermission(permission)
            output.putString(permission, granted)
        }
        permissionActivity.requestPermissions(
            permissions, mRequestCode, this
        )
        mRequestCode++
        return output
    }

    /**
     * Open the settings page of the app.
     * @suppress If "openSettings" is never used
     * @return true if the settings page is opened, false otherwise.
     */
    @Suppress("unused")
    fun openSettings(): Boolean {
        return try {
            val intent = Intent()
            val packageName = applicationContext.packageName
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.data = Uri.fromParts("package", packageName, null)
            applicationContext.startActivity(intent)
            true
        } catch (_: Exception) {
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