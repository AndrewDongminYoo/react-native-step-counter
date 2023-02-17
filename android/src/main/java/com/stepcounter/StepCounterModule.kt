package com.stepcounter

import android.content.Context.MODE_PRIVATE
import android.content.Context.SENSOR_SERVICE
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.Sensor.TYPE_ACCELEROMETER
import android.hardware.Sensor.TYPE_STEP_COUNTER
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

import com.stepcounter.models.StepperInterface
import com.stepcounter.services.PermissionService
import com.stepcounter.services.StepDetector
import java.util.concurrent.TimeUnit.NANOSECONDS

@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(context: ReactApplicationContext) :
    NativeStepCounterSpec(context),
    SensorEventListener,
    StepperInterface {
    /**
     * **Companion Constants**
     * @property NAME The name of the native module.
     * @property STOPPED The status of the module when it is stopped.
     * @property STARTING The status of the module when it is starting.
     * @property RUNNING The status of the module when it is running.
     * @property ERROR_FAILED_TO_START The status of the module when it fails to start.
     * @property ERROR_NO_SENSOR_FOUND The status of the module when it fails to find a sensor.
     */
    companion object {
        const val STEP_IN_METERS: Double = 0.762
        const val NAME: String = "RNStepCounter"
        const val STOPPED: Int = 0
        const val STARTING: Int = 1
        const val RUNNING: Int = 2
        const val ERROR_FAILED_TO_START: Int = 3
        const val ERROR_NO_SENSOR_FOUND: Int = 4
    }

    // constants
    private val appContext = context
    private val permissionService = PermissionService(appContext)
    private val sensorManager = appContext.getSystemService(SENSOR_SERVICE) as SensorManager
    private val stepDetector = StepDetector()
    private val sharedPreferences: SharedPreferences =
        appContext.getSharedPreferences("stepCounter", MODE_PRIVATE)
    private val distance: Double
        get() = currentSteps * STEP_IN_METERS

    // not constants
    private var status = STOPPED
    private var stepSensor: Sensor? = null
    private var previousSteps: Double = 0.0
    private var currentSteps: Double = 0.0
    private var lastUpdate: Long = 0L
    private var delay: Long = 0L
    private var sensorTypeString: String = ""

    override fun initialize() {
        super.initialize()
        try {
            // stepDetector is used to detect steps from accelerometer sensor
            stepDetector.registerListener(this)
            // STEP_COUNTER is based on ACCELEROMETER
            stepSensor = sensorManager.getDefaultSensor(TYPE_STEP_COUNTER)
            sensorTypeString = "STEP_COUNTER"
            // if STEP_COUNTER is not supported on current device, then use basic ACCELEROMETER
            if (stepSensor == null) {
                stepSensor = sensorManager.getDefaultSensor(TYPE_ACCELEROMETER)
                sensorTypeString = "ACCELEROMETER"
            }
            if (stepSensor == null) {
                status = ERROR_NO_SENSOR_FOUND
                sensorTypeString = "NO_SENSOR_FOUND"
                return
            }
            status = STARTING
        } catch (_: Exception) {
            status = ERROR_FAILED_TO_START
        }
    }

    override fun invalidate() {
        super.invalidate()
        this.stopStepCounterUpdate()
    }

    /**
     * request permission for the sensor and check
     * if the device has a step counter or accelerometer sensor.
     * if step counter sensor is found, then register as listener.
     * else if accelerometer sensor is found, then register as listener.
     * @return true if the device has a step counter or accelerometer sensor. false otherwise.
     */
    override fun isStepCountingSupported(): Boolean {
        // check if the app has permission to access the required activity sensor
        permissionService.checkRequiredPermission()
        // usually, TYPE_ACCELEROMETER is supported on all devices so this value may return true
        return stepSensor != null
    }

    /**
     * set module status to [RUNNING].
     * [stepSensor] is set to step counter sensor or accelerometer sensor.
     * register as listener for [stepSensor] to receive sensor events.
     * @param from the time in **utc-milliseconds** when the step counting service is started.
     * @return true if the [stepSensor] is not null. false otherwise.
     * @see android.Manifest.permission#HIGH_SAMPLING_RATE_SENSORS
     * In order to access sensor data at high sampling rates
     * (i.e. greater than 200 Hz for [SensorEventListener] and greater than
     * [RATE_NORMAL(50Hz)][android.hardware.SensorDirectChannel.RATE_NORMAL]
     * for [SensorDirectChannel][android.hardware.SensorDirectChannel]),
     * apps must declare the [android.Manifest.permission.HIGH_SAMPLING_RATE_SENSORS]
     * permission in their {@link AndroidManifest.xml} file.
     */
    override fun startStepCounterUpdate(from: Double): Boolean {
        if (status == RUNNING) return true
        if (status == STARTING) return true
        lastUpdate = from.toLong() // Long
        status = STARTING
        // If found, then register as listener
        return if (stepSensor != null) {
            val sensorDelay = if (stepSensor?.type == TYPE_STEP_COUNTER) {
                // Step Counter need low Sampling Rate
                SensorManager.SENSOR_DELAY_UI
            } else {
                // Accelerometer need High Sampling Rate
                SensorManager.SENSOR_DELAY_FASTEST
            }
            sensorManager.registerListener(
                this,
                stepSensor,
                sensorDelay,
                sensorDelay,
            )
        } else {
            status = ERROR_FAILED_TO_START
            false
        }
    }

    /**
     * set module status to [STOPPED].
     * unregister as listener for [stepSensor].
     */
    override fun stopStepCounterUpdate() {
        sensorManager.unregisterListener(this)
        stepDetector.unregisterListener()
        sharedPreferences.edit()
            .putLong("lastUpdate", lastUpdate)
            .putLong("initialSteps", currentSteps.toLong())
            .putLong("distance", distance.toLong())
            .apply()
        stepSensor = null
        previousSteps = 0.0
        currentSteps = 0.0
        try {
            sendStepCounterUpdateEvent()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        status = STOPPED
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepCounterUpdate".
     */
    override fun addListener(eventName: String) {}

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    override fun removeListeners(count: Double) {}
    override fun getName(): String = NAME

    /**
     * Called when there is a new sensor event.  Note that "on changed"
     * is somewhat of a misnomer, as this will also be called if we have a
     * new reading from a sensor with the exact same sensor values (but a
     * newer timestamp).
     *
     * See [SensorManager][android.hardware.SensorManager]
     * for details on possible sensor types.
     *
     * See also [SensorEvent][android.hardware.SensorEvent].
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
        // Accelerometer or StepCounter
        when (event.sensor.type) {
            TYPE_ACCELEROMETER -> {
                check(event.values.size == 3) {
                    appContext.getString(R.string.shouldBeThree)
                }
                stepDetector.updateAccel(
                    event.timestamp, // UTC timestamp in **nanoseconds**.
                    event.values[0], // x축의 가속력(중력 포함). m/s^2
                    event.values[1], // y축의 가속력(중력 포함). m/s^2
                    event.values[2], // z축의 가속력(중력 포함). m/s^2
                )
            }
            TYPE_STEP_COUNTER -> {
                check(event.values.size == 1) {
                    appContext.getString(R.string.shouldBeSingle)
                }
                /* current time in UTC **milliseconds** */
                if ((System.currentTimeMillis() - lastUpdate) > delay) {
                    currentSteps = event.values[0].minus(previousSteps)
                    if (currentSteps > 0.0) {
                        step(event.timestamp, currentSteps)
                    }
                }
            }
        }
    }

    /**
     * Implemented method from [StepperInterface]
     * @param timeNs [Long] timestamp of the sensor event in **nanoseconds**
     * sends step counter update event (map data) to JS module
     * @sample {steps: 10, distance: 0.5}
     * @throws RuntimeException if the [appContext] is null.
     */
    override fun step(timeNs: Long, addedStep: Double?) {
        Log.d("StepCounter", "step: $addedStep time: $timeNs")
        currentSteps = addedStep ?: (currentSteps + 1)
        try {
            sendStepCounterUpdateEvent()
            lastUpdate = NANOSECONDS.toMillis(timeNs)
            previousSteps = currentSteps
            status = RUNNING
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Send event to Device Bridge JS Module
     * @throws RuntimeException
     */
    private fun sendStepCounterUpdateEvent() {
        try {
            val stepsParamsMap = Arguments.createMap()
            stepsParamsMap.putDouble("steps", currentSteps)
            stepsParamsMap.putDouble("distance", distance)
            stepsParamsMap.putString("counterType", sensorTypeString)
            this.appContext
                .getJSModule(
                    RCTDeviceEventEmitter::class.java
                )
                .emit("stepCounterUpdate", stepsParamsMap)
        } catch (e: RuntimeException) {
            Log.e(
                "StepCounter",
                appContext.getString(R.string.sendStepCounterFailure),
            )
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
     * [1] [SensorManager.SENSOR_STATUS_ACCURACY_LOW] |
     * [2] [SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM] |
     * [3] [SensorManager.SENSOR_STATUS_ACCURACY_HIGH]
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d("StepCounter", "accuracy: $accuracy")
        Log.d("StepCounter", "sensorType: ${sensor?.type}")
    }
}