package com.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class RNWalkCounterModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(
        reactContext,
    ),
    SensorEventListener,
    StepListener {
    private var simpleStepDetector: StepDetector? = null
    private var sensorManager: SensorManager? = null
    private var accel: Sensor? = null
    private var numSteps = 0
    override fun getName(): String {
        return "RNWalkCounter"
    }

    fun startCounter(THRESHOLD: Float, DELAY_NS: Int) {
        numSteps = 0
        initStepCounter(THRESHOLD, DELAY_NS)
        runStepCounter()
        reactContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onStepStart", null)
    }

    fun defaultStartCounter() {
        numSteps = 0
        defaultInitStepCounter()
        runStepCounter()
        reactContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onStepStart", null)
    }

    private fun initStepCounter(THRESHOLD: Float, DELAY_NS: Int) {
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accel = sensorManager!!.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        simpleStepDetector = StepDetector(THRESHOLD, DELAY_NS)
        simpleStepDetector!!.registerListener(this)
    }

    private fun defaultInitStepCounter() {
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accel = sensorManager!!.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        simpleStepDetector = StepDetector()
        simpleStepDetector!!.registerListener(this)
    }

    private fun runStepCounter() {
        sensorManager!!.registerListener(this, accel, SensorManager.SENSOR_DELAY_FASTEST)
    }

    private fun onStepRunning(newSteps: Long) {
        val params = Arguments.createMap()
        params.putString("steps", "" + newSteps)
        reactContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onStepRunning", params)
    }

    fun stopCounter() {
        sensorManager!!.unregisterListener(this)
    }

    override fun onAccuracyChanged(s: Sensor, i: Int) {}
    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            simpleStepDetector!!.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
        }
    }

    override fun step() {
        numSteps++
        onStepRunning(numSteps.toLong())
    }
}