package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager
import android.util.Log
import com.stepcounter.StepCounterModule
import com.stepcounter.utils.SensorFusionMath.dot
import com.stepcounter.utils.SensorFusionMath.norm
import com.stepcounter.utils.SensorFusionMath.normalize
import com.stepcounter.utils.SensorFusionMath.sum
import java.util.concurrent.TimeUnit
import kotlin.math.min

class AccelerometerService(
    counterModule: StepCounterModule,
    sensorManager: SensorManager,
): SensorListenService(counterModule, sensorManager) {
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

    override fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double {
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