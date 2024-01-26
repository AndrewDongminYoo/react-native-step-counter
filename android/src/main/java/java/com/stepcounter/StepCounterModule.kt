package com.stepcounter

import android.content.Context
import android.hardware.SensorManager
import android.location.LocationManager
import android.util.Log
import androidx.core.content.PermissionChecker.PERMISSION_GRANTED
import androidx.core.content.PermissionChecker.checkSelfPermission
import com.facebook.react.bridge.*
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.SensorListenService
import com.stepcounter.services.StepCounterService
import com.stepcounter.utils.AndroidVersionHelper
import com.stepcounter.utils.SettingsUtil
import com.stepcounter.utils.GetLocation

class StepCounterModule internal constructor(context: ReactApplicationContext) :
    StepCounterSpec(context) {
    companion object {

        const val NAME: String = "StepCounter"
        private val TAG_NAME: String = StepCounterModule::class.java.name
        private const val STEP_COUNTER = "android.permission.ACTIVITY_RECOGNITION"
    }
    private var locationManager: LocationManager? = null
    private var getLocation: GetLocation? = null

    private val appContext: ReactApplicationContext = context
    private lateinit var sensorManager: SensorManager
    private val stepsOK: Boolean
        get() = checkSelfPermission(appContext, STEP_COUNTER) == PERMISSION_GRANTED
    private val accelOK: Boolean
        get() = AndroidVersionHelper.isHardwareAccelerometerEnabled(appContext)
    private val supported: Boolean
        get() = AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
    private val walkingStatus: Boolean
        get() = stepCounterListener !== null

    private var stepCounterListener: SensorListenService? = null

    init {
        locationManager = context.applicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        sensorManager = context.getSystemService(
            Context.SENSOR_SERVICE
        ) as SensorManager
        stepCounterListener = if (stepsOK) {
            StepCounterService(this, sensorManager)
        } else {
            AccelerometerService(this, sensorManager)
        }
        appContext.addLifecycleEventListener(stepCounterListener)
    }
    @ReactMethod
    override fun isStepCountingSupported(promise: Promise) {
        Log.d(TAG_NAME, "hardware_step_counter? $supported")
        Log.d(TAG_NAME, "step_counter granted? $stepsOK")
        Log.d(TAG_NAME, "accelerometer granted? $accelOK")
        sendDeviceEvent("stepDetected", walkingStatus)
        promise.resolve(
            Arguments.createMap().apply {
                putBoolean("supported", supported)
                putBoolean("granted", stepsOK || accelOK)
                putBoolean("working", walkingStatus)
            }
        )
    }

    @ReactMethod
    override fun startStepCounterUpdate(from: Double) {
        stepCounterListener = stepCounterListener ?: if (stepsOK) {
            StepCounterService(this, sensorManager)
        } else {
            AccelerometerService(this, sensorManager)
        }
        Log.d(TAG_NAME, "startStepCounterUpdate")
        stepCounterListener!!.startService()
    }

    @ReactMethod
    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepCounterListener!!.stopService()
    }

    @ReactMethod
    override fun addListener(eventName: String) {}


    @ReactMethod
    override fun removeListeners(count: Double){}

   @ReactMethod
   override fun getStepCountDataBetweenDates(from: Double, to:Double){}

    @ReactMethod
    fun openWifiSettings(promise: Promise) {
        try {
            SettingsUtil.openWifiSettings(appContext)
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }

    @ReactMethod
    fun openCelularSettings(promise: Promise) {
        try {
            SettingsUtil.openCelularSettings(appContext)
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }
    @ReactMethod
    fun openGpsSettings(promise: Promise) {
        try {
            SettingsUtil.openGpsSettings(appContext)
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }

    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            SettingsUtil.openAppSettings(appContext)
            promise.resolve(null)
        } catch (ex: Throwable) {
            promise.reject(ex)
        }
    }

    fun getCurrentPosition(options: ReadableMap?, promise: Promise) {
        getLocation?.cancel()
        getLocation = GetLocation(locationManager)
        getLocation?.get(options, promise)
    }

     override fun getName(): String = NAME


    fun sendDeviceEvent(eventType: String, eventPayload: Any) {
        try {
            appContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("$NAME.$eventType", eventPayload)
        } catch (e: RuntimeException) {
            e.message?.let { Log.e(TAG_NAME, it) }
            Log.e(TAG_NAME, eventType, e)
        }
    }
}
