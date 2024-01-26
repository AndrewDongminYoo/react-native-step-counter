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
 * @property sensorTypeString The type of the sensor as a string. so always "Step Counter"
 * @property sensorDelay The integer enum value of delay of the sensor.
 *   choose between SensorManager.SENSOR_DELAY_NORMAL or SensorManager.SENSOR_DELAY_UI
 * @property detectedSensor The sensor that is detected
 * @property previousSteps The initial steps or the previous steps.
 *   step counter sensor is recording since the last reboot.
 *   so if previous step is null, we need to initialize the previous steps with the current steps minus 1.
 * @property currentSteps The current steps
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
    sensorManager: SensorManager
) : SensorListenService(counterModule, sensorManager) {
    override val sensorTypeString = "Step Counter"
    override val sensorType = Sensor.TYPE_STEP_COUNTER
    override val detectedSensor: Sensor? = sensorManager?.getDefaultSensor(sensorType)
    private var previousSteps: Double = 0.0
        set(value) {
            if (field < value) {
                field = value
            }
        }
    override var currentSteps: Double = 0.0
        set(value) {
            if (field < value) {
                field = value
            }
        }

    /**
     * This function is responsible for updating the current steps.
     * @param [eventData][FloatArray(1) values][android.hardware.SensorEvent.values] The step counter event data
     * @return The current steps
     * @see android.hardware.SensorEvent
     * @see android.hardware.SensorEvent.values
     * @see android.hardware.SensorEvent.timestamp
     */
    override fun updateCurrentSteps(eventData: FloatArray): Boolean {
        // if the time difference is greater than the delay, set the current steps to the step count minus the initial steps
        // if the previous steps aren't initialized yet,
        return if (previousSteps.equals(0.0)) {
            previousSteps = eventData[0].toDouble()
            false
        } else {
            currentSteps = eventData[0].toDouble().minus(previousSteps)
            // set the last update to the current time
            true
        }
    }
}
