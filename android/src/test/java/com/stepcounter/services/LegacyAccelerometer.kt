package com.stepcounter.services

import com.stepcounter.utils.SensorFusionMath.dot
import com.stepcounter.utils.SensorFusionMath.norm
import com.stepcounter.utils.SensorFusionMath.normalize
import com.stepcounter.utils.SensorFusionMath.sum
import kotlin.math.min

// Frozen pre-optimization arithmetic, independent of the running-sum implementation.
internal class LegacyAccelerometer {
  var currentSteps = 0.0
  var velocityEstimate = 0f
  private var velocityRingCounter: Int = 0
  private var accelRingCounter: Int = 0
  private var oldVelocityEstimate: Float = 0f
  private var lastStepTimeNs: Long? = null

  // We want to keep a history of values to do a rolling average of the current
  private val accelRingX = FloatArray(ACCEL_RING_SIZE)
  private val accelRingY = FloatArray(ACCEL_RING_SIZE)
  private val accelRingZ = FloatArray(ACCEL_RING_SIZE)

  // We want to keep a history of values to do a rolling average of the current
  private val velocityRing = FloatArray(VELOCITY_RING_SIZE)

  fun resetSessionState() {
    currentSteps = 0.0
    velocityRingCounter = 0
    accelRingCounter = 0
    oldVelocityEstimate = 0f
    lastStepTimeNs = null
    accelRingX.fill(0f)
    accelRingY.fill(0f)
    accelRingZ.fill(0f)
    velocityRing.fill(0f)
  }

  /**
   * This function is responsible for updating the current steps.
   * All [values][android.hardware.SensorEvent.values] are in SI units (m/s^2)
   *
   * - values[0]: Acceleration minus Gx on the x-axis
   * - values[1]: Acceleration minus Gy on the y-axis
   * - values[2]: Acceleration minus Gz on the z-axis
   *
   * @param eventData array of vector.
   * @return If the current step is just updated
   * @see android.hardware.SensorEvent
   * @see android.hardware.SensorEvent.values
   * @see android.hardware.SensorEvent.timestamp
   */
  fun updateCurrentSteps(
    eventData: FloatArray,
    timestampNs: Long,
  ): Boolean {
    // First step is to update our guess of where the global z vector is.
    accelRingCounter++
    // We keep a rolling average of the last 50 values
    accelRingX[accelRingCounter % ACCEL_RING_SIZE] = eventData[0]
    accelRingY[accelRingCounter % ACCEL_RING_SIZE] = eventData[1]
    accelRingZ[accelRingCounter % ACCEL_RING_SIZE] = eventData[2]
    // Next we'll calculate the average of the last 50 vectors in the ring
    val gravity: FloatArray =
      floatArrayOf(
        sum(accelRingX) / min(accelRingCounter, ACCEL_RING_SIZE),
        sum(accelRingY) / min(accelRingCounter, ACCEL_RING_SIZE),
        sum(accelRingZ) / min(accelRingCounter, ACCEL_RING_SIZE),
      )
    // Next step is to figure out the component of the current acceleration
    // in the direction of world_z and subtract gravity's contribution
    val currentZ: Float = dot(normalize(gravity), eventData) - norm(gravity)
    // Now we just need to update our estimate of the velocity
    velocityRingCounter++
    // We keep a rolling average of the last 10 values
    velocityRing[velocityRingCounter % VELOCITY_RING_SIZE] = currentZ
    // Calculate the average of the last 10 values
    velocityEstimate = sum(velocityRing)
    // If the velocity estimate is greater than the threshold and the previous
    val isWalkingOrRunning: Boolean =
      STEP_THRESHOLD in oldVelocityEstimate..<velocityEstimate &&
        (lastStepTimeNs?.let { timestampNs - it > STEP_DELAY_NS } ?: true)
    if (isWalkingOrRunning) {
      currentSteps = currentSteps.plus(1)
      lastStepTimeNs = timestampNs
    }
    oldVelocityEstimate = velocityEstimate
    return isWalkingOrRunning
  }

  companion object {
    private const val STEP_DELAY_NS = 250000000
    private const val ACCEL_RING_SIZE = 50
    private const val VELOCITY_RING_SIZE = 10
    private const val STEP_THRESHOLD = 12f
  }
}
