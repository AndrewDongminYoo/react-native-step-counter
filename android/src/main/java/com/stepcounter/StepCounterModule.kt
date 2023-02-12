package com.stepcounter

import android.Manifest.permission.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.models.StepperInterface
import com.stepcounter.services.PermissionService
import com.stepcounter.services.StepDetector

@Suppress("MemberVisibilityCanBePrivate", "UNUSED_PARAMETER", "unused")
@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    SensorEventListener,
    StepperInterface,
    ReactModuleWithSpec,
    TurboModule {
    companion object {
        const val NAME = "RNStepCounter"
        const val STOPPED = 0
        const val STARTING = 1
        const val RUNNING = 2
        const val ERROR_FAILED_TO_START = 3
        const val ERROR_NO_SENSOR_FOUND = 4
        const val STEP_IN_METERS = 0.762f
    }

    private val applicationContext = reactContext
    private var permissionService = PermissionService(reactContext)
    private var status = STOPPED

    // set up things for resetting steps (to zero (most of the time) at midnight
    private val stepDetector = StepDetector()
    private val sensorManager: SensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var stepSensor: Sensor? = null
    private var startNumSteps: Double? = 0.0
    private var currentSteps: Double = 0.0
    private var lastUpdate: Long = 0L
    private var i = 0
    private var delay: Int = 0
    private val distance: Double
        get() = currentSteps * STEP_IN_METERS

    /**
     * request permission for the sensor and check if the device has a step counter or accelerometer sensor.
     * if accelerometer sensor is found, then register as listener.
     * else if step counter sensor is found, then register as listener.
     * @return true if the device has a step counter or accelerometer sensor. false otherwise.
     */
    val isStepCountingSupported: Boolean
        get() {
            permissionService.checkRequiredPermission()
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

    /**
     * set module status to [RUNNING].
     * [stepSensor] is set to step counter sensor or accelerometer sensor.
     * register as listener for [stepSensor] to receive sensor events.
     * @param from the time in milliseconds when the step counting service is started.
     * @return true if the [stepSensor] is not null. false otherwise.
     */
    fun startStepCounterUpdate(from: Double): Boolean {
        stepDetector.registerListener(this)
        if (status == RUNNING || status == STARTING) {
            return true
        }
        lastUpdate = from.toLong()
        currentSteps = 0.0
        startNumSteps = 0.0
        status = RUNNING
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

    /**
     * set module status to [STOPPED].
     * unregister as listener for [stepSensor].
     */
    fun stopStepCounterUpdate() {
        sensorManager.unregisterListener(this)
        stepSensor = null
        startNumSteps = null
        currentSteps = 0.0
        val stepsParamsMap = Arguments.createMap()
        stepsParamsMap.putDouble("steps", currentSteps)
        stepsParamsMap.putDouble("distance", distance)
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        status = STOPPED
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepCounterUpdate".
     */
    fun addListener(eventName: String) {
        // Keep: Required for RN built in Event Emitter Support
        startStepCounterUpdate(System.currentTimeMillis().toDouble())
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    fun removeListeners(count: Int) {
        // Keep: Required for RN built in Event Emitter Support
        stopStepCounterUpdate()
    }

    override fun getName(): String {
        return NAME
    }

    override fun invalidate() {}

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    init {
        status = try {
            if (status != RUNNING) {
                val service = Intent(reactContext, StepCounterModule::class.java)
                applicationContext.startService(service)
                STARTING
            } else {
                RUNNING
            }
        } catch (_: Exception) {
            ERROR_FAILED_TO_START
        }
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
        val stepSensor = event.sensor
        if (stepSensor.type == Sensor.TYPE_ACCELEROMETER) {
            stepDetector.updateAccel(
                event.timestamp, // currentTime
                event.values[0], // accelerometer X
                event.values[1], // accelerometer Y
                event.values[2], // accelerometer Z
            )
        }
        if (stepSensor.type == Sensor.TYPE_STEP_COUNTER) {
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
     * Implemented method from [StepperInterface]
     * @param steps [Float] number of steps
     * sends step counter update event (map data) to JS module
     * @sample {steps: 10, distance: 0.5}
     * @throws RuntimeException if the [applicationContext] is null.
     */
    override fun step(steps: Float) {
        val endDate = System.currentTimeMillis()
        currentSteps = steps.toDouble().minus(startNumSteps!!)
        val stepsParamsMap = Arguments.createMap()
        stepsParamsMap.putDouble("steps", currentSteps)
        stepsParamsMap.putDouble("distance", distance)
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
            lastUpdate = endDate
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Send event to JS Module
     * @param params [WritableMap]
     * @sample {steps: 10, distance: 0.5}
     * @throws RuntimeException
     */
    private fun sendStepCounterUpdateEvent(params: WritableMap?) {
        try {
            applicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("stepCounterUpdate", params)
        } catch (e: RuntimeException) {
            Log.e("ERROR", "java.lang.RuntimeException: Trying to invoke JS before CatalystInstance has been set!")
        }
    }

    /**
     * Called when the accuracy of the registered sensor has changed.
     * Unlike [onSensorChanged], this is only called when this accuracy value changes.
     *
     * @see [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param sensor [Sensor] The sensor the that has accuracy changed.
     * @param accuracy [Int] the new accuracy of this sensor, value is one of
     * [SensorManager.SENSOR_STATUS_ACCURACY_LOW]: 1,
     * [SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM]: 2, or
     * [SensorManager.SENSOR_STATUS_ACCURACY_HIGH]: 3.
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    }
}