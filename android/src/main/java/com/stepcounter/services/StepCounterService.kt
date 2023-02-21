package com.stepcounter.services

import android.Manifest.permission
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.os.Process
import androidx.annotation.RequiresApi
import java.util.concurrent.TimeUnit

class StepCounterService : SensorListenService() {
    override val sensorTypeString = "STEP_COUNTER"
    override val sensorDelay = SensorManager.SENSOR_DELAY_NORMAL
    override val sensorType = Sensor.TYPE_STEP_COUNTER
    private var lastUpdate: Long = 0
    private var i = 0
    private var delay: Int = 0
    private var initSteps: Double = 0.0
    override var currentSteps: Double = 0.0
    override var startDate: Long = 0
    override var endDate: Long = 0

    @RequiresApi(Build.VERSION_CODES.Q)
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        this.enforcePermission(
            permission.ACTIVITY_RECOGNITION,
            Process.myPid(),
            Process.myUid(),
            "Permission denied"
        )
        startDate = System.currentTimeMillis()
        return super.onStartCommand(intent, flags, startId)
    }

    override fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double {
        endDate = TimeUnit.NANOSECONDS.toMillis(timeNs)
        i++
        if ((endDate - lastUpdate) > delay) {
            i = 0
            if (initSteps == 0.0) {
                initSteps = eventData[0].toDouble()
            } else {
                currentSteps = eventData[0].toDouble().minus(initSteps)
                lastUpdate = endDate
            }
        }
        return currentSteps
    }
}