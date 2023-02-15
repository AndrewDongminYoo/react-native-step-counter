package com.stepcounter.services

import android.util.Log
import com.stepcounter.models.Nanoseconds
import com.stepcounter.models.StepperInterface
import com.stepcounter.utils.SensorFusionMath.dot
import com.stepcounter.utils.SensorFusionMath.norm
import com.stepcounter.utils.SensorFusionMath.sum
import kotlin.math.min

class StepDetector {
    // change this threshold according to your sensitivity preferences
    private var velRingCounter = 0
    private var accelRingCounter = 0
    private var oldVelocityEstimate = 0f
    private var lastStepTimeNs: Nanoseconds = 0L
    private val accelRingX = FloatArray(ACCEL_RING_SIZE)
    private val accelRingY = FloatArray(ACCEL_RING_SIZE)
    private val accelRingZ = FloatArray(ACCEL_RING_SIZE)
    private val velRing = FloatArray(VEL_RING_SIZE)
    private var listener: StepperInterface? = null

    fun registerListener(listener: StepperInterface?) {
        this.listener = listener
    }

    fun updateAccel(timeNs: Nanoseconds, x: Float, y: Float, z: Float) {
        val currentAccel = floatArrayOf(x, y, z)
        if (Log.isLoggable("StepDetector", Log.DEBUG)) {
            Log.d("StepDetector", "accelerometer values: $currentAccel")
            Log.d("StepDetector", "accelerometer timestamp: $timeNs")
        }
        // First step is to update our guess of where the global z vector is.
        accelRingCounter++
        accelRingX[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[0]
        accelRingY[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[1]
        accelRingZ[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[2]
        val worldZ = FloatArray(3)
        worldZ[0] = sum(accelRingX) / min(accelRingCounter, ACCEL_RING_SIZE)
        worldZ[1] = sum(accelRingY) / min(accelRingCounter, ACCEL_RING_SIZE)
        worldZ[2] = sum(accelRingZ) / min(accelRingCounter, ACCEL_RING_SIZE)
        val normalizationFactor = norm(worldZ)
        for (i in worldZ.indices) {
            worldZ[i] = worldZ[i] / normalizationFactor
        }
        // Next step is to figure out the component of the current acceleration
        // in the direction of world_z and subtract gravity's contribution
        val currentZ = dot(worldZ, currentAccel) - normalizationFactor
        velRingCounter++
        velRing[velRingCounter % VEL_RING_SIZE] = currentZ
        val velocityEstimate = sum(velRing)
        if (velocityEstimate > STEP_THRESHOLD &&
            oldVelocityEstimate <= STEP_THRESHOLD &&
            timeNs - lastStepTimeNs > STEP_DELAY_NS
        ) {
            (listener ?: return).step(timeNs)
            lastStepTimeNs = timeNs
        }
        oldVelocityEstimate = velocityEstimate
    }

    companion object {
        private const val ACCEL_RING_SIZE = 50
        private const val VEL_RING_SIZE = 10
        private const val STEP_THRESHOLD = 4f
        private const val STEP_DELAY_NS = 250000000
    }
}