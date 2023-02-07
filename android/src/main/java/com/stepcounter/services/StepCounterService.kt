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

class StepCounterService(applicationContext: ReactApplicationContext) :
    Service(),
    SensorEventListener,
    StepperInterface {
    private var mBinder: IBinder = Binder()

    // set up things for resetting steps (to zero (most of the time) at midnight
    private var stepDetector = StepDetector()
    var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    var isServiceRunning = false
    private var startNumSteps = 0F
    private var currentSteps: Float = 0F
    private var reactContext: ReactApplicationContext = applicationContext
    private var status = STOPPED

    private var startAt: Long

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
        this.stepDetector = StepDetector()
        this.stepDetector.registerListener(this)
        this.stepSensor = try {
            sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        } catch (_: Error) {
            sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        isServiceRunning = true
        sensorManager?.registerListener(
            this,
            this.stepSensor,
            SensorManager.SENSOR_DELAY_FASTEST,
            SensorManager.SENSOR_DELAY_UI,
        )
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
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            this.stepDetector.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
            currentSteps = event.values[0]
        } else if (this.stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            currentSteps = event.values[0]
            if (startNumSteps == 0F) startNumSteps = currentSteps
            currentSteps -= startNumSteps
            // Only look at step counter or accelerometer events
        } else if (event.sensor.type != this.stepSensor?.type) {
            return
        }

        // Only look at step counter or accelerometer events
        if (event.sensor.type != this.stepSensor?.type) {
            return
        }
        // If not running, then just return
        if (status == STOPPED) {
            return
        }
        status = RUNNING
        if (this.stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            val steps: Float = event.values[0]
            if (startNumSteps == 0f) startNumSteps = steps
            currentSteps = steps - startNumSteps
            try {
                sendPedometerUpdateEvent(stepsParamsMap)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else if (this.stepSensor?.type == Sensor.TYPE_ACCELEROMETER) {
            this.stepDetector.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
        }
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
            sendPedometerUpdateEvent(stepsParamsMap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    init {
        startAt = 0
        currentSteps = 0f
        startNumSteps = 0f
        status = STOPPED
        this.stepDetector = StepDetector()
        this.stepDetector.registerListener(this as StepperInterface)
        sensorManager = this.reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    @ReactMethod
    fun isStepCountingAvailable(callback: Callback) {
        val stepCounter: Sensor? = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        val accel: Sensor? = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        return if (accel != null || stepCounter != null) {
            callback.invoke(null, true)
        } else {
            callback.invoke(ERROR_NO_SENSOR_FOUND, false)
        }
    }

    @ReactMethod
    fun startPedometerUpdatesFromDate(date: Int?) {
        if (status != RUNNING) {
            // If not running, then this is an async call, so don't worry about waiting
            // We drop the callback onto our stack, call start, and let start and the sensor callback fire off the callback down the road
            start()
        }
    }

    @ReactMethod
    fun stopPedometerUpdates() {
        if (status == RUNNING) {
            stop()
        }
    }

    @ReactMethod
    fun queryPedometerDataBetweenDates(endDate: Int?, callback: Callback) {
        try {
            callback.invoke(null, stepsParamsMap)
        } catch (e: Exception) {
            callback.invoke(e.message, null)
        }
    }

    /**
     * Start listening for pedometers sensor.
     */
    private fun start() {
        // If already starting or running, then return
        if (status == RUNNING || status == STARTING) {
            return
        }
        startAt = System.currentTimeMillis()
        currentSteps = 0f
        startNumSteps = 0f
        status = STARTING
        // Get pedometer or accelerometer from sensor manager
        this.stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (this.stepSensor == null) {
            this.stepSensor =
                sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }

        // If found, then register as listener
        if (this.stepSensor != null) {
            val sensorDelay: Int =
                if (this.stepSensor!!.type == Sensor.TYPE_STEP_COUNTER) SensorManager.SENSOR_DELAY_UI else SensorManager.SENSOR_DELAY_FASTEST
            if (sensorManager!!.registerListener(this, this.stepSensor, sensorDelay)) {
                status = STARTING
            } else {
                status = ERROR_FAILED_TO_START
                return
            }
        } else {
            status = ERROR_FAILED_TO_START
            return
        }
    }

    /**
     * Stop listening to sensor.
     */
    private fun stop() {
        if (status != STOPPED) {
            sensorManager!!.unregisterListener(this)
        }
        status = STOPPED
    }

    private val stepsParamsMap: WritableMap
        get() {
            val map: WritableMap = Arguments.createMap()
            map.putInt("startDate", startAt.toInt())
            map.putInt("endDate", System.currentTimeMillis().toInt())
            map.putDouble("numberOfSteps", currentSteps.toDouble())
            map.putDouble("distance", (currentSteps * STEP_IN_METERS).toDouble())
            return map
        }

    private fun sendPedometerUpdateEvent(params: WritableMap?) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("pedometerDataDidUpdate", params)
    }

    companion object {
        var STOPPED = 0
        var STARTING = 1
        var RUNNING = 2
        var ERROR_FAILED_TO_START = 3
        var ERROR_NO_SENSOR_FOUND = 4
        var STEP_IN_METERS = 0.762f
    }

    val name: String
        get() = "BMDPedometer"
}