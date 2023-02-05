package com.stepcounter

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.os.Process
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.stepcounter.step.services.StepCounterService
import com.stepcounter.step.utils.PaseoDBHelper

@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(applicationContext: ReactApplicationContext?) :
    NativeStepCounterSpec(applicationContext) {

    companion object {
        const val NAME = "RNStepCounter"
        const val STOPPED = 0
        const val STARTING = 1
        const val RUNNING = 2
        const val ERROR_FAILED_TO_START = 3
        const val ERROR_NO_SENSOR_FOUND = 4
        const val STEP_IN_METERS = 0.762f
    }

    private val reactContext = applicationContext
    private var status = STOPPED
    private val stepCounterService: StepCounterService = StepCounterService()

    @RequiresApi(Build.VERSION_CODES.Q)
    private val healthPermissionKey = Manifest.permission.ACTIVITY_RECOGNITION
    private val writeDataPermission = Manifest.permission.WRITE_EXTERNAL_STORAGE

    // point to the Paseo database that stores all the daily steps data
    private var dbHelper: PaseoDBHelper = PaseoDBHelper(this.reactApplicationContext)
    private var sensorManager: SensorManager? = null
    private var stepCounter: Sensor? = null
    private var accelerometer: Sensor? = null

    private var startSteps = 0
    private var lastStepDate = 0

    override fun getTypedExportedConstants(): Map<String, Any> {
        return mutableMapOf(Pair("platform", "android"))
    }

    override fun isStepCountingSupported(): Boolean {
        stepCounter = this.sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelerometer = this.sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        return if (accelerometer != null || stepCounter != null) {
            this.status = STARTING
            true
        } else {
            this.status = ERROR_NO_SENSOR_FOUND
            false
        }
    }

    override fun isWritingStepsSupported(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            (
                reactContext?.checkPermission(healthPermissionKey, Process.myPid(), Process.myUid()) ==
                    PackageManager.PERMISSION_GRANTED
                )
        } else {
            (
                reactContext?.checkPermission(writeDataPermission, Process.myPid(), Process.myUid()) ==
                    PackageManager.PERMISSION_GRANTED
                )
        }
    }

    override fun startStepCounterUpdate(from: Double, promise: Promise?) {
        TODO("Not yet implemented")
    }

    override fun stopStepCounterUpdate() {
        TODO("Not yet implemented")
    }

    override fun queryStepCounterDataBetweenDates(
        startDate: Double,
        endDate: Double,
        promise: Promise?,
    ) {
        TODO("Not yet implemented")
    }

    override fun requestPermission(promise: Promise?) {
        TODO("Not yet implemented")
    }

    override fun checkPermission(): String? {
        TODO("Not yet implemented")
    }

    override fun getName(): String {
        return NAME
    }

    override fun initialize() {
        sensorManager = stepCounterService.sensorManager
        try {
            // set up the manager for the step counting service
            reactContext?.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            // get the date of the last record from the steps table in the database
            lastStepDate = dbHelper.readLastStepsDate()
            // get the start steps of the last record from the steps table in the database
            startSteps = dbHelper.readLastStartSteps()
            // do not start the step counting service if it is already running
            if (!stepCounterService.running) {
                val service = Intent(reactContext, StepCounterService::class.java)
                reactContext.startService(service)
            }
            status = RUNNING
        } catch (_: Exception) {
            status = ERROR_FAILED_TO_START
        }
    }

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {}

    override fun invalidate() {}
}