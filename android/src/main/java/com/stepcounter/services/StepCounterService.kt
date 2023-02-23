package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager
import com.stepcounter.StepCounterModule
import java.util.concurrent.TimeUnit

/**
 * This class is responsible for listening to the step counter sensor.
 * It is used to count the steps of the user.
 * @param counterModule The module that is responsible for the communication with the react-native layer
 * @param sensorManager The sensor manager that is responsible for the sensor
 * @property sensorType The type of the sensor always Sensor.TYPE_STEP_COUNTER
 * @property sensorTypeString The type of the sensor as a string. so always "STEP_COUNTER"
 * @property sensorDelay The integer enum value of delay of the sensor.
 *   choose between SensorManager.SENSOR_DELAY_NORMAL or SensorManager.SENSOR_DELAY_UI
 * @property detectedSensor The sensor that is detected
 * @property lastUpdate The last update of the sensor.
 *   if module started first time, it will be null.
 * @property delay The delay of the sensor.
 * @property previousSteps The initial steps or the previous steps.
 *   step counter sensor is recording since the last reboot.
 *   so if previous step is null, we need to initialize the previous steps with the current steps minus 1.
 * @property currentSteps The current steps
 * @property endDate The end date
 * @constructor Creates a new StepCounterService
 * @see SensorListenService
 * @see Sensor
 * @see SensorManager
 * @see StepCounterModule
 * @see TimeUnit
 * @see SensorManager.SENSOR_DELAY_NORMAL
 * @see Sensor.TYPE_STEP_COUNTER
 * @see SensorManager.getDefaultSensor {@link SensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)}
 * @see SensorListenService.updateCurrentSteps
 * @see TimeUnit.NANOSECONDS.toMillis
 */
class StepCounterService(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
    userGoal: Int?,
) : SensorListenService(counterModule, sensorManager, userGoal) {
    override val sensorTypeString = "STEP_COUNTER"
    override val sensorDelay = SensorManager.SENSOR_DELAY_NORMAL
    override val sensorType = Sensor.TYPE_STEP_COUNTER
    override val detectedSensor: Sensor = sensorManager.getDefaultSensor(sensorType)

    private var delay: Int? = null
    private var previousSteps: Double? = null
    private var lastUpdate: Long? = null
    override var endDate: Long = 0L
    override var currentSteps: Double = 0.0

    /**
     * This function is responsible for updating the current steps.
     * @param [timeNs][Long timestamp][android.hardware.SensorEvent.timestamp] The time in nanoseconds (will be converted to milliseconds)
     * @param [eventData][FloatArray(1) values][android.hardware.SensorEvent.values] The step counter event data
     * @return The current steps
     * @see android.hardware.SensorEvent
     * @see android.hardware.SensorEvent.values
     * @see android.hardware.SensorEvent.timestamp
     */
    override fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double {
        endDate = TimeUnit.NANOSECONDS.toMillis(timeNs)
        // if the last update is 0, set it to the current time
        if (lastUpdate == null) {
            lastUpdate = endDate.minus(1)
        }
        // if the delay is 0, set it to the time difference between the current time and the last update
        val timeDiff = endDate.minus(lastUpdate!!)
        // if the time difference is greater than 0 and the delay is 0, set the delay to the time difference
        if (timeDiff > 0 && delay == null) {
            delay = (timeDiff / 1000).toInt()
        }
        // step counter sensor event data is a float array with a length of 1
        val stepCount: Double = eventData[0].toDouble()
        // if the time difference is greater than the delay, set the current steps to the step count minus the initial steps
        if (timeDiff > delay!!) {
            // if the initial steps are 0, set it to the step count minus 1
            if (previousSteps == null) {
                previousSteps = stepCount.minus(1.0)
            }
            // set the current steps to the step count minus the initial steps
            currentSteps = stepCount.minus(previousSteps!!)
            lastUpdate = endDate
        }
        return currentSteps
    }
}