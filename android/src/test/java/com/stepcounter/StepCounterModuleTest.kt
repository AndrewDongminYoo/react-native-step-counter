package com.stepcounter

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.util.Log
import androidx.core.content.PermissionChecker
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.stepcounter.services.AccelerometerService
import com.stepcounter.services.StepCounterService
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.RETURNS_DEFAULTS
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

class StepCounterModuleTest {
  private lateinit var fixture: AndroidSensorFixture

  @Before
  fun setUp() {
    fixture = AndroidSensorFixture()
  }

  @After
  fun tearDown() {
    if (::fixture.isInitialized) fixture.close()
  }

  @Test
  fun capabilityAndSelectionMatrixUsesCurrentSensorsAndPermission() {
    // Literal expectations: the permission boundary is API 29, and presence is not consent.
    val cases =
      listOf(
        SelectionCase(24, false, true, true, true, true, Sensor.TYPE_STEP_COUNTER),
        SelectionCase(28, false, true, true, true, true, Sensor.TYPE_STEP_COUNTER),
        SelectionCase(24, false, false, true, true, true, Sensor.TYPE_ACCELEROMETER),
        SelectionCase(28, false, false, true, true, true, Sensor.TYPE_ACCELEROMETER),
        SelectionCase(29, false, true, true, true, false, null),
        SelectionCase(36, false, true, true, true, false, null),
        SelectionCase(29, false, false, true, true, false, null),
        SelectionCase(36, true, true, true, true, true, Sensor.TYPE_STEP_COUNTER),
        SelectionCase(29, true, true, false, true, true, Sensor.TYPE_STEP_COUNTER),
        SelectionCase(29, true, false, true, true, true, Sensor.TYPE_ACCELEROMETER),
        SelectionCase(24, false, false, false, false, true, null),
        SelectionCase(28, false, false, false, false, true, null),
        SelectionCase(29, false, false, false, false, false, null),
        SelectionCase(36, true, false, false, false, true, null),
      )
    for (case in cases) {
      fixture.sdk = case.sdk
      fixture.granted = case.permission
      fixture.setSensors(case.step, case.accelerometer)
      val module = fixture.module()
      val before = fixture.capabilities(module)
      assertEquals(case.toString(), case.supported, before.getBoolean("supported"))
      assertEquals(case.toString(), case.allowed, before.getBoolean("granted"))
      assertFalse(case.toString(), before.getBoolean("working"))

      module.startStepCounterUpdate(1_700_000_000_000.0)
      assertEquals(
        case.toString(),
        case.selectedType,
        fixture.active.values
          .singleOrNull()
          ?.type,
      )
      assertEquals(case.toString(), case.selectedType != null, fixture.capabilities(module).getBoolean("working"))
      module.stopStepCounterUpdate()
      assertTrue(fixture.active.isEmpty())
      assertTrue(fixture.lifecycle.isEmpty())
      assertFalse(fixture.capabilities(module).getBoolean("working"))
    }
  }

  @Test
  fun featureFlagsWithoutSensorObjectsDoNotReportSupportOrCrash() {
    fixture.setSensors(false, false)
    val module = fixture.module()
    assertFalse(fixture.capabilities(module).getBoolean("supported"))
    module.startStepCounterUpdate(0.0)
    module.stopStepCounterUpdate()
    assertFalse(fixture.capabilities(module).getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
  }

  @Test
  fun permissionGrantedAfterConstructionSelectsHardwareCounter() {
    fixture.granted = false
    val module = fixture.module()
    fixture.granted = true
    module.startStepCounterUpdate(0.0)
    assertTrue(fixture.active.keys.single() is StepCounterService)
    assertTrue(fixture.capabilities(module).getBoolean("working"))
  }

  @Test
  fun replacingFallbackStopsAndDetachesThePreviousBackend() {
    fixture.setSensors(false, true)
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    val fallback = fixture.active.keys.single()
    assertTrue(fallback is AccelerometerService)
    fixture.setSensors(true, true)
    module.startStepCounterUpdate(0.0)
    assertTrue(fixture.active.keys.single() is StepCounterService)
    assertFalse(fixture.lifecycle.any { it === fallback })
    assertEquals(1, fixture.lifecycle.size)
  }

  @Test
  fun revocationBeforeStartStopsThePreviousSessionWithoutFallback() {
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    fixture.granted = false
    module.startStepCounterUpdate(0.0)
    val capabilities = fixture.capabilities(module)
    assertFalse(capabilities.getBoolean("granted"))
    assertFalse(capabilities.getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
    assertTrue(fixture.lifecycle.isEmpty())
  }

  @Test
  fun capabilityQueryAfterRevocationStopsTheRegisteredSession() {
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    fixture.granted = false
    assertFalse(fixture.capabilities(module).getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
  }

  @Test
  fun failedHardwareRegistrationTriesThePermittedFallback() {
    fixture.rejectedTypes.add(Sensor.TYPE_STEP_COUNTER)
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    assertTrue(fixture.active.keys.single() is AccelerometerService)
    assertTrue(fixture.capabilities(module).getBoolean("working"))
    assertEquals(1, fixture.lifecycle.size)
  }

  @Test
  fun allRegistrationsRejectedLeaveNoWorkingSessionOrMetadata() {
    fixture.rejectedTypes.addAll(listOf(Sensor.TYPE_STEP_COUNTER, Sensor.TYPE_ACCELEROMETER))
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    assertFalse(fixture.capabilities(module).getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
    assertTrue(fixture.lifecycle.isEmpty())
    assertTrue(fixture.sensorInfo.isEmpty())
  }

  @Test
  fun permissionLostDuringRegistrationDoesNotStartFallback() {
    fixture.revokeOnRegister = true
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    assertFalse(fixture.capabilities(module).getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
    assertTrue(fixture.lifecycle.isEmpty())
    assertTrue(fixture.sensorInfo.isEmpty())
  }

  @Test
  fun hostDestructionClearsWorkingStatus() {
    val module = fixture.module()
    module.startStepCounterUpdate(0.0)
    fixture.lifecycle.toList().forEach { it.onHostDestroy() }
    assertFalse(fixture.capabilities(module).getBoolean("working"))
    assertTrue(fixture.active.isEmpty())
  }
}

private data class SelectionCase(
  val sdk: Int,
  val permission: Boolean,
  val step: Boolean,
  val accelerometer: Boolean,
  val supported: Boolean,
  val allowed: Boolean,
  val selectedType: Int?,
)

private class AndroidSensorFixture : AutoCloseable {
  private val sdkField = Build.VERSION::class.java.getField("SDK_INT")
  private val originalSdk = sdkField.getInt(null)
  private val unsafeClass = Class.forName("sun.misc.Unsafe")
  private val unsafe =
    unsafeClass.getDeclaredField("theUnsafe").let {
      it.isAccessible = true
      it.get(null)
    }
  private val sdkBase = unsafeClass.getMethod("staticFieldBase", java.lang.reflect.Field::class.java).invoke(unsafe, sdkField)
  private val sdkOffset = unsafeClass.getMethod("staticFieldOffset", java.lang.reflect.Field::class.java).invoke(unsafe, sdkField)
  private val putInt = unsafeClass.getMethod("putInt", Any::class.java, Long::class.javaPrimitiveType, Int::class.javaPrimitiveType)
  var sdk: Int
    get() = sdkField.getInt(null)
    set(value) {
      putInt.invoke(unsafe, sdkBase, sdkOffset, value)
    }
  var granted = true
  var revokeOnRegister = false
  val rejectedTypes = mutableSetOf<Int>()
  val active = mutableMapOf<SensorEventListener, Sensor>()
  val lifecycle = mutableSetOf<LifecycleEventListener>()
  val sensorInfo = mutableListOf<Any>()
  private val sensors = mutableMapOf<Int, Sensor>()
  private val context =
    mock(ReactApplicationContext::class.java) {
      when (it.method.name) {
        "addLifecycleEventListener" -> {
          lifecycle.add(it.getArgument(0))
          null
        }

        "removeLifecycleEventListener" -> {
          lifecycle.remove(it.getArgument<LifecycleEventListener>(0))
          null
        }

        else -> {
          RETURNS_DEFAULTS.answer(it)
        }
      }
    }
  private val manager = mock(SensorManager::class.java)
  private val emitter =
    mock(RCTDeviceEventEmitter::class.java) {
      if (it.method.name == "emit" && it.getArgument<String>(0) == "StepCounter.stepsSensorInfo") {
        sensorInfo.add(it.getArgument(1))
      }
      null
    }
  private val arguments = mockStatic(Arguments::class.java)
  private val logging = mockStatic(Log::class.java)
  private val permission = mockStatic(PermissionChecker::class.java)

  init {
    // Replace the JVM Android stub's SDK boundary only; restore the final static field on close.
    sdk = 29
    arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
    permission
      .`when`<Int> {
        PermissionChecker.checkSelfPermission(context, "android.permission.ACTIVITY_RECOGNITION")
      }.thenAnswer { if (granted) PermissionChecker.PERMISSION_GRANTED else PermissionChecker.PERMISSION_DENIED }
    `when`(context.getSystemService(Context.SENSOR_SERVICE)).thenReturn(manager)
    val packages = mock(PackageManager::class.java)
    `when`(context.packageManager).thenReturn(packages)
    `when`(packages.hasSystemFeature(any())).thenReturn(true)
    `when`(context.getJSModule(RCTDeviceEventEmitter::class.java)).thenReturn(emitter)
    `when`(manager.getDefaultSensor(anyInt())).thenAnswer { sensors[it.getArgument<Int>(0)] }
    `when`(manager.registerListener(any<SensorEventListener>(), any<Sensor>(), anyInt())).thenAnswer {
      if (revokeOnRegister) {
        granted = false
        throw SecurityException("Activity permission revoked")
      }
      val sensor = it.getArgument<Sensor>(1)
      if (sensor.type in rejectedTypes) {
        false
      } else {
        active[it.getArgument(0)] = sensor
        true
      }
    }
    doAnswer {
      active.remove(it.getArgument<SensorEventListener>(0))
      null
    }.`when`(manager)
      .unregisterListener(any<SensorEventListener>())
    setSensors(true, true)
  }

  fun setSensors(
    step: Boolean,
    accelerometer: Boolean,
  ) {
    sensors.clear()
    if (step) addSensor(Sensor.TYPE_STEP_COUNTER)
    if (accelerometer) addSensor(Sensor.TYPE_ACCELEROMETER)
  }

  private fun addSensor(type: Int) {
    val sensor = mock(Sensor::class.java)
    `when`(sensor.type).thenReturn(type)
    `when`(sensor.name).thenReturn("Fixture sensor $type")
    `when`(sensor.vendor).thenReturn("Fixture")
    sensors[type] = sensor
  }

  fun module() = StepCounterModule(context)

  fun capabilities(module: StepCounterModule): WritableMap {
    val promise = mock(Promise::class.java)
    module.isStepCountingSupported(promise)
    val result = ArgumentCaptor.forClass(Any::class.java)
    verify(promise).resolve(result.capture())
    return result.value as WritableMap
  }

  override fun close() {
    permission.close()
    logging.close()
    arguments.close()
    sdk = originalSdk
  }
}
