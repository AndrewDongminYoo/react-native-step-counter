package com.stepcounter

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.SensorListenService
import com.stepcounter.services.StepCounterService
import com.stepcounter.utils.AndroidVersionHelper
import com.stepcounter.utils.SerializeHelper

@SuppressLint("ObsoleteSdkInt")
@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(context: ReactApplicationContext) :
    NativeStepCounterSpec(context) {
    companion object {
        const val NAME: String = "RNStepCounter"
        val TAG_NAME: String = StepCounterModule::class.java.name
        const val CONTEXT = "com.stepcounter.StepCounterModule.appContext"
    }
    private val appContext: ReactApplicationContext = context
    private val reactContextMap = SerializeHelper.serialize(appContext)
    private var currentSteps: Double = 0.0
    private var stepService: SensorListenService
    private var serviceIntent: Intent
//    private var stepCounterCallback: Callback? = null

    override fun initialize() {
        super.initialize()
        if (SDK_INT >= VERSION_CODES.LOLLIPOP) {
            stepService = StepCounterService()
            serviceIntent = Intent(appContext, StepCounterService::class.java)
        } else {
            stepService = AccelerometerService()
            serviceIntent = Intent(appContext, AccelerometerService::class.java)
        }
        serviceIntent.putExtra(CONTEXT, reactContextMap)
    }

    override fun invalidate() {
        stepService.stopSelf()
        super.invalidate()
    }

    override fun isStepCountingSupported(): Boolean {
        Log.d(TAG_NAME, "step_counter supported? ${SDK_INT >= VERSION_CODES.KITKAT}")
        Log.d(TAG_NAME, "accelerometer supported? ${SDK_INT >= VERSION_CODES.ECLAIR}")
        val enabled = AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
        Log.d(TAG_NAME, "hardware_step_counter enabled? $enabled")
        return true
    }

    override fun startStepCounterUpdate(from: Double): Boolean {
        Log.d(TAG_NAME, "startStepCounterUpdate from $from")
        Log.d(TAG_NAME, "startStepCounterUpdate step $currentSteps")
        stepService.startDate = from.toLong()
        stepService.startService(serviceIntent)
        return true
    }

    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepService.stopSelf()
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

    fun onListenerUpdated(stepsParamsMap: WritableMap) {
        Log.d(SensorListenService.TAG_NAME, "sendStepCounterUpdateEvent: $currentSteps")
        try {
            appContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("stepCounterUpdate", stepsParamsMap)
        } catch (e: RuntimeException) {
            Log.e(SensorListenService.TAG_NAME, "sendStepCounterUpdateEvent: ", e)
        }
    }
}