package com.stepcounter.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.Context.MODE_PRIVATE
import android.content.pm.PackageManager
import android.content.pm.PackageManager.FEATURE_SENSOR_STEP_COUNTER
import android.content.pm.PackageManager.FEATURE_SENSOR_STEP_DETECTOR
import android.os.Build.VERSION
import android.os.Build.VERSION_CODES
import android.util.Log
import androidx.annotation.ChecksSdkIntAtLeast
import androidx.annotation.RequiresFeature
import com.stepcounter.utils.AndroidVersionHelper.PREF_NAME
import com.stepcounter.utils.AndroidVersionHelper.TAG_NAME
import com.stepcounter.utils.AndroidVersionHelper.USE_SENSOR
import com.stepcounter.utils.AndroidVersionHelper.isHardwareStepCounterEnabled
import com.stepcounter.utils.AndroidVersionHelper.supportsStepDetector

/**
 * This class is responsible for the version check of the android device.
 * It is used to check whether the device supports hardware step detection.
 * @property TAG_NAME The name of the class
 * @property PREF_NAME The name of the shared preferences
 * @property USE_SENSOR The name of the preference that decides whether the hardware step counter should be used
 * @property supportsStepDetector Decides whether the current soft- and hardware setup allows using hardware step detection
 * @property isHardwareStepCounterEnabled Decides whether the hardware step counter should be used
 */
object AndroidVersionHelper {
    private val TAG_NAME: String = AndroidVersionHelper::class.java.name
    private const val PREF_NAME = "pref.com.stepcounter.stepcounter"
    private const val USE_SENSOR = "pref.com.stepcounter.use_step_hardware"

    /**
     * Decides whether the current soft- and hardware setup allows using hardware step detection
     * @param pm An instance of the android PackageManager
     * @return true, if hardware step detection can be used otherwise false
     */
    @SuppressLint("ObsoleteSdkInt")
    @ChecksSdkIntAtLeast(api = VERSION_CODES.KITKAT)
    @RequiresFeature(name = FEATURE_SENSOR_STEP_COUNTER, enforcement = "1")
    private fun supportsStepDetector(pm: PackageManager): Boolean {
        // (Hardware) step detection was introduced in KitKat (4.4 / API 19)
        // https://developer.android.com/about/versions/android-4.4.html
        // In addition to the system version
        // the hardware step detection is not supported on every device,
        // let's check the device's ability.
        val newerThanKitKat = VERSION.SDK_INT >= VERSION_CODES.KITKAT
        val hasStepDetector = pm.hasSystemFeature(FEATURE_SENSOR_STEP_DETECTOR)
        val hasStepCounter = pm.hasSystemFeature(FEATURE_SENSOR_STEP_COUNTER)
        Log.d(TAG_NAME, "supportsStepDetector: $newerThanKitKat, $hasStepDetector, $hasStepCounter")
        return (newerThanKitKat && hasStepCounter && hasStepDetector)
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
        val useHardWare = sharedPref.getBoolean(USE_SENSOR, true)
        Log.d(TAG_NAME, "useHardWare: $useHardWare")
        return supportsStepDetector(context.packageManager) && useHardWare
    }
}