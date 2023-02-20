package com.stepcounter

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.SensorListenService
import com.stepcounter.services.StepCounterService
import com.stepcounter.utils.AndroidVersionHelper

@SuppressLint("ObsoleteSdkInt")
@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(context: ReactApplicationContext) :
    NativeStepCounterSpec(context) {
    companion object {
        const val NAME: String = "RNStepCounter"
        val TAG_NAME: String = StepCounterModule::class.java.name
    }
    private val appContext: ReactApplicationContext = context
    private var currentSteps: Double = 0.0
    private var stepService: SensorListenService? = null
    private val serviceIntent = Intent(appContext, SensorListenService::class.java)

    override fun initialize() {
        super.initialize()
        stepService = if (SDK_INT >= VERSION_CODES.LOLLIPOP) {
            StepCounterService()
        } else AccelerometerService()
        stepService!!.setContext(appContext)
    }
    override fun isStepCountingSupported(): Boolean {
        Log.d(TAG_NAME, "step_counter supported? ${SDK_INT >= VERSION_CODES.KITKAT}")
        Log.d(TAG_NAME, "accelerometer supported? ${SDK_INT >= VERSION_CODES.ECLAIR}")
        return AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
    }

    override fun startStepCounterUpdate(from: Double): Boolean {
        Log.d(TAG_NAME, "startStepCounterUpdate from $from")
        Log.d(TAG_NAME, "startStepCounterUpdate step $currentSteps")
        appContext.startService(serviceIntent)
        return stepService != null
    }

    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepService!!.stopService(serviceIntent)
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
}