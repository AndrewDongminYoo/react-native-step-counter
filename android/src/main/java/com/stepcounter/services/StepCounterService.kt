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
 * @property sensorTypeString The type of the sensor as a string
 * @property sensorDelay The delay of the sensor
 * @property sensorType The type of the sensor
 * @property detectedSensor The sensor that is detected
 * @property lastUpdate The last update of the sensor
 * @property i The counter
 * @property delay The delay of the sensor
 * @property initSteps The initial steps
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
 * @see SensorManager.getDefaultSensor {@link SensorManager.getDefaultSensor}
 * @see SensorListenService.updateCurrentSteps
 * @see TimeUnit.NANOSECONDS.toMillis
 */
class StepCounterService(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
): SensorListenService(counterModule, sensorManager) {
    override val sensorTypeString = "STEP_COUNTER"
    override val sensorDelay = SensorManager.SENSOR_DELAY_NORMAL
    override val sensorType = Sensor.TYPE_STEP_COUNTER
    override val detectedSensor: Sensor = sensorManager.getDefaultSensor(sensorType)
    private var lastUpdate: Long = 0
    private var i = 0
    private var delay: Int = 0
    private var initSteps: Double = 0.0
    override var currentSteps: Double = 0.0
    override var endDate: Long = 0

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