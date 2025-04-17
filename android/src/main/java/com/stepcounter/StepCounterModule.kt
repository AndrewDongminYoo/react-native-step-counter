package com.stepcounter

import android.content.Context
import android.hardware.SensorManager
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

/**
 * This class is the native module for the react-native-step-counter package.
 *
 * It is responsible for the communication between the native and the react-native code.
 * @param context The context of the react-native application
 * @property appContext The context of the react-native application from [context][com.facebook.react.bridge.ReactApplicationContext]
 * @property sensorManager The sensor manager that is responsible for the sensor
 * @property stepCounterListener The service that is responsible for the step counter sensor
 * @constructor Creates a new StepCounterModule implements StepCounterSpec
 * @see ReactContextBaseJavaModule
 * @see ReactApplicationContext
 * @see StepCounterSpec
 */
class StepCounterModule internal constructor(context: ReactApplicationContext) :
    StepCounterSpec(context) {
    companion object {
        const val NAME: String = "StepCounter"
        private val TAG_NAME: String = StepCounterModule::class.java.name
        private const val STEP_COUNTER = "android.permission.ACTIVITY_RECOGNITION"
    }

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

    /**
     * gets the step counter listener
     * @return the step counter listener
     * @see SensorListenService
     * @see StepCounterService
     * @see AccelerometerService
     * @see checkSelfPermission
     * @see PERMISSION_GRANTED
     */
    private var stepCounterListener: SensorListenService? = null

    /**
     * The method that is called when the module is initialized.
     * It checks the permission and the availability for the step counter sensor and initializes the step counter service.
     */
    init {
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

    /**
     * The method ask if the step counter sensor is supported.
     * @param promise the promise that is used to return the result to the react-native code
     * @see Promise.resolve
     * @see VERSION_CODES.ECLAIR
     * @see VERSION_CODES.KITKAT
     * @see WritableMap
     */
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

    /**
     * Start the step counter sensor.
     * @param from the number of steps to start from
     */
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

    /**
     * Stop the step counter sensor.
     * @return Nothing.
     */
    @ReactMethod
    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepCounterListener!!.stopService()
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepCounterUpdate".
     */
    @ReactMethod
    override fun addListener(eventName: String) {}

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    @ReactMethod
    override fun removeListeners(count: Double) {}

    /**
     * StepCounterPackage requires this property for the module.
     * @return the name of the module. usually "StepCounter".
     */
    override fun getName(): String = NAME

    /**
     * Send the step counter update event to the react-native code.
     * @param eventPayload the object that contains information about the step counter update.
     * @return Nothing.
     * @see WritableMap
     * @see RCTDeviceEventEmitter
     * @see com.facebook.react.modules.core.DeviceEventManagerModule
     * @throws RuntimeException if the event emitter is not initialized.
     */
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