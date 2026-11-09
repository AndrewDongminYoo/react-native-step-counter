package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.stepcounter.StepCounterModule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`

class StepCounterServiceTest {
  private val sensorManager = mock(SensorManager::class.java)
  private val sensor = mock(Sensor::class.java)
  private val module = mock(StepCounterModule::class.java)
  private val service = StepCounterService(module, sensorManager)

  @Test
  fun countsFromTheFirstNonzeroReading() {
    assertFalse(service.updateCurrentSteps(floatArrayOf(100f), 0L))
    assertEquals(0.0, service.currentSteps, 0.0)
    assertTrue(service.updateCurrentSteps(floatArrayOf(110f), 0L))
    assertEquals(10.0, service.currentSteps, 0.0)
  }

  @Test
  fun zeroIsAValidBaseline() {
    assertFalse(service.updateCurrentSteps(floatArrayOf(0f), 0L))
    assertTrue(service.updateCurrentSteps(floatArrayOf(1f), 0L))
    assertEquals(1.0, service.currentSteps, 0.0)
    assertTrue(service.updateCurrentSteps(floatArrayOf(3f), 0L))
    assertEquals(3.0, service.currentSteps, 0.0)
  }

  @Test
  fun repeatedBaselineDoesNotRequestAnEvent() {
    service.updateCurrentSteps(floatArrayOf(100f), 0L)
    assertFalse(service.updateCurrentSteps(floatArrayOf(100f), 0L))
    assertEquals(0.0, service.currentSteps, 0.0)
  }

  @Test
  fun repeatedTotalDoesNotRequestAnEvent() {
    service.updateCurrentSteps(floatArrayOf(100f), 0L)
    service.updateCurrentSteps(floatArrayOf(110f), 0L)
    assertFalse(service.updateCurrentSteps(floatArrayOf(110f), 0L))
    assertEquals(10.0, service.currentSteps, 0.0)
  }

  @Test
  fun decreasingReadingsDoNotLowerOrRebaseTheSessionTotal() {
    service.updateCurrentSteps(floatArrayOf(100f), 0L)
    service.updateCurrentSteps(floatArrayOf(110f), 0L)
    assertFalse(service.updateCurrentSteps(floatArrayOf(105f), 0L))
    assertEquals(10.0, service.currentSteps, 0.0)
    assertFalse(service.updateCurrentSteps(floatArrayOf(90f), 0L))
    assertEquals(10.0, service.currentSteps, 0.0)
    assertTrue(service.updateCurrentSteps(floatArrayOf(111f), 0L))
    assertEquals(11.0, service.currentSteps, 0.0)
  }

  @Test
  fun restartingAfterPositiveStepsEstablishesANewBaseline() {
    restartWithBaseline(120f)
  }

  @Test
  fun restartingWithALowerZeroBaselineDoesNotInheritSteps() {
    restartWithBaseline(0f)
  }

  private fun restartWithBaseline(baseline: Float) {
    // Keep counting and start/stop logic real; replace hardware, JNI maps and logging only.
    `when`(sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)).thenReturn(sensor)
    `when`(sensorManager.registerListener(any<android.hardware.SensorEventListener>(), any<Sensor>(), anyInt())).thenReturn(true)
    val countingService =
      StepCounterService(
        module,
        sensorManager,
        object : SensorClock {
          override fun epochMillis() = 1_700_000_000_000L

          override fun elapsedRealtimeNanos() = 0L
        },
      )
    mockStatic(Arguments::class.java).use { arguments ->
      arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
      mockStatic(Log::class.java).use {
        assertTrue(countingService.startService())
        countingService.updateCurrentSteps(floatArrayOf(100f), 0L)
        countingService.updateCurrentSteps(floatArrayOf(110f), 0L)
        assertEquals(10.0, countingService.currentSteps, 0.0)
        countingService.stopService()
        assertTrue(countingService.startService())
        assertEquals(0.0, countingService.currentSteps, 0.0)
        assertFalse(countingService.updateCurrentSteps(floatArrayOf(baseline), 0L))
        assertEquals(0.0, countingService.currentSteps, 0.0)
        assertTrue(countingService.updateCurrentSteps(floatArrayOf(baseline + 2f), 0L))
        assertEquals(2.0, countingService.stepsParamsMap.getDouble("steps"), 0.0)
      }
    }
  }
}
