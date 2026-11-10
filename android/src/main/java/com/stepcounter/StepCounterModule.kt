package com.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.os.Build.VERSION_CODES
import android.util.Log
import androidx.core.content.PermissionChecker.PERMISSION_GRANTED
import androidx.core.content.PermissionChecker.checkSelfPermission
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.SensorListenService
import com.stepcounter.services.StepCounterService

/**
 * This class is the native module for the react-native-step-counter package.
 *
 * It is responsible for the communication between the native and the react-native code.
 * @param reactContext The context of the react-native application
 * @property appContext The context of the react-native application from [context][com.facebook.react.bridge.ReactApplicationContext]
 * @property sensorManager The sensor manager that is responsible for the sensor
 * @property stepCounterListener The service that is responsible for the step counter sensor
 * @constructor Creates a new StepCounterModule implements StepCounterSpec
 * @see ReactContextBaseJavaModule
 * @see ReactApplicationContext
 * @see NativeStepCounterSpec
 */
class StepCounterModule(
  reactContext: ReactApplicationContext,
) : NativeStepCounterSpec(reactContext),
  LifecycleEventListener {
  companion object {
    const val NAME: String = NativeStepCounterSpec.NAME
    private val TAG_NAME: String = StepCounterModule::class.java.name
    private const val STEP_COUNTER = "android.permission.ACTIVITY_RECOGNITION"
  }

  private val appContext: ReactApplicationContext = reactContext
  private val sensorManager: SensorManager =
    reactContext.getSystemService(
      Context.SENSOR_SERVICE,
    ) as SensorManager
  private val stepsOK: Boolean
    get() =
      Build.VERSION.SDK_INT < VERSION_CODES.Q ||
        checkSelfPermission(appContext, STEP_COUNTER) == PERMISSION_GRANTED
  private val supported: Boolean
    get() =
      sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null ||
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
  private val walkingStatus: Boolean
    get() = stepCounterListener?.isRunning == true

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

  @Volatile
  private var invalidated = false

  /**
   * The method ask if the step counter sensor is supported.
   * @param promise the promise that is used to return the result to the react-native code
   * @see Promise.resolve
   * @see VERSION_CODES.ECLAIR
   * @see VERSION_CODES.KITKAT
   * @see WritableMap
   */
  @ReactMethod
  @Synchronized
  override fun isStepCountingSupported(promise: Promise) {
    val granted = stepsOK
    if (!granted) {
      stopStepCounterUpdate()
    }
    if (!invalidated) emitOnStepDetected(walkingStatus)
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("supported", supported)
        putBoolean("granted", granted)
        putBoolean("working", walkingStatus)
      },
    )
  }

  /**
   * Start the step counter sensor.
   * @param from the number of steps to start from
   */
  @ReactMethod
  @Synchronized
  override fun startStepCounterUpdate(from: Double) {
    if (invalidated) return
    val sessionStartMillis = normalizeStartTimestampToMillis(from)
    stopStepCounterUpdate()
    for (sensorType in listOf(Sensor.TYPE_STEP_COUNTER, Sensor.TYPE_ACCELEROMETER)) {
      // Apply the same consent policy to fallback, including a grant lost during registration.
      if (!stepsOK) break
      val service =
        if (sensorType == Sensor.TYPE_STEP_COUNTER) {
          StepCounterService(this, sensorManager)
        } else {
          AccelerometerService(this, sensorManager)
        }
      if (service.startService(sessionStartMillis)) {
        stepCounterListener = service
        appContext.addLifecycleEventListener(this)
        emitOnStepDetected(true)
        return
      }
    }
    Log.w(TAG_NAME, "No permitted sensor could be registered")
  }

  /**
   * Stop the step counter sensor.
   * @return Nothing.
   */
  @ReactMethod
  @Synchronized
  override fun stopStepCounterUpdate() {
    Log.d(TAG_NAME, "stopStepCounterUpdate")
    stepCounterListener?.let {
      it.stopService()
      appContext.removeLifecycleEventListener(this)
    }
    stepCounterListener = null
    if (!invalidated) emitOnStepDetected(false)
  }

  @Synchronized
  override fun invalidate() {
    invalidated = true
    stopStepCounterUpdate()
    super.invalidate()
  }

  override fun onHostResume() {
    // The session continues across activity resume.
  }

  override fun onHostPause() {
    // Activity pause alone does not release the active session.
  }

  override fun onHostDestroy() {
    stopStepCounterUpdate()
  }

  /**
   * StepCounterPackage requires this property for the module.
   * @return the name of the module. usually "StepCounter".
   */
  override fun getName(): String = NAME

  /** Generated transport; services retain their existing serialized callback boundary. */
  fun sendStepCounterUpdate(payload: WritableMap) {
    if (!invalidated) emitOnStepCounterUpdate(payload)
  }

  fun sendStepsSensorInfo(payload: WritableMap) {
    if (!invalidated) emitOnStepsSensorInfo(payload)
  }

  /**
   * JS passes ms; accept seconds too for backward-compat.
   */
  private fun normalizeStartTimestampToMillis(from: Double): Long {
    if (!from.isFinite() || from <= 0) {
      return System.currentTimeMillis()
    }
    return if (from >= 1_000_000_000_000.0) {
      from.toLong()
    } else {
      (from * 1000).toLong()
    }
  }
}
