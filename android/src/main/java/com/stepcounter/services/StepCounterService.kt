package com.stepcounter.services

import android.content.Context.SENSOR_SERVICE
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
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
    private var sensorManager: SensorManager = context.getSystemService(SENSOR_SERVICE) as SensorManager
    private var stepSensor: Sensor? = null
    private var startNumSteps: Double? = null
    private var currentSteps: Double
    private var status = STOPPED // Int
    private var lastUpdate: Long // 0.0
    private var i = 0
    private var delay: Int = 0

    init {
        lastUpdate = 0L
        currentSteps = 0.0
        startNumSteps = 0.0
        status = STOPPED
        stepDetector.registerListener(this)
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
        if (status == STOPPED) return
        status = RUNNING
        stepSensor = event.sensor ?: stepSensor
        if (stepSensor?.type == Sensor.TYPE_ACCELEROMETER) {
            stepDetector.updateAccel(
                event.timestamp, // currentTime
                event.values[0], // accelerometer X
                event.values[1], // accelerometer Y
                event.values[2], // accelerometer Z
            )
        }
        if (stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            val steps: Float = event.values[0]
            val endDate = System.currentTimeMillis()
            i++
            if ((endDate - lastUpdate) > delay) {
                i = 0
                if (startNumSteps == null) {
                    startNumSteps = steps.toDouble()
                } else {
                    step(steps)
                }
            }
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

    override fun step(steps: Float) {
        val endDate = System.currentTimeMillis()
        currentSteps = steps.toDouble().minus(startNumSteps!!)
        val stepsParamsMap = Arguments.createMap()
        stepsParamsMap.putInt("endDate", endDate.toInt())
        stepsParamsMap.putInt("lastUpdate", lastUpdate.toInt())
        stepsParamsMap.putDouble("steps", currentSteps)
        stepsParamsMap.putDouble("distance", (currentSteps * STEP_IN_METERS))
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
            lastUpdate = endDate
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun isStepCountingAvailable(): Boolean {
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        stepSensor = stepSensor ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        return if (stepSensor != null) {
            status = STARTING
            true
        } else {
            status = ERROR_NO_SENSOR_FOUND
            false
        }
    }

    fun startStepCounterUpdatesFromDate(date: Int?): Boolean {
        // If not running, then this is an async call, so don't worry about waiting
        // We drop the callback onto our stack, call start, and let start and the sensor callback fire off the callback down the road
        if (status == RUNNING || status == STARTING) {
            return true
        }
        lastUpdate = date?.toLong() ?: System.currentTimeMillis()
        currentSteps = 0.0
        startNumSteps = 0.0
        status = STARTING
        // Get stepCounter or accelerometer from sensor manager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepSensor == null) {
            stepSensor =
                sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        // If found, then register as listener
        return if (stepSensor != null) {
            sensorManager.registerListener(
                this,
                stepSensor,
                SensorManager.SENSOR_DELAY_FASTEST,
                SensorManager.SENSOR_DELAY_UI,
            )
        } else {
            status = ERROR_FAILED_TO_START
            return false
        }
    }

    fun stopStepCounterUpdates() {
        if (status != STOPPED) {
            sensorManager.unregisterListener(this)
            status = STOPPED
        }
    }

    private fun sendStepCounterUpdateEvent(params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("StepCounter", params)
        } catch (e: RuntimeException) {
            Log.e("ERROR", "java.lang.RuntimeException: Trying to invoke JS before CatalystInstance has been set!")
        }
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