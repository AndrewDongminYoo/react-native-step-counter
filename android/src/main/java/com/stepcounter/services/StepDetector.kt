package com.stepcounter.services

import android.util.Log
import com.stepcounter.BuildConfig.DEBUG
import com.stepcounter.models.Nanoseconds
import com.stepcounter.models.StepperInterface
import kotlin.math.abs
import kotlin.math.sign

/**
 * A very simple step detector that detects steps based on the change in acceleration
 */
class StepDetector {
    // change this threshold according to your sensitivity preferences
    private var lastAccelerationDiff: Float = 0f
    private var lastAccelerationValue: Float = 0f
    private var lastSign: Float = 0f
    private var lastStepAccelerationDeltasIndex: Int = 0
    private var lastStepDeltasIndex: Int = 0
    private var lastStepTimeNs: Nanoseconds = 0L
    private var listener: StepperInterface? = null
    private var validSteps: Int = 0
    private val gravity = FloatArray(3) // floatArrayOf(0f, 0f, 0f)
    private val linearAcceleration = FloatArray(3)
    private val lastExtrema = FloatArray(3)
    private val lastStepDeltas = longArrayOf(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1)
    private val lastStepAccelerationDeltas = floatArrayOf(-1f, -1f, -1f, -1f, -1f, -1f)

    fun registerListener(listener: StepperInterface?) {
        this.listener = listener
    }

    fun updateAccel(timeNs: Nanoseconds, x: Float, y: Float, z: Float) {
        val currentAccel = floatArrayOf(x, y, z)
        // Isolate the force of gravity with the low-pass filter.
        gravity[0] = alpha * gravity[0] + (1 - alpha) * currentAccel[0]
        gravity[1] = alpha * gravity[1] + (1 - alpha) * currentAccel[1]
        gravity[2] = alpha * gravity[2] + (1 - alpha) * currentAccel[2]

        // Remove the gravity contribution with the high-pass filter.
        linearAcceleration[0] = currentAccel[0] - gravity[0]
        linearAcceleration[1] = currentAccel[1] - gravity[1]
        linearAcceleration[2] = currentAccel[2] - gravity[2]
        val acceleration = linearAcceleration[0] + linearAcceleration[1] + linearAcceleration[2]
        val currentSign = sign(acceleration)
        if (currentSign == lastSign) {
            // the maximum is not reached yet, keep on waiting
            return
        }
        if (!isSignificantValue(acceleration)) {
            // not significant (acceleration delta is too small)
            return
        }
        val accelerationDiff = abs(lastExtrema[(currentSign < 0).compareTo(true)] - acceleration)
        if (!isAlmostAsLargeAsPreviousOne(accelerationDiff)) {
            if (DEBUG) Log.i(LOG_TAG, "Not as large as previous")
            lastAccelerationDiff = accelerationDiff
            return
        }

        if (!wasPreviousLargeEnough(accelerationDiff)) {
            if (DEBUG) Log.i(LOG_TAG, "Previous not large enough")
            lastAccelerationDiff = accelerationDiff
            return
        }
        if (lastStepTimeNs > 0) {
            val stepTimeDelta: Nanoseconds = timeNs - lastStepTimeNs

            // Ignore steps with ore than 180bpm and less than 20bpm
            if (stepTimeDelta < 60 * 1000 / 180) {
                if (DEBUG) Log.i(LOG_TAG, "Too fast.")
                return
            } else if (stepTimeDelta > 60 * 1000 / 20) {
                if (DEBUG) Log.i(LOG_TAG, "Too slow.")
                lastStepTimeNs = timeNs
                validSteps = 0
                return
            }

            // check if this occurrence is regular with regard to the step frequency data
            if (!isRegularlyOverTime(stepTimeDelta)) {
                lastStepTimeNs = timeNs
                if (DEBUG) Log.i(LOG_TAG, "Not regularly over time.")
                return
            }
            lastStepTimeNs = timeNs

            // check if this occurrence is regular with regard to the acceleration data
            if (!isRegularlyOverAcceleration(accelerationDiff)) {
                lastAccelerationValue = acceleration
                lastAccelerationDiff = accelerationDiff
                if (DEBUG) {
                    Log.i(
                        LOG_TAG,
                        "Not regularly over acceleration" +
                            lastStepAccelerationDeltas.contentToString(),
                    )
                }
                validSteps = 0
                return
            }
            lastAccelerationValue = acceleration
            lastAccelerationDiff = accelerationDiff
            // okay, finally this has to be a step
            validSteps++
            if (DEBUG) {
                Log.i(LOG_TAG, "Detected step. Valid steps = $validSteps")
            }
            // count it only if we got ore than STEPS_THRESHOLD steps
            if (validSteps == STEPS_THRESHOLD) {
                this.onStepDetected(validSteps)
            } else if (validSteps > STEPS_THRESHOLD) {
                this.onStepDetected(1)
            }
        }
        lastStepTimeNs = timeNs
        lastAccelerationValue = acceleration
        lastAccelerationDiff = accelerationDiff
        lastSign = currentSign
        lastExtrema[(currentSign < 0).compareTo(false)] = acceleration
    }

    /**
     * Determines if this value is significant.
     *
     * @param value the value to check
     * @return true if it is significant else false
     */
    private fun isSignificantValue(value: Float): Boolean {
        return abs(value) > ACCEL_THRESHOLD
    }

    /**
     * The current acceleration difference has to be almost as large as the last one.
     *
     * @param diff The acceleration difference between current and last value
     * @return true if almost as large as last one
     */
    private fun isAlmostAsLargeAsPreviousOne(diff: Float): Boolean {
        return diff > lastAccelerationDiff * 0.5
    }

    /**
     * Determines if the last maximum was great enough
     *
     * @param diff the current acceleration diff
     * @return true if was great enough else false
     */
    private fun wasPreviousLargeEnough(diff: Float): Boolean {
        return lastAccelerationDiff > diff / 3
    }

    /**
     * Checks if the given delta time (between current and last step) is regularly.
     * The value is regularly if at most 20 percent of the older values differs from the given value
     * significantly.
     *
     * @param delta The difference between current and last step time
     * @return true if is regularly else false
     */
    private fun isRegularlyOverTime(delta: Long): Boolean {
        lastStepDeltas[lastStepDeltasIndex] = delta
        lastStepDeltasIndex = (lastStepDeltasIndex + 1) % lastStepDeltas.size

        var numIrregularValues = 0
        for (lastStepDelta: Long in lastStepDeltas) {
            if (abs(lastStepDelta - delta) > 200) {
                numIrregularValues++
                break
            }
        }

        return numIrregularValues < 1 // lastStepDeltas.length*0.2
    }

    /**
     * Checks if the given diff (between current and last acceleration data) is regularly in respect
     * to the older values.
     * The value is regularly if at most 20 percent of the older values differs from the given value
     * significantly.
     * @param diff The difference between current and last acceleration value
     * @return true if is regularly else false
     */
    private fun isRegularlyOverAcceleration(diff: Float): Boolean {
        lastStepAccelerationDeltas[lastStepAccelerationDeltasIndex] = diff
        lastStepAccelerationDeltasIndex =
            (lastStepAccelerationDeltasIndex + 1) % lastStepAccelerationDeltas.size
        var numIrregularAccelerationValues = 0
        for (lastStepAccelerationDelta in lastStepAccelerationDeltas) {
            if (abs(lastStepAccelerationDelta - lastAccelerationDiff) > 0.5) {
                numIrregularAccelerationValues++
                break
            }
        }
        return numIrregularAccelerationValues < lastStepAccelerationDeltas.size * 0.2
    }

    /**
     * Notifies any subscriber about the detected amount of steps
     * @param count The number of detected steps (greater zero)
     */
    private fun onStepDetected(count: Int) {
        if (count > 0) {
            this.listener!!.step(System.currentTimeMillis())
        }
    }

    companion object {
        // the following part will add some basic low/high-pass filter
        // to ignore earth acceleration
        private const val alpha = 0.8f
        private const val STEPS_THRESHOLD = 10
        private const val ACCEL_THRESHOLD = 0.75f
        private val LOG_TAG = Companion::class.java.simpleName
    }
}