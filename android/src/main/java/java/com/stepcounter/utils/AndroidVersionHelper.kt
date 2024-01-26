package com.stepcounter.utils

import android.content.Context
import android.content.pm.PackageManager.FEATURE_SENSOR_ACCELEROMETER
import android.content.pm.PackageManager.FEATURE_SENSOR_STEP_COUNTER
import android.util.Log
import androidx.annotation.RequiresFeature
import com.stepcounter.utils.AndroidVersionHelper.TAG_NAME
import com.stepcounter.utils.AndroidVersionHelper.isHardwareAccelerometerEnabled
import com.stepcounter.utils.AndroidVersionHelper.isHardwareStepCounterEnabled

/**
 * This class is responsible for the version check of the android device.
 * It is used to check whether the device supports hardware step detection.
 * @property TAG_NAME The name of the class
 * @property isHardwareStepCounterEnabled Decides whether the hardware step counter should be used
 * @property isHardwareAccelerometerEnabled Decides whether the hardware accelerometer should be used
 */
object AndroidVersionHelper {
    private val TAG_NAME: String = AndroidVersionHelper::class.java.name

    @RequiresFeature(name = FEATURE_SENSOR_STEP_COUNTER, enforcement = "1")
    fun isHardwareStepCounterEnabled(context: Context): Boolean {
        Log.d(TAG_NAME, "isHardwareStepCounterEnabled: $FEATURE_SENSOR_STEP_COUNTER")
        return context.packageManager.hasSystemFeature(FEATURE_SENSOR_STEP_COUNTER)
    }

    @RequiresFeature(name = FEATURE_SENSOR_ACCELEROMETER, enforcement = "1")
    fun isHardwareAccelerometerEnabled(context: Context): Boolean {
        Log.d(TAG_NAME, "isHardwareStepCounterEnabled: $FEATURE_SENSOR_ACCELEROMETER")
        return context.packageManager.hasSystemFeature(FEATURE_SENSOR_ACCELEROMETER)
    }
}