package com.stepcounter.step.background

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.*
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.speech.tts.TextToSpeech
import android.speech.tts.TextToSpeech.*
import android.speech.tts.Voice
import android.util.Log
import com.stepcounter.step.models.AccelVector
import com.stepcounter.step.models.PaseoDBHelper
import com.stepcounter.step.models.StepsModel
import java.text.SimpleDateFormat
import java.util.*

class StepCounterService : Service(), SensorEventListener, OnInitListener {
    inner class LocalBinder : Binder() {
        val serverInstance: StepCounterService
            get() = this@StepCounterService
    }

    private var hasAccelerometer = true
    private var hasStepCounter = true
    private var endSteps = 0

    // default values for target steps (overridden later from shared preferences)
    var targetSteps = 10000
    private var lastAccelData: FloatArray? = floatArrayOf(0f, 0f, 0f)
    private lateinit var paseoDBHelper: PaseoDBHelper
    private var tts: TextToSpeech? = null
    private var ttsAvailable = false
    private var mBinder: IBinder = LocalBinder()

    // set up things for resetting steps (to zero (most of the time) at midnight
    private var myPendingIntent: PendingIntent? = null
    private var midnightAlarmManager: AlarmManager? = null
    private var myBroadcastReceiver: BroadcastReceiver? = null
    var sensorManager: SensorManager? = null
    var running = false
    var startSteps = 0
    var currentSteps = 0
    var latestDay = 0
    var latestHour = 0

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
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        running = true
        val stepsSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (stepsSensor != null) {
            sensorManager?.registerListener(
                this,
                stepsSensor,
                SensorManager.SENSOR_DELAY_UI,
                SensorManager.SENSOR_DELAY_UI,
            )
        }
        // point to the Paseo database that stores all the daily steps data
        paseoDBHelper = PaseoDBHelper(this)
        tts = try {
            TextToSpeech(this, this)
        } catch (e: Exception) {
            null
        }
        // set the user's target:
        val paseoPrefs = this.getSharedPreferences("ca.chancehorizon.paseo_preferences", 0)
        targetSteps = paseoPrefs!!.getInt("prefDailyStepsTarget", targetSteps)
        // set up time to reset steps - immediately (10 seconds) after midnight
        val midnightAlarmCalendar: Calendar = Calendar.getInstance()
        midnightAlarmCalendar.set(Calendar.HOUR_OF_DAY, 0)
        midnightAlarmCalendar.set(Calendar.MINUTE, 0)
        midnightAlarmCalendar.set(Calendar.SECOND, 10)
        val midnightAlarmTime = midnightAlarmCalendar.timeInMillis
        // set up the alarm to reset steps after midnight
        registerMyAlarmBroadcast()
        // set alarm to repeat every day (as in every 24 hours, which should be every day immediately after midnight)
        midnightAlarmManager?.setRepeating(
            AlarmManager.RTC,
            midnightAlarmTime,
            AlarmManager.INTERVAL_DAY,
            myPendingIntent,
        )
    }

    /**
     * set up the alarm to reset steps after midnight (shown in widget and notification)
     * this is done so that the number of steps shown on a new day when no steps have yet been taken (sensed)
     * is reset to zero, rather than showing yesterday's step total (the number of steps shown is only updated when steps are sensed)
     *
     * @see AlarmManager#set
     * @see AlarmManager#setRepeating
     * @see AlarmManager#setWindow
     * @see AlarmManager#cancel
     * @see AlarmManager#getNextAlarmClock()
     * @see android.content.Context#sendBroadcast
     * @see android.content.Context#registerReceiver
     * @see android.content.Intent#filterEquals
     */
    private fun registerMyAlarmBroadcast(): Intent? {
        // This is the call back function(BroadcastReceiver) which will be call when your
        // alarm time will reached.
        myBroadcastReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                updatePaseoWidget()
                updatePaseoNotification()
            }
        }
        val intent = registerReceiver(myBroadcastReceiver, IntentFilter("ca.chancehorizon.paseo"))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            myPendingIntent = PendingIntent.getBroadcast(
                this.applicationContext,
                0,
                Intent("ca.chancehorizon.paseo"),
                PendingIntent.FLAG_IMMUTABLE,
            )
        }
        midnightAlarmManager = this.getSystemService(ALARM_SERVICE) as AlarmManager
        return intent
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
        if (!running) return
        var dateFormat =
            SimpleDateFormat("yyyyMMdd", Locale.getDefault()) // looks like "19891225"
        val today = dateFormat.format(Date()).toInt()
        dateFormat = SimpleDateFormat("HH", Locale.getDefault())
        val currentHour = dateFormat.format(Date()).toInt()
        if (hasStepCounter) {
            // read the step count value from the devices step counter sensor
            currentSteps = event.values[0].toInt()
        }
        // *** experimental code for using accelerometer to detect steps on devices that do not hav
        //  a step counter sensor (currently unused as Paseo will not install on such a device -
        //   based on settings in manifest)
        else if (hasAccelerometer && event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            lastAccelData = lowPassFilter(event.values, lastAccelData)
            val accelData = AccelVector(lastAccelData!!)
            if (accelData.accelVector > 12.5f) {
                if (LAST_DETECTION == NO_STEP_DETECTED) {
                    currentSteps = paseoDBHelper.readLastEndSteps() + 1
                }
                LAST_DETECTION =
                    STEP_DETECTED
            } else {
                LAST_DETECTION =
                    NO_STEP_DETECTED
            }
        }
        // get the latest step information from the database
        if (paseoDBHelper.readRowCount() > 0) {
            latestDay = paseoDBHelper.readLastStepsDate()
            latestHour = paseoDBHelper.readLastStepsTime()
            startSteps = paseoDBHelper.readLastStartSteps()
            endSteps = paseoDBHelper.readLastEndSteps()
        }
        // hour is one more than last hour recorded -> add new hour record to database
        if (today == latestDay && currentHour == latestHour + 1 && currentSteps >= startSteps) {
            addSteps(today, currentHour, endSteps, currentSteps)
        }
        // add a new hour record (may be for current day or for a new day)
        //  also add a new record if the current steps is less than the most recent start steps (happens when phone has been rebooted)
        else if (today != latestDay || currentHour != latestHour || currentSteps < startSteps) {
            addSteps(today, currentHour, currentSteps, currentSteps)
        } else {
            //  set endSteps to current steps (update the end steps for current hour)
            addSteps(today, currentHour, 0, currentSteps, true)
        }
        // retrieve today's step total
        val theSteps = paseoDBHelper.getDaysSteps(today)
        updatePaseoWidget()
        updatePaseoNotification()
        // check if the user has a mini goal running and update all of the values needed
        checkMiniGoal()
        // send message to application activity so that it can react to new steps being sensed
        val local = Intent()
        local.action = "ca.chancehorizon.paseo.action"
        local.putExtra("data", theSteps)
        this.sendBroadcast(local)
    }

    private fun checkMiniGoal() {
        val paseoPrefs = this.getSharedPreferences("ca.chancehorizon.paseo_preferences", 0)
        val isGoalActive = paseoPrefs!!.getBoolean("prefMiniGoalActive", false)
        val useDaySteps = paseoPrefs.getBoolean("prefDayStepsGoal", false)
        val continueAnnouncing = paseoPrefs.getBoolean("prefContinueAnnounce", false)
        // continue to announce mini goal progress if the goal is active (not yet achieved)
        //  or the user has chosen to continue announcements beyond the goal being met
        if (isGoalActive || continueAnnouncing) {
            // get the mini goal steps amount
            val miniGoalSteps = paseoPrefs.getInt("prefMiniGoalSteps", 20)
            // get the mini goal interval for text to speech announcements
            val miniGoalAlertInterval = paseoPrefs.getInt("prefMiniGoalAlertInterval", 0)
            // get the number of steps at which the next announcement will be spoken
            var miniGoalNextAlert = paseoPrefs.getInt("prefMiniGoalNextAlert", 0)
            // load the number of steps in this day at which the mini goal was started
            val miniGoalStartSteps = paseoPrefs.getInt("prefMiniGoalStartSteps", 0)
            val stepCount: Int
            // load the current number on the devices step counter sensor
            val miniGoalEndSteps = paseoDBHelper.readLastEndSteps()
            // display goal step count
            // default to the steps starting at zero (or use the day's set count, if user has set that option)
            if (!useDaySteps) {
                stepCount = miniGoalEndSteps - miniGoalStartSteps
            }
            // or get the current day's steps
            else {
                stepCount = paseoDBHelper.getDaysSteps(
                    SimpleDateFormat(
                        "yyyyMMdd",
                        Locale.getDefault(),
                    ).format(Date()).toInt(),
                )
                // start the alert steps at the beginning number of steps for the current day
                if (miniGoalNextAlert < stepCount - miniGoalAlertInterval && miniGoalAlertInterval > 0) {
                    miniGoalNextAlert =
                        ((stepCount + miniGoalAlertInterval) / miniGoalAlertInterval - 1) * miniGoalAlertInterval
                }
            }
            // check if mini goal has been achieved and congratulate the user if it has
            if (stepCount >= miniGoalSteps && isGoalActive) {
                // update shared preferences to flag that there is no longer a mini goal running
                val edit: SharedPreferences.Editor = paseoPrefs.edit()
                edit.putBoolean("prefMiniGoalActive", false)
                edit.apply()
                speakOut("Congratulations on $miniGoalSteps steps!")
                // even though the goal has been achieved, update the next alert steps when the user
                //  has chosen to continue announcements beyond the goal
                if (continueAnnouncing) {
                    miniGoalNextAlert += miniGoalAlertInterval
                    edit.putInt("prefMiniGoalNextAlert", miniGoalNextAlert)
                    edit.apply()
                }
            }
            // mini goal not yet achieved (or user has chosen announcing to continue), announce mini goal progress at user selected interval
            else if ((stepCount >= miniGoalNextAlert) && miniGoalAlertInterval > 0) {
                // update shared preferences to save the next alert steps
                val edit: SharedPreferences.Editor = paseoPrefs.edit()
                speakOut("$miniGoalNextAlert steps!")
                // set the next step count for an announcement
                miniGoalNextAlert += miniGoalAlertInterval
                edit.putInt("prefMiniGoalNextAlert", miniGoalNextAlert)
                edit.apply()
            }
        }
    }

    // use text to speech to "speak" some text
    private fun speakOut(theText: String) {
        val paseoPrefs = this.getSharedPreferences("ca.chancehorizon.paseo_preferences", 0)
        val ttsPitch = paseoPrefs!!.getFloat("prefVoicePitch", 100F)
        val ttsRate = paseoPrefs.getFloat("prefVoiceRate", 100F)
        // set the voice to use to speak with
        val ttsVoice = paseoPrefs.getString("prefVoiceLanguage", "en_US - en-US-language")
        val ttsLocale1 = ttsVoice!!.substring(0, 2)
        val ttsLocale2 = ttsVoice.substring(3)
        val voiceObj = Voice(ttsVoice, Locale(ttsLocale1, ttsLocale2), 1, 1, false, null)
        tts?.voice = voiceObj
        tts?.setPitch(ttsPitch / 100)
        tts?.setSpeechRate(ttsRate / 100)
        val ttsResult = tts?.speak(theText, QUEUE_FLUSH, null, "")
        if (ttsResult == -1) {
            tts = TextToSpeech(this, this)
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

    // update the number of steps shown in Paseo's widget
    @Suppress("EmptyMethod")
    private fun updatePaseoWidget() {
    }

    private fun unregisterAlarmBroadcast() {
        midnightAlarmManager?.cancel(myPendingIntent)
        baseContext.unregisterReceiver(myBroadcastReceiver)
    }

    // update the number of steps shown in Paseo's notification
    @Suppress("EmptyMethod")
    private fun updatePaseoNotification() {
    }

    // *** used for detecting steps with an accelerometer sensor (on devices that do not have a step sensor)
    private fun lowPassFilter(input: FloatArray?, prev: FloatArray?): FloatArray? {
        val alpha = 0.1f
        if (input == null || prev == null) {
            return null
        }
        for (i in input.indices) {
            prev[i] = prev[i] + alpha * (input[i] - prev[i])
        }
        return prev
    }

    // insert or update a steps record in the Move database
    private fun addSteps(
        date: Int = 0,
        time: Int = 0,
        startSteps: Int = 0,
        endSteps: Int = 0,
        update: Boolean = false,
    ) {
        // update the end-steps for the current hour
        if (update) {
            paseoDBHelper.updateEndSteps(
                StepsModel(
                    0,
                    date = date,
                    hour = time,
                    startSteps = startSteps,
                    endSteps = endSteps,
                ),
            )
        } else {
            paseoDBHelper.insertSteps(
                StepsModel(
                    0,
                    date = date,
                    hour = time,
                    startSteps = startSteps,
                    endSteps = endSteps,
                ),
            )
        }
        latestDay = date
    }

    /**
     * Called to signal the completion of the TextToSpeech engine initialization.
     *
     * @param status [TextToSpeech.SUCCESS] or [TextToSpeech.ERROR].
     */
    override fun onInit(status: Int) {
        val paseoPrefs = this.getSharedPreferences("ca.chancehorizon.paseo_preferences", 0)
        // set up the text to speech voice
        ttsAvailable = if (status == SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result == LANG_MISSING_DATA ||
                result == LANG_NOT_SUPPORTED
            ) {
                Log.e("TTS", "Language not supported")
            }
            true
        } else {
            Log.e("TTS", "Initialization failed")
            false
        }
        // update shared preferences to not show first run dialog again
        val edit: SharedPreferences.Editor = paseoPrefs!!.edit()
        edit.putBoolean("prefTTSAvailable", ttsAvailable)
        edit.apply()
        // make sure that Paseo's widget and notification have up to date steps shown
        updatePaseoWidget()
        updatePaseoNotification()
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
        val paseoPrefs = this.getSharedPreferences("ca.chancehorizon.paseo_preferences", 0)
        val restartService = paseoPrefs!!.getBoolean("prefRestartService", true)
        // turn off auto start service
        if (restartService) {
            val broadcastIntent = Intent()
            broadcastIntent.action = "restart" + "service"
            broadcastIntent.setClass(this, ReStarter::class.java)
            this.sendBroadcast(broadcastIntent)
        }
        // Shutdown TTS
        if (tts != null) {
            tts!!.stop()
            tts!!.shutdown()
        }
        sensorManager?.unregisterListener(this)
        unregisterAlarmBroadcast()
        super.onDestroy()
    }

    companion object {
        private const val STEP_DETECTED = 1
        private const val NO_STEP_DETECTED = 0
        private var LAST_DETECTION = this.NO_STEP_DETECTED
    }
}