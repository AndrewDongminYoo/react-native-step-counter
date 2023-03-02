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
import java.util.*

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
@SuppressLint("ObsoleteSdkInt")
class StepCounterModule(context: ReactApplicationContext) :
    StepCounterSpec(context) {
    companion object {
        const val NAME: String = "RNStepCounter"
        const val eventName: String = "StepCounter.stepCounterUpdate"
        private val TAG_NAME: String = StepCounterModule::class.java.name
        private const val STEP_COUNTER = "android.permission.ACTIVITY_RECOGNITION"
        private const val BG_BODY_SENSOR = "android.permission.BODY_SENSORS_BACKGROUND"
    }

    private val appContext: ReactApplicationContext = context
    private var sensorManager: SensorManager
    private var supported = AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
    private val stepsOK: Boolean
        get() = checkSelfPermission(appContext, STEP_COUNTER) == PERMISSION_GRANTED
    private val accelOK: Boolean
        get() = checkSelfPermission(appContext, BG_BODY_SENSOR) == PERMISSION_GRANTED

    /**
     * gets the step counter listener
     * @return the step counter listener
     * @see SensorListenService
     * @see StepCounterService
     * @see AccelerometerService
     * @see checkSelfPermission
     * @see PERMISSION_GRANTED
     */
    private var stepCounterListener: SensorListenService

    /**
     * The method that is called when the module is initialized.
     * It checks the permission and the availability for the step counter sensor and initializes the step counter service.
     */
    init {
        sensorManager = context.getSystemService(
            Context.SENSOR_SERVICE
        ) as SensorManager
        var permissionTag = "Step Counter"
        stepCounterListener = if (stepsOK) {
            Log.d(TAG_NAME, "$permissionTag permission granted")
            StepCounterService(this, sensorManager, null)
        } else {
            Log.d(TAG_NAME, "$permissionTag permission denied")
            permissionTag = "Accelerometer in Background"
            if (accelOK) {
                Log.d(TAG_NAME, "$permissionTag permission granted")
                AccelerometerService(this, sensorManager, null)
            } else {
                Log.d(TAG_NAME, "$permissionTag permission denied")
                AccelerometerService(this, sensorManager, null)
            }
        }
    }

    /**
     * The method ask if the step counter sensor is supported.
     * @param promise the promise that is used to return the result to the react-native code
     * @see Promise.resolve
     * @see VERSION_CODES.ECLAIR
     * @see VERSION_CODES.KITKAT
     * @see WritableMap
     */
    override fun isStepCountingSupported(promise: Promise) {
        Log.d(TAG_NAME, "step_counter exists? ${SDK_INT >= VERSION_CODES.KITKAT}")
        Log.d(TAG_NAME, "accelerometer exists? ${SDK_INT >= VERSION_CODES.ECLAIR}")
        Log.d(TAG_NAME, "hardware_step_counter? $supported")
        Log.d(TAG_NAME, "step_counter granted? $stepsOK")
        Log.d(TAG_NAME, "accelerometer granted? $accelOK")
        promise.resolve(
            Arguments.createMap().apply {
                putBoolean("supported", supported)
                putBoolean("granted", stepsOK || accelOK)
            }
        )
    }

    /**
     * Start the step counter sensor.
     * @param from the number of steps to start from
     * @return true if the step counter sensor is started, usually return true.
     */
    override fun startStepCounterUpdate(from: Double): Boolean {
        Log.d(TAG_NAME, "startStepCounterUpdate")
        stepCounterListener.startService()
        return true
    }

    /**
     * Stop the step counter sensor.
     * @return Nothing.
     */
    override fun stopStepCounterUpdate() {
        Log.d(TAG_NAME, "stopStepCounterUpdate")
        stepCounterListener.stopService()
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

    /**
     * StepCounterPackage requires this property for the module.
     * @return the name of the module. usually "RNStepCounter".
     */
    override fun getName(): String = NAME

    /**
     * Send the step counter update event to the react-native code.
     * @param paramsMap the map that contains the parameters for the steps
     * @return Nothing.
     * @see WritableMap
     * @see RCTDeviceEventEmitter
     * @see com.facebook.react.modules.core.DeviceEventManagerModule
     * @throws RuntimeException if the event emitter is not initialized.
     */
    fun onStepDetected(paramsMap: WritableMap) {
        Log.d(TAG_NAME, "$eventName: $paramsMap")
        try {
            appContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, paramsMap)
        } catch (e: RuntimeException) {
            Log.e(TAG_NAME, eventName, e)
        }
    }
}