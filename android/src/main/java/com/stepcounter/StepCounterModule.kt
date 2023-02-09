package com.stepcounter

import android.Manifest.permission.*
import android.content.Context
import android.content.Intent
import android.hardware.SensorManager
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
        const val STEP_IN_METERS = 0.762f
    }

    private var applicationContext = reactContext
    private var stepCounterService = StepCounterService(reactContext)
    private var permissionService = PermissionService(reactContext)
    private var status = STOPPED

    private var sensorManager: SensorManager? = null
    private var startAt = 0
    private var numSteps = 0f

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
            stepCounterService.startStepCounterUpdatesFromDate(from.toInt(), promise)
            status = RUNNING
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopStepCounterUpdate() {
        stepCounterService.stopStepCounterUpdates()
        status = STOPPED
    }

    fun requestMultiplePermissions(permissions: Array<String>?): WritableMap {
        return permissionService.requestMultiplePermissions(permissions)
    }

    fun checkMultiplePermissions(permissions: Array<String>?): WritableMap {
        return permissionService.checkMultiplePermissions(permissions)
    }

    fun openSettings(): Boolean {
        return permissionService.openSettings()
    }

    fun checkPermission(permission: String): String {
        return permissionService.checkPermission(permission)
    }

    fun requestPermission(permission: String): String {
        return permissionService.requestPermission(permission)
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
        status = try {
            // do not start the step counting service if it is already running
            if (!stepCounterService.isServiceRunning) {
                val service = Intent(reactContext, StepCounterService::class.java)
                applicationContext.startService(service)
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