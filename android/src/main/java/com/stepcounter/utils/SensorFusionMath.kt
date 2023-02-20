package com.stepcounter.utils

import kotlin.math.sqrt

@Suppress("unused")
object SensorFusionMath {
    fun sum(array: FloatArray): Float {
        var returnVal = 0f
        for (v in array) {
            returnVal += v
        }
        return returnVal
    }

    fun cross(arrayA: FloatArray, arrayB: FloatArray): FloatArray {
        val retArray = FloatArray(3)
        retArray[0] = arrayA[1] * arrayB[2] - arrayA[2] * arrayB[1]
        retArray[1] = arrayA[2] * arrayB[0] - arrayA[0] * arrayB[2]
        retArray[2] = arrayA[0] * arrayB[1] - arrayA[1] * arrayB[0]
        return retArray
    }

    fun norm(array: FloatArray): Float {
        var returnVal = 0f
        for (v in array) {
            returnVal += v * v
        }
        return sqrt(returnVal)
    }

    // Note: only works with 3D vectors.
    fun dot(a: FloatArray, b: FloatArray): Float {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }

    fun normalize(a: FloatArray): FloatArray {
        val value = FloatArray(a.size)
        val norm = norm(a)
        for (i in a.indices) {
            value[i] = a[i] / norm
        }
        return value
    }
}