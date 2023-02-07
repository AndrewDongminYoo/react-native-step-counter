package com.stepcounter

import android.Manifest
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.step.services.PermissionService
import com.stepcounter.step.services.StepCounterService

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

    private var applicationContext = reactContext
    private var stepCounterService = StepCounterService()
    private var permissionService = PermissionService(reactContext)
    private var status = STOPPED

    private val bodySensorPermission = Manifest.permission.BODY_SENSORS
    private val writeDataPermission = Manifest.permission.WRITE_EXTERNAL_STORAGE
    private val receiveBootCompleted = Manifest.permission.RECEIVE_BOOT_COMPLETED
    private val readExternalStorage = Manifest.permission.READ_EXTERNAL_STORAGE
    private val healthPermissionKey =
        if (SDK_INT >= VERSION_CODES.Q) Manifest.permission.ACTIVITY_RECOGNITION else ""
    private val foregroundService =
        if (SDK_INT >= VERSION_CODES.Q) Manifest.permission.FOREGROUND_SERVICE else ""
    private val accessMediaLocation =
        if (SDK_INT >= VERSION_CODES.Q) Manifest.permission.ACCESS_MEDIA_LOCATION else ""
    private val highRateSensorPermission =
        if (SDK_INT >= VERSION_CODES.S) Manifest.permission.HIGH_SAMPLING_RATE_SENSORS else ""
    private val backgroundSensorPermission =
        if (SDK_INT >= VERSION_CODES.TIRAMISU) Manifest.permission.BODY_SENSORS_BACKGROUND else ""

    private var sensorManager: SensorManager? = null
    private var stepCounter: Sensor? = null

    private var startAt = 0
    private var numSteps = 0f

    private val permissionArray = arrayOf(
        bodySensorPermission,
        writeDataPermission,
        receiveBootCompleted,
        readExternalStorage,
        foregroundService,
        accessMediaLocation,
        backgroundSensorPermission,
        highRateSensorPermission,
        healthPermissionKey,
    )

    private val stepsParamsMap: WritableMap
        get() {
            val map = Arguments.createMap()
            map.putInt("startDate", startAt) // UTC of startDate -> Int
            map.putInt("endDate", System.currentTimeMillis().toInt()) // UTC of startDate -> Int
            map.putDouble("numberOfSteps", numSteps.toDouble())
            map.putDouble("distance", (numSteps * STEP_IN_METERS).toDouble())
            return map
        }

    fun requestPermission(promise: Promise?) {
        if (promise == null) return
        permissionService.requestMultiplePermissions(
            permissionArray,
            promise,
        )
        permissionService.checkMultiplePermissions(
            permissionArray,
        )
    }

    fun checkPermission(): String {
        return permissionService.checkPermission(
            backgroundSensorPermission,
        )
    }

    @ReactMethod
    val isStepCountingSupported: Boolean
        get() = stepCountingSupported()

    @ReactMethod
    val isWritingStepsSupported: Boolean
        get() = checkPermission().equals(other = "granted", ignoreCase = true)

    private fun stepCountingSupported(): Boolean {
        stepCounter = try {
            this.sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        } catch (_: Exception) {
            this.sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }
        return if (stepCounter != null) {
            this.status = STARTING
            true
        } else {
            this.status = ERROR_NO_SENSOR_FOUND
            false
        }
    }

    @ReactMethod
    fun startStepCounterUpdate(from: Double, promise: Promise?) {
        try {
            numSteps++
            val stepParams: WritableMap = stepsParamsMap.copy()
            stepParams.putInt("startDate", from.toInt())
            sendPedometerUpdateEvent(stepParams)
            promise?.resolve(stepParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopStepCounterUpdate() {
        if (status != STOPPED) {
            sensorManager?.unregisterListener(stepCounterService)
        }
        status = STOPPED
    }

    @ReactMethod
    fun queryStepCounterDataBetweenDates(
        startDate: Double,
        endDate: Double,
        promise: Promise?,
    ) {
        val stepParams: WritableMap = stepsParamsMap.copy()
        stepParams.putInt("startDate", startDate.toInt())
        stepParams.putInt("endDate", endDate.toInt())
        applicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("queryPedometerDataBetweenDates", stepParams)
        try {
            promise?.resolve(stepsParamsMap)
        } catch (e: Exception) {
            promise?.reject(e)
        }
    }

    private fun sendPedometerUpdateEvent(params: WritableMap?) {
        applicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("pedometerDataDidUpdate", params)
    }

    override fun getName(): String {
        return NAME
    }

    override fun initialize() {
        super.initialize()
        StepCounterModule(reactApplicationContext)
    }

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    override fun invalidate() {}

    init {
        this.sensorManager = stepCounterService.sensorManager
        this.status = try {
            // do not start the step counting service if it is already running
            if (!stepCounterService.isServiceRunning) {
                val service = Intent(reactContext, StepCounterService::class.java)
                val componentName = applicationContext.startService(service)
                println(componentName?.className)
                stepCounterService.startService(service)
                sensorManager?.registerListener(
                    stepCounterService,
                    stepCounter,
                    SensorManager.SENSOR_DELAY_FASTEST,
                    SensorManager.SENSOR_DELAY_UI,
                )
            }
            // set up the manager for the step counting service
            if (sensorManager == null) {
                sensorManager =
                    applicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            }
            RUNNING
        } catch (_: Exception) {
            ERROR_FAILED_TO_START
        }
    }
}