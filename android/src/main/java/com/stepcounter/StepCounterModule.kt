package com.stepcounter

import android.Manifest.permission.*
import android.content.Context
import android.content.Intent
import android.hardware.SensorManager
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.services.PermissionService
import com.stepcounter.services.StepCounterService

@Suppress("unused")
class StepCounterModule(reactContext: ReactApplicationContext) :
//    NativeStepCounterSpec(reactContext) {
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

    private val bodySensorPermission = BODY_SENSORS
    private val activityRecogPermission =
        if (SDK_INT >= VERSION_CODES.Q) ACTIVITY_RECOGNITION else ""
    private val highRateSensorPermission =
        if (SDK_INT >= VERSION_CODES.S) HIGH_SAMPLING_RATE_SENSORS else ""
    private val backgroundSensorPermission =
        if (SDK_INT >= VERSION_CODES.TIRAMISU) BODY_SENSORS_BACKGROUND else ""

    private var sensorManager: SensorManager? = null
    private var startAt = 0
    private var numSteps = 0f

    private val permissionArray: ReadableArray
        get() {
            val array = Arguments.createArray()
            array.pushString(bodySensorPermission)
            array.pushString(activityRecogPermission)
            array.pushString(highRateSensorPermission)
            array.pushString(backgroundSensorPermission)
            return array
        }

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
        permissionService.requestMultiplePermissions(
            permissionArray,
            promise,
        )
    }

    fun checkPermission(): String {
        return permissionService.checkPermission(bodySensorPermission)
    }

    val typedExportedConstants: Map<String, Any>
        get() = super.getConstants() ?: HashMap()

    val isStepCountingSupported: Boolean
        get() = stepCounterService.isStepCountingAvailable()

    val isWritingStepsSupported: Boolean
        get() = permissionService
            .checkPermission(WRITE_EXTERNAL_STORAGE)
            .equals("granted", true)

    fun startStepCounterUpdate(from: Double, promise: Promise?) {
        try {
            numSteps++
            stepCounterService.startStepCounterUpdatesFromDate(from.toInt())
            stepsParamsMap.putInt("startDate", from.toInt())
            sendStepCounterUpdateEvent(stepsParamsMap)
            promise?.resolve(stepsParamsMap)
            status = RUNNING
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopStepCounterUpdate() {
        stepCounterService.stopStepCounterUpdates()
        status = STOPPED
    }

    fun queryStepCounterDataBetweenDates(
        startDate: Double,
        endDate: Double,
        promise: Promise?,
    ) {
        val stepParams: WritableMap = stepsParamsMap.copy()
        stepParams.putInt("startDate", startDate.toInt())
        stepParams.putInt("endDate", endDate.toInt())
        sendStepCounterUpdateEvent(stepParams)
        try {
            promise?.resolve(stepParams)
        } catch (e: Exception) {
            promise?.reject(e)
        }
    }

    private fun sendStepCounterUpdateEvent(params: WritableMap?) {
        applicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("stepCounterDataDidUpdate", params)
    }

    override fun getName(): String {
        return NAME
    }

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    override fun invalidate() {}

    init {
        sensorManager = stepCounterService.sensorManager
        StepCounterService.setContext(this.applicationContext)
        status = try {
            // do not start the step counting service if it is already running
            if (!stepCounterService.isServiceRunning) {
                val service = Intent(reactContext, StepCounterService::class.java)
                applicationContext.startService(service)
                stepCounterService.startService(service)
                STARTING
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