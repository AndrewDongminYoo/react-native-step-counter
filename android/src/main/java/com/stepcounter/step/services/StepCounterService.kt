package com.stepcounter.step.services

import android.app.Service
import android.content.*
import android.hardware.*
import android.os.Binder
import android.os.IBinder
import android.speech.tts.TextToSpeech.*
import com.stepcounter.step.receivers.ServiceRestarter
import com.stepcounter.step.utils.StepListener
import java.util.*

class StepCounterService : Service(), SensorEventListener, StepListener {
    private var mBinder: IBinder = Binder()

    // set up things for resetting steps (to zero (most of the time) at midnight
    private var simpleStepDetector = StepDetector()
    var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    var isServiceRunning = false
    private var startNumSteps = 0
    private var currentSteps = 0

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
        simpleStepDetector = StepDetector()
        simpleStepDetector.registerListener(this)
        stepSensor = try {
            sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        } catch (_: Error) {
            sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        isServiceRunning = true
        sensorManager?.registerListener(
            this,
            stepSensor,
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
            simpleStepDetector.updateAccel(
                event.timestamp,
                event.values[0],
                event.values[1],
                event.values[2],
            )
            currentSteps = event.values[0].toInt()
        } else if (stepSensor?.type == Sensor.TYPE_STEP_COUNTER) {
            currentSteps = event.values[0].toInt()
            if (startNumSteps == 0) startNumSteps = currentSteps
            currentSteps -= startNumSteps
            // Only look at step counter or accelerometer events
        } else if (event.sensor.type != stepSensor?.type) {
            return
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
        broadcastIntent.setClass(this, ServiceRestarter::class.java)
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

    override fun step() {
        currentSteps++
    }
}