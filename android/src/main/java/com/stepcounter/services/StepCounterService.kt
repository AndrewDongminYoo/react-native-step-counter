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
 * @property previousSteps The first cumulative sensor reading in this session,
 *   or null until a baseline has been initialized. Zero is a valid baseline.
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
 * @see TimeUnit.toMillis
 */
class StepCounterService internal constructor(
  counterModule: StepCounterModule,
  sensorManager: SensorManager,
  clock: SensorClock,
) : SensorListenService(counterModule, sensorManager, clock) {
  constructor(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
  ) : this(counterModule, sensorManager, AndroidSensorClock)

  override val sensorTypeString = "STEP_COUNTER"
  override val sensorType = Sensor.TYPE_STEP_COUNTER
  override val detectedSensor: Sensor? = sensorManager.getDefaultSensor(sensorType)
  private var previousSteps: Double? = null
  override var currentSteps: Double = 0.0

  override fun resetSessionState() {
    previousSteps = null
    currentSteps = 0.0
  }

  /**
   * This function is responsible for updating the current steps.
   * @param [eventData][FloatArray(1) values][android.hardware.SensorEvent.values] The step counter event data
   * @return Whether the session step count increased
   * @see android.hardware.SensorEvent
   * @see android.hardware.SensorEvent.values
   * @see android.hardware.SensorEvent.timestamp
   */
  override fun updateCurrentSteps(
    eventData: FloatArray,
    timestampNs: Long,
  ): Boolean {
    val reading = eventData[0].toDouble()
    val baseline = previousSteps
    if (baseline == null) {
      previousSteps = reading
      return false
    }

    val steps = reading - baseline
    if (steps <= currentSteps) {
      return false
    }

    currentSteps = steps
    return true
  }
}
