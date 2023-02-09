package com.stepcounter

import android.Manifest.permission.*
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.stepcounter.services.PermissionService
import com.stepcounter.services.StepCounterService

@Suppress("unused")
@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(reactContext: ReactApplicationContext) :
//    NativeStepCounterSpec(reactContext) {
    ReactContextBaseJavaModule(reactContext), ReactModuleWithSpec, TurboModule {
    companion object {
        const val NAME = "RNStepCounter"
        const val STOPPED = 0
        const val STARTING = 1
        const val RUNNING = 2
        const val ERROR_FAILED_TO_START = 3
    }

    private var applicationContext = reactContext
    private var stepCounterService = StepCounterService(reactContext)
    private var permissionService = PermissionService(reactContext)
    private var status = STOPPED

    fun isStepCountingSupported(): Boolean {
        permissionService.requestMultiplePermissions(
            permissionService.permissionArray,
        )
        return stepCounterService.isStepCountingAvailable()
    }

    fun startStepCounterUpdate(from: Double) {
        try {
            stepCounterService.startStepCounterUpdatesFromDate(from.toInt())
            status = RUNNING
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopStepCounterUpdate() {
        stepCounterService.stopStepCounterUpdates()
        status = STOPPED
    }

    override fun getName(): String {
        return NAME
    }

    override fun invalidate() {}

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    init {
        applicationContext = reactContext
        permissionService.checkMultiplePermissions(
            permissionService.permissionArray,
        )
        status = try {
            // do not start the step counting service if it is already running
            val service = Intent(reactContext, StepCounterService::class.java)
            applicationContext.startService(service)
            STARTING
        } catch (_: Exception) {
            ERROR_FAILED_TO_START
        }
    }
}