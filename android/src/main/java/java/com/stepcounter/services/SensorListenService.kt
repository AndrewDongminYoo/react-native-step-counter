package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.WritableMap
import com.stepcounter.StepCounterModule

abstract class SensorListenService(
    private val counterModule: StepCounterModule,
    private  val sensorManager: android.hardware.SensorManager
) : SensorEventListener, LifecycleEventListener {

    abstract val sensorType: Int


    private val samplingPeriodUs
        get() = when (sensorType) {
            Sensor.TYPE_ACCELEROMETER -> SensorManager.SENSOR_DELAY_GAME
            Sensor.TYPE_STEP_COUNTER -> SensorManager.SENSOR_DELAY_NORMAL
            else -> SensorManager.SENSOR_DELAY_UI
        }

    abstract val sensorTypeString: String
    abstract val detectedSensor: Sensor?
    val stepsParamsMap: WritableMap
        get() = Arguments.createMap().apply {
            putNumber("steps", currentSteps)
            putNumber("distance", distance)
            putNumber("startDate", startDate)
            putNumber("endDate", endDate)
            putString("counterType", sensorTypeString)
            putNumber("calories", calories)
        }

    val stepsSensorInfo: WritableMap
        get() = Arguments.createMap().apply {
            putNumber("minDelay", detectedSensor!!.minDelay)
            putNumber("maxDelay", detectedSensor!!.maxDelay)
            putString("name", detectedSensor!!.name)
            putString("vendor", detectedSensor!!.vendor)
            putNumber("power", detectedSensor!!.power)
            putNumber("resolution", detectedSensor!!.resolution)
            putBoolean("wakeUpSensor", detectedSensor!!.isWakeUpSensor)
            putBoolean("additionalInfoSupported", detectedSensor!!.isAdditionalInfoSupported)
        }

    private val calories: Double
        get() = currentSteps * 0.045

    private val distance: Double
        get() = currentSteps * 0.762

    abstract var currentSteps: Double


    private val startDate: Long = System.currentTimeMillis()

    private val endDate: Long
        get() = System.currentTimeMillis()

    private val sensorDelay: Int
        get() = when (samplingPeriodUs) {
            SensorManager.SENSOR_DELAY_FASTEST -> 0
            SensorManager.SENSOR_DELAY_GAME -> 20000
            SensorManager.SENSOR_DELAY_UI -> 66667
            SensorManager.SENSOR_DELAY_NORMAL -> 200000
            else -> samplingPeriodUs
        }

    fun startService() {
        counterModule.sendDeviceEvent("stepsSensorInfo", stepsSensorInfo)
        Log.d(TAG_NAME, "SensorManager.stepsSensorInfo: $stepsSensorInfo")
        sensorManager.registerListener(this, detectedSensor, samplingPeriodUs)
    }

    fun stopService() {
        Log.d(TAG_NAME, "SensorListenService.stopService")
        sensorManager.unregisterListener(this)
    }


    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor == null ||
                event.sensor != detectedSensor ||
                event.sensor.type != sensorType ||
                detectedSensor?.type != event.sensor.type
        ) {
            return
        }
        if (updateCurrentSteps(event.values)) {
            counterModule.sendDeviceEvent("stepCounterUpdate", stepsParamsMap)
        }
    }

    abstract fun updateCurrentSteps(eventData: FloatArray): Boolean

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d(TAG_NAME, "onAccuracyChanged.accuracy $accuracy")
        Log.d(TAG_NAME, "onAccuracyChanged.sensor: $sensor")
    }

    override fun onHostResume() {
    }

    override fun onHostPause() {
    }

    override fun onHostDestroy() {
        this.stopService()
    }

    companion object {
        val TAG_NAME: String = SensorListenService::class.java.name
    }
}

private fun WritableMap.putNumber(key: String, number: Number) {
    when (number) {
        is Double -> putDouble(key, number)
        is Int -> putInt(key, number)
        else -> putDouble(key, number.toDouble())
    }
}
