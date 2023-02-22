package com.stepcounter

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.SensorManager
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.util.Log
import androidx.core.content.PermissionChecker.PERMISSION_GRANTED
import androidx.core.content.PermissionChecker.checkSelfPermission
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.SensorListenService
import com.stepcounter.services.StepCounterService
import com.stepcounter.utils.AndroidVersionHelper

@SuppressLint("ObsoleteSdkInt")
class StepCounterModule(context: ReactApplicationContext) :
    NativeStepCounterSpec(context) {
    companion object {
        const val NAME: String = "RNStepCounter"
        private val TAG_NAME: String = StepCounterModule::class.java.name
        private const val STEP_COUNTER = "android.permission.ACTIVITY_RECOGNITION"
        private const val ACCELEROMETER = "android.permission.BODY_SENSORS"
        private const val GRANTED = "granted"
        private const val DENIED = "denied"
    }

    private val appContext: ReactApplicationContext = context
    private var sensorManager: SensorManager
    private var stepsParamsMap: WritableMap = Arguments.createMap()
    private var featureStatus: String
    private lateinit var stepService: SensorListenService

    init {
        sensorManager = context.getSystemService(
            Context.SENSOR_SERVICE
        ) as SensorManager
        checkSelfPermission(context, STEP_COUNTER)
        val service = getStepCounterListener()
        if (service != null) {
            featureStatus = GRANTED
            stepService = service
        } else {
            featureStatus = DENIED
            this.invalidate()
        }
    }

    private fun getStepCounterListener(
        permission: String = STEP_COUNTER,
        permissionTag: String = "Step Counter"
    ): SensorListenService? {
        return if (checkSelfPermission(appContext, permission) == PERMISSION_GRANTED) {
            Log.d(TAG_NAME, "$permissionTag permission granted")
            StepCounterService(this, sensorManager)
        } else {
            Log.d(TAG_NAME, "$permissionTag permission denied")
            if (checkSelfPermission(appContext, ACCELEROMETER) == PERMISSION_GRANTED) {
                Log.d(TAG_NAME, "$permissionTag permission granted")
                AccelerometerService(this, sensorManager)
            } else {
                Log.d(TAG_NAME, "$permissionTag permission denied")
                null
            }
        }
    }

    override fun isStepCountingSupported(): Boolean {
        Log.d(TAG_NAME, "step_counter supported? ${SDK_INT >= VERSION_CODES.KITKAT}")
        Log.d(TAG_NAME, "step_detector supported? ${SDK_INT >= VERSION_CODES.KITKAT}")
        Log.d(TAG_NAME, "accelerometer supported? ${SDK_INT >= VERSION_CODES.ECLAIR}")
        val enabled = AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
        Log.d(TAG_NAME, "hardware_step_counter enabled? $enabled")
        return true
    }

    override fun startStepCounterUpdate(from: Double): Boolean {
        Log.d(TAG_NAME, "startStepCounterUpdate")
        stepService.startService()
        return true
    }

    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepService.stopService()
    }
    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepCounterUpdate".
     */
    override fun addListener(eventName: String) {}

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    override fun removeListeners(count: Double) {}
    override fun getName(): String = NAME

    fun onStepDetected(stepsParamsMap: WritableMap) {
        Log.d(TAG_NAME, "sendStepCounterUpdateEvent: $stepsParamsMap")
        this.stepsParamsMap = stepsParamsMap
        try {
            appContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("stepCounterUpdate", stepsParamsMap)
        } catch (e: RuntimeException) {
            Log.e(TAG_NAME, "sendStepCounterUpdateEvent: ", e)
        }
    }
}