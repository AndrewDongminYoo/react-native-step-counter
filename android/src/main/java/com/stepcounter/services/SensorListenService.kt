package com.stepcounter.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Binder
import android.os.IBinder
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.stepcounter.StepCounterModule
import com.stepcounter.StepCounterModule.Companion.CONTEXT
import com.stepcounter.utils.SerializeHelper

abstract class SensorListenService : Service(), SensorEventListener {
    /**
     * the accelerometer sensor type
     * [TYPE_ACCELEROMETER][Sensor.TYPE_ACCELEROMETER]: 1<br/>
     *
     * the step counter sensor type
     * [TYPE_STEP_COUNTER][Sensor.TYPE_STEP_COUNTER]: 19<br/>
     */
    abstract val sensorType: Int // 19 or 1
    /**
     * the fastest rate
     * [SENSOR_DELAY_FASTEST][SensorManager.SENSOR_DELAY_FASTEST]: 0
     *
     * rate suitable for games
     * [SENSOR_DELAY_GAME][SensorManager.SENSOR_DELAY_GAME]: 1
     *
     * rate suitable for the user interface
     * [SENSOR_DELAY_UI][SensorManager.SENSOR_DELAY_UI]: 2
     *
     * default rate that suitable for screen orientation changes
     * [SENSOR_DELAY_NORMAL][SensorManager.SENSOR_DELAY_NORMAL]: 3
     */
    abstract val sensorDelay: Int
    abstract val sensorTypeString: String
    private var detectedSensor: Sensor? = null
    private var sensorManager: SensorManager? = null
    private var context: ReactApplicationContext? = null
    private var counterModule: StepCounterModule? = null
    private val binder: Binder = LocalBinder()
    private val stepsParamsMap: WritableMap
        get() {
            val map = Arguments.createMap()
            map.putDouble("steps", currentSteps)
            map.putDouble("distance", distance)
            map.putInt("startDate", startDate.toInt())
            map.putInt("endDate", endDate.toInt())
            map.putString("counterType", sensorTypeString)
            map.putDouble("calories", calories)
            map.putInt("dailyGoal", dailyGoal)
            return map
        }
    /**
     * Number of steps the user wants to walk every day
     */
    private var dailyGoal: Int = 10000
    /**
     * Number of in-database-saved calories;
     */
    private var calories: Double = 0.0
    /**
     * Distance of in-database-saved steps
     */
    private var distance: Double = 0.0
    /**
     * Number of steps counted since service start
     */
    abstract var currentSteps: Double
    /**
     * Start date of the step counting
     */
    abstract var startDate: Long
    /**
     * End date of the step counting
     */
    abstract var endDate: Long

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG_NAME, "onStartCommand.intent: $intent")
        Log.d(TAG_NAME, "onStartCommand.flags: $flags")
        Log.d(TAG_NAME, "onStartCommand.startId: $startId")
        context = SerializeHelper.deserialize(this, intent, CONTEXT)
        counterModule = context!!.getNativeModule(StepCounterModule::class.java)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        detectedSensor = sensorManager!!.getDefaultSensor(sensorType)
        sensorManager!!.registerListener(this, detectedSensor, sensorDelay)
        return super.onStartCommand(intent, flags, startId)
    }

    override fun stopService(name: Intent?): Boolean {
        Log.d(TAG_NAME, "onDestroy: ")
        sensorManager!!.unregisterListener(this)
        return super.stopService(name)
    }

    override fun onBind(intent: Intent): IBinder {
        return binder
    }

    /**
     * Called when there is a new sensor event.  Note that "on changed"
     * is somewhat of a misnomer, as this will also be called if we have a
     * new reading from a sensor with the exact same sensor values (but a
     * newer timestamp).
     * See [SensorManager][android.hardware.SensorManager]
     * for details on possible sensor types.
     * See also [SensorEvent][android.hardware.SensorEvent].
     * **NOTE:** The application doesn't own the
     * [event][android.hardware.SensorEvent]
     * object passed as a parameter and therefore cannot hold on to it.
     * The object may be part of an internal pool and may be reused by
     * the framework.
     *
     * @param event the [SensorEvent][android.hardware.SensorEvent].
     */
    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_ACCELEROMETER
            && event?.sensor?.type != Sensor.TYPE_STEP_COUNTER
        ) return
        updateCurrentSteps(event.timestamp, event.values)
        sendStepCounterUpdateEvent()
    }

    abstract fun updateCurrentSteps(timeNs: Long, eventData: FloatArray): Double

    /**
     * Called when the accuracy of the registered sensor has changed.  Unlike
     * onSensorChanged(), this is only called when this accuracy value changes.
     * See the SENSOR_STATUS_* constants in
     * [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param accuracy The new accuracy of this sensor, one of
     * `SensorManager.SENSOR_STATUS_*`
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d(TAG_NAME, "onAccuracyChanged.accuracy $accuracy")
        Log.d(TAG_NAME, "onAccuracyChanged.sensor: $sensor")
    }

    /**
     * Send event to Device Bridge JS Module
     * @throws RuntimeException
     */
    private fun sendStepCounterUpdateEvent() {
        Log.d(TAG_NAME, "sendStepCounterUpdateEvent: $currentSteps")
        try {
            counterModule?.onListenerUpdated(stepsParamsMap)
        } catch (e: RuntimeException) {
            Log.e(TAG_NAME, "sendStepCounterUpdateEvent: ", e)
        }
    }

    companion object {
        val TAG_NAME: String = SensorListenService::class.java.name
    }

    inner class LocalBinder : Binder() {
        val service: SensorListenService
            get() = this@SensorListenService
    }
}