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

/**
 * the base class for sensor listen service
 * @param counterModule the step counter module
 * @param sensorManager the sensor manager
 * @see StepCounterModule
 * @see Sensor
 * @see SensorEvent
 * @see <a href="https://developer.android.com/reference/android/hardware/SensorEventListener">SensorEventListener</a>
 * @see <a href="https://developer.android.com/reference/android/hardware/SensorManager">SensorManager</a>
 * @see <a href="https://reactnative.dev/docs/native-modules-android#listening-to-lifecycle-events">LifecycleEventListener: document</a>
 * @see <a href="https://github.com/facebook/react-native/blob/main/ReactAndroid/src/main/java/com/facebook/react/bridge/LifecycleEventListener.java">LifecycleEventListener: original file</a>
 */
abstract class SensorListenService(
    private val counterModule: StepCounterModule,
    private val sensorManager: android.hardware.SensorManager
) : SensorEventListener, LifecycleEventListener {
    /**
     * the accelerometer sensor type
     * [TYPE_ACCELEROMETER][Sensor.TYPE_ACCELEROMETER]: 1<br/>
     *
     * the step counter sensor type
     * [TYPE_STEP_COUNTER][Sensor.TYPE_STEP_COUNTER]: 19<br/>
     */
    abstract val sensorType: Int

    /**
     * The `rate` of [sensor events][android.hardware.SensorEvent] are
     * delivered at. This is only a hint to the system. Events may be received faster or
     * slower than the specified rate. Usually events are received faster.
     *
     * [samplingPeriodUs] – The desired delay between two consecutive events in microseconds.
     * This is only a hint to the system. Events may be received faster or slower than the specified rate.
     * Typically, events are received faster. Can be one of [SENSOR_DELAY_NORMAL][SensorManager.SENSOR_DELAY_NORMAL], [SENSOR_DELAY_UI][SensorManager.SENSOR_DELAY_UI],
     * [SENSOR_DELAY_GAME][SensorManager.SENSOR_DELAY_GAME], or [SENSOR_DELAY_FASTEST][SensorManager.SENSOR_DELAY_FASTEST]
     * or, the desired delay between events in microseconds. Specifying the delay in microseconds only works
     * from Android 2.3 (API level 9) onwards. For earlier releases, you must use one of the `SENSOR_DELAY_*` constants.
     *
     * @see
     * The following are the constants for the sampling period in microseconds
     * <pre class="prettyprint kotlin">
     * private fun getDelay(rate: Int): Int {
     *     return when (rate) {
     *         SensorManager.SENSOR_DELAY_FASTEST -> 0
     *         SensorManager.SENSOR_DELAY_GAME -> 20000
     *         SensorManager.SENSOR_DELAY_UI -> 66667
     *         SensorManager.SENSOR_DELAY_NORMAL -> 200000
     *         else -> rate
     *     }
     * }
     * </pre>
     */
    private val samplingPeriodUs
        get() =
            when (sensorType) {
                Sensor.TYPE_ACCELEROMETER -> SensorManager.SENSOR_DELAY_GAME
                Sensor.TYPE_STEP_COUNTER -> SensorManager.SENSOR_DELAY_NORMAL
                else -> SensorManager.SENSOR_DELAY_UI
            }

    /**
     * @return if the [sensor][detectedSensor] is
     * [accelerometer][Sensor.TYPE_ACCELEROMETER],
     * "Accelerometer"
     * if it's [stepCounter][Sensor.TYPE_STEP_COUNTER],
     * "Step Counter".
     */
    abstract val sensorTypeString: String

    /**
     * the detected sensor
     * @see SensorManager.getDefaultSensor
     * @see SensorManager.getSensorList
     * @see Sensor.TYPE_ACCELEROMETER
     * @see Sensor.TYPE_STEP_COUNTER
     */
    abstract val detectedSensor: Sensor?

    /**
     * the current steps data of the user
     * @see currentSteps
     * @see distance
     * @see endDate
     * @see sensorTypeString
     * @see calories
     * @see WritableMap
     * @see Arguments.createMap
     */
    val stepsParamsMap: WritableMap
        get() =
            Arguments.createMap().apply {
                putNumber("steps", currentSteps)
                putNumber("distance", distance)
                putNumber("startDate", startDate)
                putNumber("endDate", endDate)
                putString("counterType", sensorTypeString)
                putNumber("calories", calories)
            }

    val stepsSensorInfo: WritableMap
        get() =
            Arguments.createMap().apply {
                putNumber("minDelay", detectedSensor!!.minDelay)
                putNumber("maxDelay", detectedSensor!!.maxDelay)
                putString("name", detectedSensor!!.name)
                putString("vendor", detectedSensor!!.vendor)
                putNumber("power", detectedSensor!!.power)
                putNumber("resolution", detectedSensor!!.resolution)
                putBoolean("wakeUpSensor", detectedSensor!!.isWakeUpSensor)
                putBoolean("additionalInfoSupported", detectedSensor!!.isAdditionalInfoSupported)
            }

    /**
     * Number of in-database-saved calories.
     * 0.045 is the average calories burned per step.
     * to get more accurate result, you can use this formula:
     * 0.045 * weight * distance,
     * but then you need to get the weight of the user. so it needs some permission.
     */
    private val calories: Double
        get() = currentSteps * 0.045

    /**
     * Distance of in-database-saved steps
     */
    private val distance: Double
        get() = currentSteps * 0.762

    /**
     * Number of steps counted since service start
     */
    abstract var currentSteps: Double

    /**
     * Start date of the step counting. UTC milliseconds
     */
    private val startDate: Long = System.currentTimeMillis()

    /**
     * End date of the step counting. UTC milliseconds
     */
    private val endDate: Long
        get() = System.currentTimeMillis()

    private val sensorDelay: Int
        get() =
            when (samplingPeriodUs) {
                SensorManager.SENSOR_DELAY_FASTEST -> 0
                SensorManager.SENSOR_DELAY_GAME -> 20000
                SensorManager.SENSOR_DELAY_UI -> 66667
                SensorManager.SENSOR_DELAY_NORMAL -> 200000
                else -> samplingPeriodUs
            }

    /**
     * this class is not implemented Service class now, but made it work so
     * @see android.content.Context.startService
     * @see android.content.Context.stopService
     * @see SensorManager.registerListener
     */
    fun startService() {
        counterModule.sendDeviceEvent("stepsSensorInfo", stepsSensorInfo)
        Log.d(TAG_NAME, "SensorManager.stepsSensorInfo: $stepsSensorInfo")
        sensorManager.registerListener(this, detectedSensor, samplingPeriodUs)
    }

    /**
     * this class is not implemented Service class now, but made it work so
     * @see android.content.Context.startService
     * @see android.content.Context.stopService
     * @see SensorManager.unregisterListener
     */
    fun stopService() {
        Log.d(TAG_NAME, "SensorListenService.stopService")
        sensorManager.unregisterListener(this)
    }

    /**
     * Called when there is a new sensor event.  Note that "on changed"
     * is somewhat of a misnomer, as this will also be called if we have a
     * new reading from a sensor with the exact same sensor values (but a
     * newer timestamp).
     * See [SensorManager][android.hardware.SensorManager]
     * for details on possible sensor types.
     * See also [SensorEvent][android.hardware.SensorEvent].
     *
     * **NOTE1:** The application doesn't own the [event][android.hardware.SensorEvent]
     * object passed as a parameter and therefore cannot hold on to it.
     * The object may be part of an internal pool and may be reused by
     * the framework. If you need to hold on to the event, you must make a copy.
     *
     * **NOTE2:** Since the timestamp delivered from JavaScript is based on milliseconds,
     * mistakes can occur if the timestamp of sensor events recorded every moment in nanoseconds is delivered as it is.
     * Thus, we convert timestamp (nanoseconds recorded in sensor events) using [toMillis][java.util.concurrent.TimeUnit.NANOSECONDS.toMillis] method,
     * or call [currentTimeInMillis][System.currentTimeMillis] method according to the function execution time.
     *
     * @param event the [SensorEvent][android.hardware.SensorEvent].
     * @see <a href="https://developer.android.com/reference/android/hardware/SensorEvent">Hardware Activity Sensors</a>
     * @see <a href="https://developer.android.com/reference/android/hardware/SensorEvent#sensor.type_accelerometer:">Accelerometer Sensor Event</a>
     * @see <a href="https://developer.android.com/reference/android/hardware/Sensor#TYPE_STEP_COUNTER">Step Counter Sensor Event</a>
     * @see <a href="https://developer.android.com/reference/android/hardware/Sensor#REPORTING_MODE_ON_CHANGE">Reporting Mode On Change</a>
     */
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

    /**
     * abstract method to update the current steps
     * implemented in [StepCounterService] and [AccelerometerService]
     * with different motion sensor handling algorithm.
     * @param eventData the detected vector of sensor event
     * @return if the current steps is updated, return true, otherwise return false
     */
    abstract fun updateCurrentSteps(eventData: FloatArray): Boolean

    /**
     * Called when the accuracy of the registered sensor has changed.
     *
     * Unlike onSensorChanged(), this is only called when this accuracy value changes.
     * See the SENSOR_STATUS_* constants in
     * [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param sensor The [Sensor][android.hardware.Sensor] that has accuracy changed.
     * @param accuracy The new accuracy of this sensor, one of
     * `SensorManager.SENSOR_STATUS_*`
     */
    override fun onAccuracyChanged(
        sensor: Sensor?,
        accuracy: Int
    ) {
        Log.d(TAG_NAME, "onAccuracyChanged.accuracy $accuracy")
        Log.d(TAG_NAME, "onAccuracyChanged.sensor: $sensor")
    }

    /**
     * Called either when the host activity receives a resume event or
     * if the native module that implements this is initialized while the host activity is already
     * resumed. Always called for the most current activity.
     * @see Activity.onResume
     */
    override fun onHostResume() {
    }

    /**
     * Called when host activity receives pause event.
     * Always called for the most current activity.
     * @see Activity.onPause
     */
    override fun onHostPause() {
    }

    /**
     * Called when host activity receives destroy event.
     * Only called for the last React activity to be destroyed.
     * @see Activity.onDestroy
     */
    override fun onHostDestroy() {
        this.stopService()
    }

    companion object {
        val TAG_NAME: String = SensorListenService::class.java.name
    }
}

private fun WritableMap.putNumber(
    key: String,
    number: Number
) {
    when (number) {
        is Double -> putDouble(key, number)
        is Int -> putInt(key, number)
        else -> putDouble(key, number.toDouble())
    }
}