package com.stepcounter

import android.Manifest.permission.*
import android.content.Context.*
import android.content.Intent
import android.hardware.Sensor
import android.hardware.Sensor.*
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.BuildConfig.DEBUG
import com.stepcounter.models.Milliseconds
import com.stepcounter.models.Nanoseconds
import com.stepcounter.models.STATUS
import com.stepcounter.models.StepperInterface
import com.stepcounter.services.PermissionService
import com.stepcounter.services.StepDetector

/**
 * This class is the native module for the StepCounter package.
 */
@Suppress("MemberVisibilityCanBePrivate", "UNUSED_PARAMETER", "unused")
@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context),
    SensorEventListener,
    StepperInterface,
    ReactModuleWithSpec,
    TurboModule {
    /**
     * **Companion Constants**
     * @property NAME The name of the native module.
     *   when it fails to find a sensor.
     * @property STEP_IN_METERS The number of meters in a step.
     */
    companion object {
        // Simply calculated distance traveled per step
        const val STEP_IN_METERS: Float = 0.762f
        const val NAME: String = "RNStepCounter"
    }

    // constants
    private val applicationContext = context
    private var permissionService = PermissionService(context)
    private val sensorManager = context.getSystemService(SENSOR_SERVICE) as SensorManager
    private val stepDetector = StepDetector()
    private val distance: Double
        get() = currentSteps * STEP_IN_METERS

    // not constants
    private var status: STATUS = STATUS.STOPPED
    private var stepSensor: Sensor? = null
    private var initialSteps: Double? = 0.0
    private var currentSteps: Double = 0.0
    private var lastUpdate: Milliseconds = 0L
    private var delay: Milliseconds = 0L
    private var i: Int = 0

    private fun setStatus(status: STATUS) {
        this.status = status
    }

    /**
     * request permission for the sensor and check
     * if the device has a step counter or accelerometer sensor.
     * if step counter sensor is found, then register as listener.
     * else if accelerometer sensor is found, then register as listener.
     * @return true if the device has a step counter or accelerometer sensor. false otherwise.
     */
    val isStepCountingSupported: Boolean
        get() {
            // check if the app has permission to access the required activity sensor
            permissionService.checkRequiredPermission()
            // STEP_COUNTER is based on ACCELEROMETER
            stepSensor = sensorManager.getDefaultSensor(TYPE_STEP_COUNTER)
            // if STEP_COUNTER is not supported on current device, then use basic ACCELEROMETER
            if (stepSensor == null) {
                stepSensor = sensorManager.getDefaultSensor(TYPE_ACCELEROMETER)
            }
            // debug all the properties of step sensors
            Arguments.createMap().apply {
                putString("name", stepSensor!!.name)
                putString("vendor", stepSensor!!.vendor)
                putString("version", stepSensor!!.version.toString())
                putString("type", stepSensor!!.type.toString())
                putString("maxRange", stepSensor!!.maximumRange.toString())
                putString("resolution", stepSensor!!.resolution.toString())
                putString("power", stepSensor!!.power.toString())
                putString("minDelay", stepSensor!!.minDelay.toString())
                putString("maxDelay", stepSensor!!.maxDelay.toString())
                putString("fifoResEventCount", stepSensor!!.fifoReservedEventCount.toString())
                putString("fifoMaxEventCount", stepSensor!!.fifoMaxEventCount.toString())
                putString("stringType", stepSensor!!.stringType)
            }.let { if (DEBUG) Log.d("stepSensor", it.toString()) }
            // usually, TYPE_ACCELEROMETER is supported on all devices so this value may return true
            setStatus(if (stepSensor != null) STATUS.STARTING else STATUS.ERROR_NO_SENSOR_FOUND)
            return stepSensor !== null
        }

    /**
     * set module status to [STATUS.RUNNING].
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
    fun startStepCounterUpdate(from: Double): Boolean {
        // stepDetector is used to detect steps from accelerometer sensor
        stepDetector.registerListener(this)
        if (status == STATUS.RUNNING || status == STATUS.STARTING) {
            return true
        }
        lastUpdate = from.toLong() // Milliseconds
        currentSteps = 0.0
        initialSteps = 0.0
        setStatus(STATUS.STARTING)
        // Get stepCounter or accelerometer from sensor manager
        stepSensor = sensorManager.getDefaultSensor(TYPE_STEP_COUNTER)
        if (stepSensor == null) {
            stepSensor = sensorManager.getDefaultSensor(TYPE_ACCELEROMETER)
        }
        // If found, then register as listener
        return if (stepSensor != null) {
            val sensorDelay = if (stepSensor?.type != TYPE_STEP_COUNTER) {
                SensorManager.SENSOR_DELAY_FASTEST
            } else {
                SensorManager.SENSOR_DELAY_NORMAL
            }
            sensorManager.registerListener(
                this,
                stepSensor,
                sensorDelay,
                sensorDelay,
            )
        } else {
            setStatus(STATUS.ERROR_FAILED_TO_START)
            false
        }
    }

    /**
     * set module status to [STATUS.STOPPED].
     * unregister as listener for [stepSensor].
     */
    fun stopStepCounterUpdate() {
        sensorManager.unregisterListener(this)
        stepSensor = null
        initialSteps = null
        currentSteps = 0.0
        val stepsParamsMap = Arguments.createMap()
        stepsParamsMap.putDouble("steps", currentSteps)
        stepsParamsMap.putDouble("distance", distance)
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        setStatus(STATUS.STOPPED)
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepCounterUpdate".
     */
    @Suppress("EmptyMethod", "EmptyMethod")
    fun addListener(eventName: String) {}

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    fun removeListeners(count: Int) {}
    override fun getName(): String = NAME
    override fun invalidate() {}
    override fun canOverrideExistingModule(): Boolean = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    init {
        try {
            if (status == STATUS.STOPPED) {
                val service = Intent(context, StepCounterModule::class.java)
                applicationContext.startService(service)
                setStatus(STATUS.STARTING)
            }
        } catch (_: Exception) {
            setStatus(STATUS.ERROR_FAILED_TO_START)
        }
    }

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
        if (DEBUG) {
            Log.d("stepSensor", "onSensorChanged:sensor ${event.sensor}")
            Log.d("stepSensor", "onSensorChanged:accuracy ${event.accuracy}")
            Log.d("stepSensor", "onSensorChanged:values ${event.values}")
            Log.d("stepSensor", "onSensorChanged:timestamp ${event.timestamp}")
        }
        if (status == STATUS.STOPPED) return
        setStatus(STATUS.RUNNING)
        val stepSensor = event.sensor
        when (stepSensor.type) {
            TYPE_ACCELEROMETER -> {
                if (event.values.size < 3) return
                stepDetector.updateAccel(
                    event.timestamp, // currentTime: UTC timestamp in **nanoseconds**.
                    event.values[0], // x축의 가속력(중력 포함). m/s^2
                    event.values[1], // y축의 가속력(중력 포함). m/s^2
                    event.values[2], // z축의 가속력(중력 포함). m/s^2
                )
            }
            TYPE_STEP_COUNTER -> {
                /* [curTime] the difference between current time and UTC in **milliseconds**. */
                val curTime: Long = System.currentTimeMillis()
                i++
                if ((curTime - lastUpdate) > delay) {
                    i = 0
                    if (initialSteps == null) {
                        // The number of steps the user has taken since the last reboot.
                        initialSteps = event.values[0].toDouble()
                    } else {
                        currentSteps = event.values[0].toDouble().minus(initialSteps!!)
                        if (currentSteps > 0.0) {
                            val map = Arguments.createMap()
                            map.putDouble("steps", currentSteps)
                            map.putDouble("distance", distance)
                            sendStepCounterUpdateEvent(map)
                            lastUpdate = curTime
                        }
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
     * @throws RuntimeException if the [applicationContext] is null.
     */
    override fun step(timeNs: Nanoseconds) {
        currentSteps++
        val stepsParamsMap = Arguments.createMap()
        stepsParamsMap.putDouble("steps", currentSteps)
        stepsParamsMap.putDouble("distance", distance)
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
            lastUpdate = timeNs
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Send event to Device Bridge JS Module
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
            Log.e(
                "ERROR",
                "java.lang.RuntimeException: " +
                    "Trying to invoke JS before CatalystInstance has been set!",
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
    }
}