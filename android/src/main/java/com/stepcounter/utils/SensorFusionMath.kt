package com.stepcounter.utils

import kotlin.math.sqrt

/**
 * This class contains all the math functions used in the sensor fusion.
 * @property SensorFusionMath.sum
 * @property SensorFusionMath.cross
 * @property SensorFusionMath.norm
 * @property SensorFusionMath.normalize
 * @property SensorFusionMath.dot
 * @see <a href="https://en.wikipedia.org/wiki/Euclidean_vector">Euclidean vector</a>
 */
object SensorFusionMath {
    /**
     * Get the sum of an array of floats.
     * @param array The array to be calculated.
     * @returns The sum of the array.
     * @see <a href="https://en.wikipedia.org/wiki/Summation">Summation</a>
     */
    fun sum(array: FloatArray): Float {
        var returnVal = 0f
        for (v in array) {
            returnVal += v
        }
        return returnVal
    }

    /**
     * In mathematics, the cross product or vector product
     * (occasionally directed area product, to emphasize
     * its geometric significance) is a binary operation on
     * two vectors in a three-dimensional oriented Euclidean
     * vector space.
     * @param arrayA The first array.
     * @param arrayB The second array.
     * @see <a href="https://en.wikipedia.org/wiki/Cross_product">Cross product</a>
     */
    fun cross(arrayA: FloatArray, arrayB: FloatArray): FloatArray {
        val retArray = FloatArray(3)
        retArray[0] = arrayA[1] * arrayB[2] - arrayA[2] * arrayB[1]
        retArray[1] = arrayA[2] * arrayB[0] - arrayA[0] * arrayB[2]
        retArray[2] = arrayA[0] * arrayB[1] - arrayA[1] * arrayB[0]
        return retArray
    }

    /**
     * In mathematics, a norm is a function from a real or complex vector space
     * to the non-negative real numbers that behaves in certain ways like the distance
     * from the origin: it commutes with scaling, obeys a form of the triangle inequality,
     * and is zero only at the origin.
     * @param array The array to be calculated.
     * @returns The norm of the array.
     * @see <a href="https://en.wikipedia.org/wiki/Norm_(mathematics)">Norm</a>
     */
    fun norm(array: FloatArray): Float {
        var returnVal = 0f
        for (v in array) {
            returnVal += v * v
        }
        return sqrt(returnVal)
    }

    /**
     * In mathematics, the dot product or scalar product is an algebraic operation
     * that takes two equal-length sequences of numbers (usually coordinate vectors),
     * and returns a single number.
     * @param a The first array.
     * @param b The second array.
     * @returns The dot product of the two arrays.
     * @see <a href="https://en.wikipedia.org/wiki/Dot_product">Dot product</a>
     */
    fun dot(a: FloatArray, b: FloatArray): Float {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }

    /**
     * Normalizes an array of floats.
     * @param array The array to be normalized.
     * @return The normalized array.
     * @see <a href="https://en.wikipedia.org/wiki/Normalization_(statistics)">Normalization</a>
     */
    fun normalize(array: FloatArray): FloatArray {
        val copied = FloatArray(array.size)
        val average = norm(array)
        for (i in array.indices) {
            copied[i] = array[i] / average
        }
        return copied
    }
}