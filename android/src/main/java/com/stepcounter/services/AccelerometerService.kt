package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.SystemClock
import android.util.Log
import com.stepcounter.StepCounterModule
import com.stepcounter.utils.SensorFusionMath.dot
import com.stepcounter.utils.SensorFusionMath.norm
import com.stepcounter.utils.SensorFusionMath.normalize
import com.stepcounter.utils.SensorFusionMath.sum
import java.util.concurrent.TimeUnit
import kotlin.math.min

/**
 * This class is responsible for listening to the accelerometer sensor.
 * It is used to count the steps of the user.
 * @constructor Creates a new AccelerometerService
 * @param counterModule The module that is responsible for the communication with the react-native layer
 * @param sensorManager The sensor manager that is responsible for the sensor
 *
 * @property sensorTypeString The type of the sensor as a string "ACCELEROMETER"
 * @property sensorDelay The delay of the sensor
 * @property sensorType The type of the sensor
 * @property detectedSensor The sensor that is detected
 * @property currentSteps The current steps
 * @property endDate The end date
 * @property velocityRingCounter The velocity ring counter
 * @property accelRingCounter The acceleration ring counter
 * @property oldVelocityEstimate The old velocity estimate
 * @property lastStepTimeNs The last step time in nanoseconds
 * @property accelRingX The acceleration ring for the x-axis
 * @property accelRingY The acceleration ring for the y-axis
 * @property accelRingZ The acceleration ring for the z-axis
 * @property velocityRing The velocity ring
 *
 * @see SensorListenService
 * @see Sensor
 * @see SensorManager
 * @see StepCounterModule
 * @see TimeUnit
 * @see SensorManager.SENSOR_DELAY_NORMAL
 * @see Sensor.TYPE_ACCELEROMETER
 */
class AccelerometerService(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
    userGoal: Int?,
) : SensorListenService(counterModule, sensorManager, userGoal) {
    override val sensorTypeString = "ACCELEROMETER"
    override val sensorDelay = SensorManager.SENSOR_DELAY_NORMAL
    override val sensorType = Sensor.TYPE_ACCELEROMETER
    override val detectedSensor: Sensor = sensorManager.getDefaultSensor(sensorType)
    override var currentSteps: Double = 0.0
    override var endDate: Long = 0
    private var velocityRingCounter = 0
    private var accelRingCounter = 0
    private var oldVelocityEstimate = 0f
    private var lastStepTimeNs: Long = 0L
    private val accelRingX = FloatArray(ACCEL_RING_SIZE)
    private val accelRingY = FloatArray(ACCEL_RING_SIZE)
    private val accelRingZ = FloatArray(ACCEL_RING_SIZE)
    private val velocityRing = FloatArray(VELOCITY_RING_SIZE)

    /**
     * This function is responsible for updating the current steps.
     * @param [eventData][FloatArray(3) values][android.hardware.SensorEvent.values] The event data
     * @return The current steps
     * @see android.hardware.SensorEvent
     * @see android.hardware.SensorEvent.values
     * @see android.hardware.SensorEvent.timestamp
     */
    override fun updateCurrentSteps(eventData: FloatArray): Double {
        val timeNs = SystemClock.elapsedRealtimeNanos()
        Log.d(TAG_NAME, "accelerometer values: $eventData")
        Log.d(TAG_NAME, "accelerometer timestamp: $timeNs")

        // First step is to update our guess of where the global z vector is.
        accelRingCounter++
        accelRingX[accelRingCounter % ACCEL_RING_SIZE] = eventData[0]
        accelRingY[accelRingCounter % ACCEL_RING_SIZE] = eventData[1]
        accelRingZ[accelRingCounter % ACCEL_RING_SIZE] = eventData[2]
        val gravity = FloatArray(3)
        gravity[0] = sum(accelRingX) / min(accelRingCounter, ACCEL_RING_SIZE)
        gravity[1] = sum(accelRingY) / min(accelRingCounter, ACCEL_RING_SIZE)
        gravity[2] = sum(accelRingZ) / min(accelRingCounter, ACCEL_RING_SIZE)
        val normalizationFactor = norm(gravity)
        val normGravity = normalize(gravity)
        // Next step is to figure out the component of the current acceleration
        // in the direction of world_z and subtract gravity's contribution
        val currentZ = dot(normGravity, eventData) - normalizationFactor
        velocityRingCounter++
        velocityRing[velocityRingCounter % VELOCITY_RING_SIZE] = currentZ
        val velocityEstimate = sum(velocityRing)
        if (velocityEstimate > STEP_THRESHOLD
            && oldVelocityEstimate <= STEP_THRESHOLD
            && timeNs - lastStepTimeNs > STEP_DELAY_NS
        ) {
            lastStepTimeNs = timeNs
            endDate = TimeUnit.NANOSECONDS.toMillis(timeNs)
            oldVelocityEstimate = velocityEstimate
            currentSteps++
        }
        return currentSteps
    }

    companion object {
        private const val ACCEL_RING_SIZE = 50
        private const val VELOCITY_RING_SIZE = 10
        /**
         * The minimum acceleration that is considered a step
         */
        private const val STEP_THRESHOLD = 4f // 8f
        /**
         * The minimum time between steps
         */
        private const val STEP_DELAY_NS = 250000000 // 800000000
        val TAG_NAME: String = AccelerometerService::class.java.name
    }
}