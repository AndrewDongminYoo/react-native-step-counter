package com.stepcounter.services

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager.PERMISSION_DENIED
import android.content.pm.PackageManager.PERMISSION_GRANTED
import android.net.Uri
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.os.Process
import android.provider.Settings
import android.util.Log
import android.util.SparseArray
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.stepcounter.R

class PermissionService(reactContext: ReactApplicationContext) : PermissionListener {
    private val mCallbacks: SparseArray<Callback> = SparseArray()
    private val context = reactContext
    private var mRequestCode = 0
    /**
     * The permission array that will be requested and checked.
     * values of [permissionString][Manifest.permission] are:
     * [BODY_SENSORS|BODY_SENSORS_BACKGROUND][Manifest.permission_group.SENSORS],
     * [ACTIVITY_RECOGNITION][Manifest.permission.ACTIVITY_RECOGNITION],
     */
    private val permissionArray: Array<String>
        get() {
            Log.d("StepCounter", "permissionArray")
            val array = arrayOf<String>()
            array.plus(Manifest.permission.BODY_SENSORS)
            if (SDK_INT >= VERSION_CODES.Q) {
                array.plus(Manifest.permission.ACTIVITY_RECOGNITION)
            }
            if (SDK_INT >= VERSION_CODES.TIRAMISU) {
                array.plus(Manifest.permission.BODY_SENSORS_BACKGROUND)
            }
            return array
        }

    /**
     * the value of function getPermissionAwareActivity returns.
     * @throws IllegalStateException if the current activity is null.
     * @throws IllegalStateException if the current activity is not a [PermissionAwareActivity].
     */
    private val permissionActivity: PermissionAwareActivity
        get() {
            Log.d("StepCounter", "permissionActivity")
            val activity = context.currentActivity
            checkNotNull(activity) {
                context.getString(R.string.permissionAwareActivityIsNull)
            }
            check(activity is PermissionAwareActivity) {
                context.getString(R.string.isNotPermissionAwareActivity)
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
        Log.d("StepCounter", "onRequestPermissionsResult")
        mCallbacks[requestCode].invoke(grantResults, permissionActivity)
        mCallbacks.remove(requestCode)
        return mCallbacks.size() == 0
    }

    /**
     * @param permission The permission to get field name.
     * @return The field name of the permission.
     */
    private fun getFieldName(permission: String): String? {
        Log.d("StepCounter", "getFieldName")
        if (permission.isBlank()) return null
        return if (permission.startsWith("android.permission")) {
            permission.removePrefix("android.permission")
        } else {
            null
        }
    }

    /**
     * Check if a permission is available on the current device.
     *
     * @param permission The permission to check.
     * @return true if the permission is available, false otherwise.
     */
    private fun permissionExists(permission: String): Boolean {
        Log.d("StepCounter", "permissionExists")
        if (permission.isBlank()) return false
        val fieldName = getFieldName(permission) ?: return false
        return try {
            Manifest.permission::class.java.getField(fieldName)
            true
        } catch (_: NoSuchFieldException) {
            false
        }
    }

    /**
     * Check if a permission is granted.
     * @param permission The permission to check.
     * @return The permission status.\
     * one of [GRANTED], [DENIED], [UNAVAILABLE]
     */
    private fun checkPermission(permission: String): String {
        Log.d("StepCounter", "checkPermission")
        if (!permissionExists(permission)) return UNAVAILABLE
        val context = context.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            return if (context.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_GRANTED
            ) GRANTED else DENIED
        }
        return if (context.checkSelfPermission(
                permission,
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
        Log.d("StepCounter", "requestPermission")
        if (!permissionExists(permission)) return UNAVAILABLE
        val baseContext = context.baseContext
        if (SDK_INT < VERSION_CODES.M) {
            if (baseContext.checkPermission(
                    permission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PERMISSION_DENIED
            ) GRANTED else DENIED
        } else if (baseContext.checkSelfPermission(
                permission,
            ) == PERMISSION_GRANTED
        ) return GRANTED
        permissionActivity.requestPermissions(
            arrayOf(
                permission,
            ),
            mRequestCode,
            this,
        )
        mRequestCode++
        return if (permissionActivity
                .shouldShowRequestPermissionRationale(
                    permission,
                )
        ) DENIED else BLOCKED
    }

    /**
     * Check multiple permissions.
     * @param strArr The permissions to check.
     * @return writable map of permissions and their status.
     * the each values are one of [GRANTED], [DENIED], [UNAVAILABLE]
     */
    private fun checkMultiplePermissions(strArr: Array<String>?): WritableMap {
        Log.d("StepCounter", "checkMultiplePermissions")
        val permissions = strArr ?: permissionArray
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
    private fun requestMultiplePermissions(strArr: Array<String>?): WritableMap {
        Log.d("StepCounter", "requestMultiplePermissions")
        val permissions: Array<String> = strArr ?: permissionArray
        val output = WritableNativeMap()
        var checkedPermissionsCount = 0
        for (permission in permissions) {
            val granted = requestPermission(permission)
            output.putString(permission, granted)
            checkedPermissionsCount++
        }
        if (permissions.size == checkedPermissionsCount) {
            return output
        }
        permissionActivity.requestPermissions(
            permissions,
            mRequestCode,
            this,
        )
        mRequestCode++
        return output
    }

    /**
     * Open the settings page of the app.
     * @suppress If "openSettings" is never used
     * @return true if the settings page is opened, false otherwise.
     */
    private fun openSettings(): Boolean {
        Log.d("StepCounter", "openSettings")
        return try {
            val intent = Intent()
            val packageName = context.packageName
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.data = Uri.fromParts("package", packageName, null)
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun checkRequiredPermission() {
        try {
            requestMultiplePermissions(permissionArray)
            checkMultiplePermissions(permissionArray)
        } catch (e: Exception) {
            openSettings()
            e.printStackTrace()
        }
    }

    companion object {
        private const val GRANTED = "granted"
        private const val BLOCKED = "blocked"
        private const val DENIED = "denied"
        private const val UNAVAILABLE = "unavailable"
    }
}