package com.stepcounter.models

/**
 * ### Status Enum - The status of the native module's sensor.
 * @property STOPPED The status of the module when it is stopped.
 * @property STARTING The status of the module when it is starting.
 * @property RUNNING The status of the module when it is running.
 * @property ERROR_FAILED_TO_START The status of the module when it fails to start.
 * @property ERROR_NO_SENSOR_FOUND The status of the module when it fails to find a sensor.
 */
enum class STATUS(val value: Int) {
    STOPPED(0),
    STARTING(1),
    RUNNING(2),
    ERROR_FAILED_TO_START(3),
    ERROR_NO_SENSOR_FOUND(4),
}