package com.stepcounter.services

import android.app.Service
import android.content.*
import android.hardware.*
import android.os.Binder
import android.os.IBinder
import android.speech.tts.TextToSpeech.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stepcounter.models.StepperInterface
import java.util.*

class StepCounterService :
    Service(),
    SensorEventListener,
    StepperInterface {
    private var mBinder: IBinder = Binder()

    // set up things for resetting steps (to zero (most of the time) at midnight
    private val stepDetector = StepDetector()
    var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    private var accelometer: Sensor? = null
    var isServiceRunning = false
    private var startNumSteps: Float
    private var currentSteps: Float
    private var status: Int // STOPPED
    private var startAt: Long // 0.0
    private val stepsParamsMap: WritableMap
        get() {
            val map: WritableMap = Arguments.createMap()
            map.putInt("startDate", startAt.toInt())
            map.putInt("endDate", System.currentTimeMillis().toInt())
            map.putDouble("numberOfSteps", currentSteps.toDouble())
            map.putDouble("distance", (currentSteps * STEP_IN_METERS).toDouble())
            return map
        }

    init {
        startAt = 0
        currentSteps = 0f
        startNumSteps = 0f
        status = STOPPED
        stepDetector.registerListener(this as StepperInterface)
        sensorManager = reactContext.getSystemService(SENSOR_SERVICE) as SensorManager
    }

    /**
     * Return the communication channel to the service.  May return null if
     * clients can not bind to the service.  The returned
     * [android.os.IBinder] is usually for a complex interface
     * that has been [described using * aidl]({@docRoot}guide/components/aidl.html).
     *
     *
     * *Note that unlike other application components, calls on to the
     * IBinder interface returned here may not happen on the main thread
     * of the process*.  More information about the main thread can be found in
     * [Processes and * Threads]({@docRoot}guide/topics/fundamentals/processes-and-threads.html).
     *
     * @param intent The Intent that was used to bind to this service,
     * as given to [ Context.bindService][android.content.Context.bindService].  Note that any extras that were included with
     * the Intent at that point will *not* be seen here.
     *
     * @return Return an IBinder through which clients can call on to the
     * service.
     */
    override fun onBind(intent: Intent?): IBinder {
        return mBinder
    }

    /**
     * Called by the system when the service is first created.  Do not call this method directly.
     */
    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        stepDetector.registerListener(this)
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        isServiceRunning = true
        sensorManager?.registerListener(
            this,
            stepSensor,
            SensorManager.SENSOR_DELAY_FASTEST,
            SensorManager.SENSOR_DELAY_UI,
        )
        sensorManager?.registerListener(
            this,
            accelometer,
            SensorManager.SENSOR_DELAY_FASTEST,
            SensorManager.SENSOR_DELAY_UI,
        )
    }

    /**
     * Called by the system to notify a Service that it is no longer used and is being removed.  The
     * service should clean up any resources it holds (threads, registered
     * receivers, etc) at this point.  Upon return, there will be no more calls
     * in to this Service object and it is effectively dead.  Do not call this method directly.
     */
    override fun onDestroy() {
        // turn off step counter service
        @Suppress("DEPRECATION")
        stopForeground(true)
        // turn off auto start service
        val broadcastIntent = Intent()
        broadcastIntent.action = "restart" + "service"
        this.sendBroadcast(broadcastIntent)
        // turn off auto start service
        sensorManager?.unregisterListener(this)
        super.onDestroy()
    }

    /**
     * Called when there is a new sensor event.  Note that "on changed"
     * is somewhat of a misnomer, as this will also be called if we have a
     * new reading from a sensor with the exact same sensor values (but a
     * newer timestamp).
     *
     *
     * See [SensorManager][android.hardware.SensorManager]
     * for details on possible sensor types.
     *
     * See also [SensorEvent][android.hardware.SensorEvent].
     *
     *
     * **NOTE:** The application doesn't own the
     * [event][android.hardware.SensorEvent]
     * object passed as a parameter and therefore cannot hold on to it.
     * The object may be part of an internal pool and may be reused by
     * the framework.
     *
     * @param event the [SensorEvent][android.hardware.SensorEvent].
     */
    override fun onSensorChanged(event: SensorEvent) {
        if (!isServiceRunning) return
        val steps: Float = event.values[0]
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            stepDetector.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
        } else if (stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            if (startNumSteps == 0F) startNumSteps = steps
            currentSteps = steps - startNumSteps
        } else if (status == STOPPED) return else return
        status = RUNNING
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Called when the accuracy of the registered sensor has changed.  Unlike
     * onSensorChanged(), this is only called when this accuracy value changes.
     *
     *
     * See the SENSOR_STATUS_* constants in
     * [SensorManager][android.hardware.SensorManager] for details.
     *
     * @param accuracy The new accuracy of this sensor, one of
     * `SensorManager.SENSOR_STATUS_*`
     */
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    }

    override fun step(timeNs: Long) {
        currentSteps++
        try {
            sendStepCounterUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun isStepCountingAvailable(): Boolean {
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        return if (accelometer != null || stepSensor != null) {
            status = STARTING
            true
        } else {
            status = ERROR_NO_SENSOR_FOUND
            false
        }
    }

    fun startStepCounterUpdatesFromDate(date: Int?) {
        // If not running, then this is an async call, so don't worry about waiting
        // We drop the callback onto our stack, call start, and let start and the sensor callback fire off the callback down the road
        if (status == RUNNING || status == STARTING) {
            return
        }
        startAt = date?.toLong() ?: System.currentTimeMillis()
        currentSteps = 0f
        startNumSteps = 0f
        status = STARTING
        // Get stepCounter or accelerometer from sensor manager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepSensor == null) {
            stepSensor =
                sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        // If found, then register as listener
        if (stepSensor != null) {
            sensorManager!!.registerListener(
                this,
                stepSensor,
                SensorManager.SENSOR_DELAY_FASTEST,
                SensorManager.SENSOR_DELAY_UI,
            )
        } else {
            status = ERROR_FAILED_TO_START
            return
        }
    }

    fun stopStepCounterUpdates() {
        if (status != STOPPED) {
            sensorManager?.unregisterListener(this)
        }
        status = STOPPED
    }

    private fun sendStepCounterUpdateEvent(params: WritableMap?) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("stepCounterDataDidUpdate", params)
    }

    companion object {
        var STOPPED = 0
        var STARTING = 1
        var RUNNING = 2
        var ERROR_FAILED_TO_START = 3
        var ERROR_NO_SENSOR_FOUND = 4
        var STEP_IN_METERS = 0.762f
        private lateinit var reactContext: ReactApplicationContext
        fun setContext(context: ReactApplicationContext) {
            reactContext = context
        }
    }
}