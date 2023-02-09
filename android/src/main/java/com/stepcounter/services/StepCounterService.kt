package com.stepcounter.services

import android.content.Context.SENSOR_SERVICE
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stepcounter.models.StepperInterface

class StepCounterService(context: ReactApplicationContext) :
    SensorEventListener,
    StepperInterface {
    // set up things for resetting steps (to zero (most of the time) at midnight
    private val reactContext = context
    private val stepDetector = StepDetector()
    var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    private var accelerometer: Sensor? = null
    var isServiceRunning = false
    private var startNumSteps: Float
    private var currentSteps: Float
    private var status: Int // STOPPED
    private var startAt: Long // 0.0
    private var defaultPromise: Promise? = null

    private val stepsParamsMap: WritableMap
        get() {
            val map: WritableMap = Arguments.createMap()
            map.putInt("startDate", startAt.toInt())
            map.putInt("endDate", System.currentTimeMillis().toInt())
            map.putDouble("steps", currentSteps.toDouble())
            map.putDouble("distance", (currentSteps * STEP_IN_METERS).toDouble())
            return map
        }

    init {
        startAt = 0
        currentSteps = 0f
        startNumSteps = 0f
        status = STOPPED
        stepDetector.registerListener(this)
        sensorManager = context.getSystemService(SENSOR_SERVICE) as SensorManager
    }

    /**
     * Called when there is a new sensor event.  Note that "on changed"
     * is somewhat of a misnomer, as this will also be called if we have a
     * new reading from a sensor with the exact same sensor values (but a
     * newer timestamp).
     *
     *
     * See [SensorManager][android.hardware.SensorManager]
     * for details on possible sensor types.
     *
     * See also [SensorEvent][android.hardware.SensorEvent].
     *
     *
     * **NOTE:** The application doesn't own the
     * [event][android.hardware.SensorEvent]
     * object passed as a parameter and therefore cannot hold on to it.
     * The object may be part of an internal pool and may be reused by
     * the framework.
     *
     * @param event the [SensorEvent][android.hardware.SensorEvent].
     */
    override fun onSensorChanged(event: SensorEvent) {
        if (!isServiceRunning) return
        val steps: Float = event.values[0]
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            stepDetector.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
        } else if (stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            if (startNumSteps == 0F) startNumSteps = steps
            currentSteps = steps - startNumSteps
        } else if (status == STOPPED) return else return
        status = RUNNING
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
            defaultPromise!!.resolve(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Called when the accuracy of the registered sensor has changed.  Unlike
     * onSensorChanged(), this is only called when this accuracy value changes.
     *
     *
     * See the SENSOR_STATUS_* constants in
     * [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param accuracy The new accuracy of this sensor, one of
     * `SensorManager.SENSOR_STATUS_*`
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    }

    override fun step(timeNs: Long) {
        currentSteps++
        stepsParamsMap.putDouble("steps", currentSteps.toDouble())
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun isStepCountingAvailable(): Boolean {
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        return if (accelerometer != null || stepSensor != null) {
            status = STARTING
            true
        } else {
            status = ERROR_NO_SENSOR_FOUND
            false
        }
    }

    fun startStepCounterUpdatesFromDate(date: Int?, promise: Promise?) {
        // If not running, then this is an async call, so don't worry about waiting
        // We drop the callback onto our stack, call start, and let start and the sensor callback fire off the callback down the road
        defaultPromise = promise
        if (status == RUNNING || status == STARTING) {
            return
        }
        startAt = date?.toLong() ?: System.currentTimeMillis()
        currentSteps = 0f
        startNumSteps = 0f
        status = STARTING
        // Get stepCounter or accelerometer from sensor manager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepSensor == null) {
            stepSensor =
                sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        // If found, then register as listener
        if (stepSensor != null) {
            sensorManager!!.registerListener(
                this,
                stepSensor,
                SensorManager.SENSOR_DELAY_FASTEST,
                SensorManager.SENSOR_DELAY_UI,
            )
        } else {
            status = ERROR_FAILED_TO_START
            return
        }
    }

    fun stopStepCounterUpdates() {
        if (status != STOPPED) {
            sensorManager?.unregisterListener(this)
        }
        status = STOPPED
    }

    private fun sendStepCounterUpdateEvent(params: WritableMap?) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("pedometerDataDidUpdate", params)
    }

    companion object {
        var STOPPED = 0
        var STARTING = 1
        var RUNNING = 2
        var ERROR_FAILED_TO_START = 3
        var ERROR_NO_SENSOR_FOUND = 4
        var STEP_IN_METERS = 0.762f
    }
}