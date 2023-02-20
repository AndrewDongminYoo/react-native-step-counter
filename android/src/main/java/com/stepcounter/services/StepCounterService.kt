package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager

class StepCounterService : SensorListenService() {
    override val sensorTypeString = "STEP_COUNTER"
    override val sensorDelay = SensorManager.SENSOR_DELAY_NORMAL
    override val sensorType = Sensor.TYPE_STEP_COUNTER
    private var lastUpdate: Long = 0
    private var i = 0
    private var delay: Int = 0
    private var initSteps: Double? = null
    override var currentSteps: Double = 0.0
    override fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double {
        val curTime = System.currentTimeMillis()
        i++
        if ((curTime - lastUpdate) > delay) {
            i = 0
            if (initSteps === null) {
                initSteps = eventData[0].toDouble()
            } else {
                currentSteps = eventData[0].toDouble().minus(initSteps!!)
                lastUpdate = curTime
            }
        }
        return currentSteps
    }
}