package com.stepcounter.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.Context.MODE_PRIVATE
import android.content.pm.PackageManager
import android.content.pm.PackageManager.FEATURE_SENSOR_STEP_COUNTER
import android.content.pm.PackageManager.FEATURE_SENSOR_STEP_DETECTOR
import android.os.Build.VERSION
import android.os.Build.VERSION_CODES

object AndroidVersionHelper {
    private const val PREF_NAME = "pref.com.stepcounter.stepcounter"
    /**
     * Decides whether the current soft- and hardware setup allows using hardware step detection
     * @param pm An instance of the android PackageManager
     * @return true, if hardware step detection can be used otherwise false
     */
    @SuppressLint("ObsoleteSdkInt")
    private fun supportsStepDetector(pm: PackageManager): Boolean {
        // (Hardware) step detection was introduced in KitKat (4.4 / API 19)
        // https://developer.android.com/about/versions/android-4.4.html
        // In addition to the system version
        // the hardware step detection is not supported on every device,
        // let's check the device's ability.
        return (VERSION.SDK_INT >= VERSION_CODES.KITKAT
                && pm.hasSystemFeature(FEATURE_SENSOR_STEP_COUNTER)
                && pm.hasSystemFeature(FEATURE_SENSOR_STEP_DETECTOR))
    }

    /**
     * Decides whether the hardware step counter should be used.
     * In this case, the step counter-service
     * will not show any notification and update the step count not in real time.
     * This helps to save
     * energy and increases the accuracy - but is only available on some devices.
     * @param context An instance of the originating Context
     * @return true, if hardware step counter should and can be used.
     */
    fun isHardwareStepCounterEnabled(context: Context): Boolean {
        val sharedPref = context.getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        return supportsStepDetector(context.packageManager) && sharedPref.getBoolean(
            "com.stepcounter.pref.use_step_hardware", false)
    }
}