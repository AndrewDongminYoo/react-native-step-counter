package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager
import com.stepcounter.StepCounterModule

/**
 * This class is responsible for listening to the accelerometer sensor.
 * It is used to count the steps of the user.
 * @constructor Creates a new AccelerometerService
 * @param counterModule The module that is responsible for the communication with the react-native layer
 * @param sensorManager The sensor manager that is responsible for the sensor
 *
 * @property sensorTypeString The type of the sensor as a string "ACCELEROMETER"
 * @property sensorType The type of the sensor
 * @property detectedSensor The sensor that is detected
 * @property currentSteps The current steps
 *
 * @see SensorListenService
 * @see Sensor
 * @see SensorManager
 * @see StepCounterModule
 * @see SensorManager.SENSOR_DELAY_NORMAL
 * @see Sensor.TYPE_ACCELEROMETER
 */
class AccelerometerService internal constructor(
  counterModule: StepCounterModule,
  sensorManager: SensorManager,
  clock: SensorClock,
) : SensorListenService(counterModule, sensorManager, clock) {
  constructor(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
  ) : this(counterModule, sensorManager, AndroidSensorClock)

  override val sensorTypeString = "ACCELEROMETER"
  override val sensorType = Sensor.TYPE_ACCELEROMETER
  override val detectedSensor: Sensor? = sensorManager.getDefaultSensor(sensorType)
  override var currentSteps: Double = 0.0
  private val processor = AccelerometerProcessor()

  override fun resetSessionState() {
    currentSteps = 0.0
    processor.reset()
  }

  override fun updateCurrentSteps(
    eventData: FloatArray,
    timestampNs: Long,
  ): Boolean {
    val accepted = processor.update(eventData, timestampNs)
    if (accepted) currentSteps += 1.0
    return accepted
  }

  companion object {
    val TAG_NAME: String = AccelerometerService::class.java.name
  }
}
