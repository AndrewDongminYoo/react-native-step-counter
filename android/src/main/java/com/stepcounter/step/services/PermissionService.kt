package com.stepcounter.step.services

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.util.SparseArray
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class PermissionService : PermissionListener {

    private var mRequestCode = 0
    private var mSharedPrefs: SharedPreferences? = null
    private var mRequests: SparseArray<Request>? = null
    private var permissionAwareActivity: PermissionAwareActivity? = null

    private class Request(var rationaleStatuses: BooleanArray, var callback: Callback)

    fun requestPermission(permission: String, activity: Activity, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(
                if (activity.applicationContext.checkPermission(
                        permission,
                        Process.myPid(),
                        Process.myUid(),
                    )
                    == PackageManager.PERMISSION_GRANTED
                ) {
                    GRANTED
                } else {
                    BLOCKED
                },
            )
            return
        }
        if (!this.isNeedRequestPermission(
                permission,
                activity,
                promise,
            )
        ) {
            return
        }
        try {
            permissionAwareActivity = activity as PermissionAwareActivity
            val rationaleStatuses = BooleanArray(1)
            rationaleStatuses[0] = activity.shouldShowRequestPermissionRationale(permission)

            mRequests!!.put(
                mRequestCode,
                Request(
                    rationaleStatuses,
                ) { args ->
                    val results = args[0] as IntArray
                    if (results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED) {
                        promise.resolve(GRANTED)
                    } else {
                        if ((args[2] as BooleanArray)[0] &&
                            !(args[1] as PermissionAwareActivity).shouldShowRequestPermissionRationale(
                                permission,
                            )
                        ) {
                            mSharedPrefs!!.edit().putBoolean(permission, true)
                                .apply() // enforce sync
                            promise.resolve(BLOCKED)
                        } else {
                            promise.resolve(DENIED)
                        }
                    }
                },
            )
            permissionAwareActivity!!.requestPermissions(arrayOf(permission), mRequestCode, this)
            mRequestCode++
        } catch (e: Exception) {
            promise.resolve(ERROR_INVALID_ACTIVITY)
        }
    }

    fun isNeedRequestPermission(
        permission: String,
        activity: Activity,
        promise: Promise,
    ): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(
                if (activity.applicationContext.checkPermission(
                        permission,
                        Process.myPid(),
                        Process.myUid(),
                    )
                    == PackageManager.PERMISSION_GRANTED
                ) {
                    GRANTED
                } else {
                    BLOCKED
                },
            )
            return false
        }
        mRequests = SparseArray<Request>()
        mSharedPrefs =
            activity.applicationContext.getSharedPreferences(SETTING_NAME, Context.MODE_PRIVATE)
        if (activity.applicationContext.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
            promise.resolve(GRANTED)
            return false
        } else if (mSharedPrefs != null && mSharedPrefs!!.getBoolean(permission, false)) {
            promise.resolve(BLOCKED) // not supporting reset the permission with "Ask me every time"
            return false
        }
        return true
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>?,
        grantResults: IntArray?,
    ): Boolean {
        try {
            val request: Request = mRequests!![requestCode]
            request.callback.invoke(
                grantResults,
                permissionAwareActivity,
                request.rationaleStatuses,
            )
            mRequests!!.remove(requestCode)
            return mRequests!!.size() == 0
        } catch (_: Exception) {
        }
        return false
    }

    companion object {
        private const val BLOCKED = "blocked"
        private const val SETTING_NAME = "@RNSNPermissions:NonRequestables"
        private const val GRANTED = "granted"
        private const val DENIED = "denied"
        val ERROR_INVALID_ACTIVITY = "E_INVALID_ACTIVITY"
    }
}