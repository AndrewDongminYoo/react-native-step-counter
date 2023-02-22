package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.stepcounter.StepCounterModule

/**
 * the base class for sensor listen service
 * @param counterModule the step counter module
 * @param sensorManager the sensor manager
 * @see StepCounterModule
 * @see Sensor
 * @see SensorEvent
 * @see SensorEventListener
 * @see SensorManager
 */
abstract class SensorListenService(
    private val counterModule: StepCounterModule,
    private val sensorManager: SensorManager,
) : SensorEventListener {
    /**
     * the accelerometer sensor type
     * [TYPE_ACCELEROMETER][Sensor.TYPE_ACCELEROMETER]: 1<br/>
     *
     * the step counter sensor type
     * [TYPE_STEP_COUNTER][Sensor.TYPE_STEP_COUNTER]: 19<br/>
     */
    abstract val sensorType: Int
    /**
     * the fastest rate
     * [SENSOR_DELAY_FASTEST][SensorManager.SENSOR_DELAY_FASTEST]: 0
     *
     * rate suitable for games
     * [SENSOR_DELAY_GAME][SensorManager.SENSOR_DELAY_GAME]: 1
     *
     * rate suitable for the user interface
     * [SENSOR_DELAY_UI][SensorManager.SENSOR_DELAY_UI]: 2
     *
     * default rate that suitable for screen orientation changes
     * [SENSOR_DELAY_NORMAL][SensorManager.SENSOR_DELAY_NORMAL]: 3
     */
    abstract val sensorDelay: Int
    abstract val sensorTypeString: String
    abstract val detectedSensor: Sensor
    private val stepsParamsMap: WritableMap
        get() {
            val map = Arguments.createMap()
            map.putDouble("steps", currentSteps)
            map.putDouble("distance", distance)
            map.putInt("startDate", startDate.toInt())
            map.putInt("endDate", endDate.toInt())
            map.putString("counterType", sensorTypeString)
            map.putDouble("calories", calories)
            map.putInt("dailyGoal", dailyGoal)
            return map
        }
    /**
     * Number of steps the user wants to walk every day
     */
    private var dailyGoal: Int = 10_000
        get() {
            return if (currentSteps.toInt() > field) {
                currentSteps = 0.0
                Log.d(TAG_NAME, "daily goal reached")
                10_000
            } else 10_000
        }
    /**
     * Number of in-database-saved calories;
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
     * Start date of the step counting
     */
    private val startDate: Long = System.currentTimeMillis()
    /**
     * End date of the step counting
     */
    abstract var endDate: Long

    fun startService() {
        Log.d(TAG_NAME, "SensorListenService.startService")
        Log.d(TAG_NAME, "SensorListenService.sensorDelay: $sensorDelay")
        Log.d(TAG_NAME, "SensorListenService.sensorTypes: $sensorTypeString")
        Log.d(TAG_NAME, "SensorListenService.currentStep: $currentSteps")
        sensorManager.registerListener(this, detectedSensor, sensorDelay)
    }

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
     * **NOTE:** The application doesn't own the
     * [event][android.hardware.SensorEvent]
     * object passed as a parameter and therefore cannot hold on to it.
     * The object may be part of an internal pool and may be reused by
     * the framework.
     *
     * @param event the [SensorEvent][android.hardware.SensorEvent].
     */
    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor == null
            || event.sensor?.type != detectedSensor.type
            || event.sensor.type != sensorType) return
        updateCurrentSteps(event.timestamp, event.values)
        counterModule.onStepDetected(stepsParamsMap)
    }

    abstract fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double

    /**
     * Called when the accuracy of the registered sensor has changed.
     *
     * Unlike onSensorChanged(), this is only called when this accuracy value changes.
     * See the SENSOR_STATUS_* constants in
     * [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param accuracy The new accuracy of this sensor, one of
     * `SensorManager.SENSOR_STATUS_*`
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d(TAG_NAME, "onAccuracyChanged.accuracy $accuracy")
        Log.d(TAG_NAME, "onAccuracyChanged.sensor: $sensor")
    }

    companion object {
        val TAG_NAME: String = SensorListenService::class.java.name
    }
}