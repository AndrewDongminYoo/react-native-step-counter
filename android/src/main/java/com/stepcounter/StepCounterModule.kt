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
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.step.services.PermissionService
import com.stepcounter.step.services.StepCounterService
import com.stepcounter.step.utils.PaseoDBHelper

@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ReactModuleWithSpec, TurboModule {

    companion object {
        const val NAME = "RNStepCounter"
        const val STOPPED = 0
        const val STARTING = 1
        const val RUNNING = 2
        const val ERROR_FAILED_TO_START = 3
        const val ERROR_NO_SENSOR_FOUND = 4
        const val STEP_IN_METERS = 0.762f
    }

    private val applicationContext = reactContext
    private val stepCounterService: StepCounterService = StepCounterService()
    private val permissionService: PermissionService = PermissionService()

    @RequiresApi(Build.VERSION_CODES.Q)
    private val healthPermissionKey = Manifest.permission.ACTIVITY_RECOGNITION
    private val writeDataPermission = Manifest.permission.WRITE_EXTERNAL_STORAGE

    // point to the Paseo database that stores all the daily steps data
    private var dbHelper: PaseoDBHelper = PaseoDBHelper(reactContext)
    private var sensorManager: SensorManager? = null
    private var stepCounter: Sensor? = null
    private var accelerometer: Sensor? = null

    private var startSteps = 0f
    private var lastStepDate = 0f
    private var startAt = 0
    private var numSteps = 0f
    private var status = STOPPED

    private val stepsParamsMap: WritableMap
        get() {
            val map = Arguments.createMap()
            // pedometerData.startDate; -> ms since UTC
            // pedometerData.endDate; -> ms since UTC
            // pedometerData.numberOfSteps;
            // pedometerData.distance;
            // pedometerData.floorsAscended;
            // pedometerData.floorsDescended;
            map.putInt("startDate", startAt)
            map.putInt("endDate", System.currentTimeMillis().toInt())
            map.putDouble("numberOfSteps", numSteps.toDouble())
            map.putDouble("distance", (numSteps * STEP_IN_METERS).toDouble())
            return map
        }

    fun isStepCountingSupported(): Boolean {
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

    fun requestPermission(promise: Promise) {
        currentActivity?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                permissionService.requestPermission(
                    healthPermissionKey,
                    it,
                    promise,
                )
            }
        }
    }

    fun checkPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            (
                applicationContext.checkPermission(
                    healthPermissionKey,
                    Process.myPid(),
                    Process.myUid(),
                ) == PackageManager.PERMISSION_GRANTED
                )
        } else {
            (
                applicationContext.checkPermission(
                    writeDataPermission,
                    Process.myPid(),
                    Process.myUid(),
                ) == PackageManager.PERMISSION_GRANTED
                )
        }
    }

    fun startStepCounterUpdate(from: Int, promise: Promise) {
        val service = Intent(applicationContext, StepCounterService::class.java)
        stepCounterService.startService(service)
        promise.resolve(dbHelper.getDaysSteps(from))
    }

    fun stopStepCounterUpdate() {
        val service = Intent(applicationContext, StepCounterService::class.java)
        stepCounterService.stopService(service)
    }

    fun queryStepCounterDataBetweenDates(
        startDate: Int,
        endDate: Int,
        promise: Promise,
    ) {
        val stepParams: WritableMap = stepsParamsMap.copy()
        stepParams.putInt("startDate", startDate)
        stepParams.putInt("endDate", endDate)
        promise.resolve(stepParams)
    }

//    private fun sendPedometerUpdateEvent(params: WritableMap?) {
//        applicationContext
//            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
//            .emit("pedometerDataDidUpdate", params)
//    }

    override fun getName(): String {
        return NAME
    }

    override fun initialize() {
        sensorManager = stepCounterService.sensorManager
        try {
            // set up the manager for the step counting service
            applicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            // get the date of the last record from the steps table in the database
            lastStepDate = dbHelper.readLastStepsDate().toFloat()
            // get the start steps of the last record from the steps table in the database
            startSteps = dbHelper.readLastStartSteps().toFloat()
            // do not start the step counting service if it is already running
            if (!stepCounterService.running) {
                val service = Intent(applicationContext, StepCounterService::class.java)
                applicationContext.startService(service)
            }
            status = RUNNING
        } catch (_: Exception) {
            status = ERROR_FAILED_TO_START
        }
    }

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    override fun invalidate() {}
}