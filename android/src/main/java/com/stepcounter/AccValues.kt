package com.stepcounter

import java.util.*
import kotlin.math.cos

object AccValues {
    // initializing point arrays
    private val pointsZ: Deque<Float> = ArrayDeque()
    private var avgPointsZ: Deque<Float> = ArrayDeque()
    var state = 0
    private var sign = 0
    var stepCount = 0
    var stepCheckEnabled = true
    var stepCountEast = 0.0

    // Min, max, and reset amplitudes for the algorithm in m/s^2.
    private const val minAmplitude = 0.5
    private const val maxAmplitude = 2.2
    private const val resetAmplitude = -0.1

    // if state is 0, min amplitude is not reached.
    // if state is 1, min amplitude is reached.
    // if state is 2, max amplitude is exceeded.
    private const val avgAmount = 30 // Average the last n samples from the sensor.
    private var amountAdded = 0
    fun addPoint(z: Float) {
        pointsZ.addLast(z)
        amountAdded++
        var totalZ = 0f
        if (amountAdded > avgAmount) {
            pointsZ.removeFirst()
            var loopindex = 0
            // Log.d("new data smoothing set","-------------------");
            val q: Iterator<Float> = pointsZ.iterator()
            while (q.hasNext()) {
                val `val` = q.next()
                val avgWeight = hammingWeight(loopindex)
                totalZ += (avgWeight * `val`).toFloat()
                loopindex++
            }
            val tempPointZ = totalZ / avgAmount.toFloat()
            avgPointsZ.addLast(tempPointZ)
            // Log.d("sample values", String.format("%f", tempPoint));
            flipState(tempPointZ)
        }
    }

    // see comment above
    private fun flipState(f: Float) {
        if (f < resetAmplitude) state = 0
        if (f > maxAmplitude) state = 2
        if (f > minAmplitude && f < maxAmplitude && state != 2) state = 1
        if (f > 0) sign = 1
        if (sign == 1 && f < 0) sign = -2 else if (f < 0) sign = -1
    }

    // refer to the wikipedia article on window functions
    private fun hammingWeight(n: Int): Double {
        return 0.54 - 0.46 * cos(2.0 * 3.14 * n.toDouble() / (avgAmount - 1).toDouble())
    }

    // Log.d("last, first, state", String.format("%f, %f, %d", last, first, state));
    val slope: Double
        get() {
            var last = (2 shl 19).toFloat()
            var first = (2 shl 19).toFloat()
            if (!avgPointsZ.isEmpty()) {
                last = avgPointsZ.last
                first = avgPointsZ.first
            }
            // Log.d("last, first, state", String.format("%f, %f, %d", last, first, state));
            return if (state == 1) ((last - first) / avgAmount).toDouble() else (2 shl 19).toDouble()
        }
}