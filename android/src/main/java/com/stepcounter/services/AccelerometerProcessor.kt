package com.stepcounter.services

import kotlin.math.sqrt

/** Session-local fallback arithmetic; callers serialize updates and reset. */
internal class AccelerometerProcessor {
  private val x = FloatArray(50)
  private val y = FloatArray(50)
  private val z = FloatArray(50)
  private val velocity = FloatArray(10)
  private var accelerationIndex = 0
  private var velocityIndex = 0
  private var samples = 0

  // Float samples are accumulated in double precision to avoid long-session float drift.
  private var sumX = 0.0
  private var sumY = 0.0
  private var sumZ = 0.0
  private var sumVelocity = 0.0
  private var previousVelocity = 0f
  private var hasStep = false
  private var lastStepNs = 0L

  var velocityEstimate = 0f
    private set

  fun reset() {
    x.fill(0f)
    y.fill(0f)
    z.fill(0f)
    velocity.fill(0f)
    accelerationIndex = 0
    velocityIndex = 0
    samples = 0
    sumX = 0.0
    sumY = 0.0
    sumZ = 0.0
    sumVelocity = 0.0
    previousVelocity = 0f
    velocityEstimate = 0f
    hasStep = false
    lastStepNs = 0L
  }

  fun update(
    values: FloatArray,
    timestampNs: Long,
  ): Boolean {
    accelerationIndex = (accelerationIndex + 1) % x.size
    if (samples < x.size) samples++
    sumX += values[0].toDouble() - x[accelerationIndex].toDouble()
    sumY += values[1].toDouble() - y[accelerationIndex].toDouble()
    sumZ += values[2].toDouble() - z[accelerationIndex].toDouble()
    x[accelerationIndex] = values[0]
    y[accelerationIndex] = values[1]
    z[accelerationIndex] = values[2]
    val gx = (sumX / samples).toFloat()
    val gy = (sumY / samples).toFloat()
    val gz = (sumZ / samples).toFloat()
    val magnitude = sqrt(gx * gx + gy * gy + gz * gz)
    val currentZ =
      if (magnitude == 0f) {
        0f
      } else {
        (gx / magnitude) * values[0] + (gy / magnitude) * values[1] + (gz / magnitude) * values[2] - magnitude
      }
    velocityIndex = (velocityIndex + 1) % velocity.size
    sumVelocity += currentZ.toDouble() - velocity[velocityIndex].toDouble()
    velocity[velocityIndex] = currentZ
    velocityEstimate = sumVelocity.toFloat()
    val accepted = previousVelocity <= 12f && velocityEstimate > 12f && (!hasStep || timestampNs - lastStepNs > 250_000_000L)
    if (accepted) {
      hasStep = true
      lastStepNs = timestampNs
    }
    previousVelocity = velocityEstimate
    return accepted
  }
}
