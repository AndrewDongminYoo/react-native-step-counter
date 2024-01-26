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
     * The summation function, also known as a sigma function, is commonly used in mathematics to denote
     * the summation of a set of values. In the context of Euclidean vectors, the summation function can
     * be used to calculate the length or magnitude of a vector.
     * The Euclidean [norm], also known as the L2 [norm], of a vector `x = [x1, x2, ..., xn]` is defined as the
     * square root of the sum of the squares of its components.
     * @param vector The array to be calculated.
     * @returns The sum of the array.
     * @see <a href="https://en.wikipedia.org/wiki/Summation">Summation</a>
     */
    fun sum(vector: FloatArray): Float {
        var summation = 0f
        for (v in vector) {
            summation += v
        }
        return summation
    }

    /**
     * The cross product is a binary operation on two vectors in three-dimensional space that
     * results in a perpendicular vector to the input vectors. It's used in math, physics, engineering,
     * and computer programming and should not be confused with the [dot] product,
     * which is a scalar product that measures the projection of one vector onto another.
     * @param vectorA The first array.
     * @param vectorB The second array.
     * @see <a href="https://en.wikipedia.org/wiki/Cross_product">Cross product</a>
     */
    fun cross(vectorA: FloatArray, vectorB: FloatArray): FloatArray {
        val outVector = FloatArray(3)
        outVector[0] = vectorA[1] * vectorB[2] - vectorA[2] * vectorB[1]
        outVector[1] = vectorA[2] * vectorB[0] - vectorA[0] * vectorB[2]
        outVector[2] = vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0]
        return outVector
    }

    /**
     * In mathematics, a norm is a function from a real or complex [vector] space
     * to the non-negative real numbers that behaves in certain ways like the distance
     * from the origin: it commutes with scaling, obeys a form of the triangle inequality,
     * and is zero only at the origin.
     * @param vector The vector to be calculated.
     * @returns The norm of the vector.
     * @see <a href="https://en.wikipedia.org/wiki/Norm_(mathematics)#Euclidean_norm">Euclidean Normalization</a>
     */
    fun norm(vector: FloatArray): Float {
        var initFloat = 0f
        for (v in vector) {
            initFloat += v * v
        }
        return sqrt(initFloat)
    }

    /**
     * In mathematics, the dot product or scalar product is an algebraic operation
     * that takes two equal-length sequences of numbers (usually coordinate vectors),
     * and returns a single number.
     * In Euclidean geometry, the dot product of the Cartesian coordinates of two vectors is widely used.
     * @param a The first sequence of numbers.
     * @param b The second sequence of numbers. Must be the same length as the first sequence.
     * @returns The dot product(single number) of the two sequences of numbers.
     * @see <a href="https://en.wikipedia.org/wiki/Dot_product">Dot product</a>
     */
    fun dot(a: FloatArray, b: FloatArray): Float {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }

    /**
     * The norm function is a utility function used here to calculate the Euclidean norm of the input vector.
     * The calculated norm value is used to normalize the input [vector] by
     * dividing each component of the input vector by the norm value.
     * Therefore, while both functions use the same mathematical formula for Euclidean vector normalization,
     * they serve different purposes.
     * The [norm] function calculates the norm of a vector, while the [normalize] function returns a new normalized vector.
     * @param vector The input array to be normalized.
     * @return The new normalized vector.
     * @see SensorFusionMath.norm
     */
    fun normalize(vector: FloatArray): FloatArray {
        val normalizedVector = FloatArray(vector.size)
        val normed = norm(vector)
        for (i in vector.indices) {
            normalizedVector[i] = vector[i] / normed
        }
        return normalizedVector
    }
}