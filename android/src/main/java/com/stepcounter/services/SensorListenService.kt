package com.stepcounter.services

import android.app.Service
import android.content.BroadcastReceiver
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
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

@Suppress("unused")
abstract class SensorListenService : Service(), SensorEventListener {
    abstract val sensorType: Int
    abstract val sensorDelay: Int
    abstract val sensorTypeString: String
    private var sensorManager: SensorManager? = null
    private val binder: Binder = LocalBinder()
    private val stepsParamsMap: WritableMap
        get() {
            val map = Arguments.createMap()
            map.putDouble("steps", currentSteps)
            map.putDouble("distance", distance)
            map.putString("counterType", sensorTypeString)
            map.putDouble("calories", calories)
            map.putInt("dailyGoal", dailyGoal)
            return map
        }
    private var appContext: ReactApplicationContext? = null
    /**
     * Number of steps the user wants to walk every day
     */
    private var dailyGoal = 10000
    /**
     * Number of in-database-saved steps.
     */
    private var lastSteps = 0
    /**
     * Number of in-database-saved calories;
     */
    private var calories = 0.0
    /**
     * Distance of in-database-saved steps
     */
    private var distance = 0.0
    /**
     * Number of steps counted since service start
     */
    abstract var currentSteps: Double
    private val broadcastReceiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG_NAME, "onReceive: ")
            if (intent?.action == ACTION_NAME) {
                currentSteps = intent.getDoubleExtra("steps", 0.0)
                distance = intent.getDoubleExtra("distance", currentSteps * 0.762)
                calories = intent.getDoubleExtra("calories", currentSteps * 0.04)
                dailyGoal = intent.getIntExtra("dailyGoal", 10000)
                sendStepCounterUpdateEvent()
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG_NAME, "onStartCommand.intent: $intent")
        Log.d(TAG_NAME, "onStartCommand.flags: $flags")
        Log.d(TAG_NAME, "onStartCommand.startId: $startId")
        return super.onStartCommand(intent, flags, startId)
    }
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG_NAME, "onCreate: ")
        sensorManager = appContext!!.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = sensorManager!!.getDefaultSensor(sensorType)
        sensorManager!!.registerListener(this, sensor, sensorDelay)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG_NAME, "onDestroy: ")
        sensorManager?.unregisterListener(this)
        this.unregisterReceiver(broadcastReceiver)
    }

    fun setContext(context: ReactApplicationContext) {
        this.appContext = context
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
            appContext!!.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("stepCounterUpdate", stepsParamsMap)
        } catch (e: RuntimeException) {
            Log.e(TAG_NAME, "sendStepCounterUpdateEvent: ", e)
        }
    }

    companion object {
        val TAG_NAME: String = SensorListenService::class.java.name
        /**
         * Broadcast action identifier for messages broadcast when step count was saved
         */
        const val BROADCAST_ACTION_STEPS_SAVED: String =
            "com.stepcounter.services.STEPS_SAVED"
        const val BROADCAST_ACTION_STEPS_UPDATED: String =
            "com.stepcounter.services.STEPS_UPDATED"
        const val BROADCAST_ACTION_STEPS_INSERTED: String =
            "com.stepcounter.services.STEPS_INSERTED"
        const val ACTION_NAME: String = "com.stepcounter.services.SensorListenService"
    }

    inner class LocalBinder : Binder() {
        val service: SensorListenService
            get() = this@SensorListenService
        fun stepSinceLastSave() {
            currentSteps - lastSteps
        }
        fun resetStepCount() {
            currentSteps = 0.0
        }
    }
}