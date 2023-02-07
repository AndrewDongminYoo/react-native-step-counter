package com.stepcounter.step.services

import com.stepcounter.step.utils.SensorFilter
import com.stepcounter.step.utils.StepListener
import kotlin.math.min

class StepDetector {
    // change this threshold according to your sensitivity preferences
    private val stepTHRESHOLD = 10f
    private val stepDELAYNS = 80000000
    private var velRingCounter = 0
    private var accelRingCounter = 0
    private var oldVelocityEstimate = 0f
    private var lastStepTimeNs = 0.toLong()
    private val accelRingX = FloatArray(ACCEL_RING_SIZE)
    private val accelRingY = FloatArray(ACCEL_RING_SIZE)
    private val accelRingZ = FloatArray(ACCEL_RING_SIZE)
    private val velRing = FloatArray(VEL_RING_SIZE)
    private var listener: StepListener? = null
    fun registerListener(listener: StepListener?) {
        this.listener = listener
    }

    fun updateAccel(timeNs: Long, x: Float, y: Float, z: Float) {
        val currentAccel = FloatArray(3)
        currentAccel[0] = x
        currentAccel[1] = y
        currentAccel[2] = z

        // First step is to update our guess of where the global z vector is.
        accelRingCounter++
        accelRingX[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[0]
        accelRingY[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[1]
        accelRingZ[accelRingCounter % ACCEL_RING_SIZE] = currentAccel[2]
        val worldZ = FloatArray(3)
        worldZ[0] = SensorFilter.sum(accelRingX) / min(accelRingCounter, ACCEL_RING_SIZE)
        worldZ[1] = SensorFilter.sum(accelRingY) / min(accelRingCounter, ACCEL_RING_SIZE)
        worldZ[2] = SensorFilter.sum(accelRingZ) / min(accelRingCounter, ACCEL_RING_SIZE)
        val normalizationFactor = SensorFilter.norm(worldZ)
        worldZ[0] = worldZ[0] / normalizationFactor
        worldZ[1] = worldZ[1] / normalizationFactor
        worldZ[2] = worldZ[2] / normalizationFactor
        val currentZ = SensorFilter.dot(worldZ, currentAccel) - normalizationFactor
        velRingCounter++
        velRing[velRingCounter % VEL_RING_SIZE] = currentZ
        val velocityEstimate = SensorFilter.sum(velRing)
        if (velocityEstimate > stepTHRESHOLD && oldVelocityEstimate <= stepTHRESHOLD && timeNs - lastStepTimeNs > stepDELAYNS) {
            listener?.step()
            lastStepTimeNs = timeNs
        }
        oldVelocityEstimate = velocityEstimate
    }

    companion object {
        private const val ACCEL_RING_SIZE = 50
        private const val VEL_RING_SIZE = 10
    }
}