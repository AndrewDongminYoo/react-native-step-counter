package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.WritableMap
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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class SensorTimestampTest {
  @Test
  fun hardwareDatesFollowMeasurementsRegardlessOfDeliveryOrSuspend() {
    val immediate = replay(Sensor.TYPE_STEP_COUNTER, false)
    val batched = replay(Sensor.TYPE_STEP_COUNTER, true)
    assertEquals(listOf(1.0, 2.0, 3.0), immediate.map { it.first })
    assertEquals(listOf(500L, 1000L, 61000L), immediate.map { it.second })
    assertEquals(immediate, batched)
  }

  @Test
  fun accelerometerCountsAndDatesSurviveBatchedDeliveryAndSuspend() {
    val immediate = replay(Sensor.TYPE_ACCELEROMETER, false)
    val batched = replay(Sensor.TYPE_ACCELEROMETER, true)
    assertEquals(listOf(1.0, 2.0, 3.0), immediate.map { it.first })
    assertEquals(listOf(500L, 1000L, 61000L), immediate.map { it.second })
    assertEquals(immediate, batched)
  }

  private fun replay(
    type: Int,
    batched: Boolean,
  ): List<Pair<Double, Long>> {
    TimestampFixture(type).use { fixture ->
      fixture.start()
      val anchor =
        fixture.service.stepsParamsMap
          .getDouble("endDate")
          .toLong()
      assertEquals(1_800_000_000_000L, anchor)
      val offsets = listOf(0L, 500L, 1000L, 61000L)
      for ((index, offset) in offsets.withIndex()) {
        fixture.elapsedNs = (if (batched) 70000L else offset) * 1_000_000 + BOOT_NS
        fixture.epochMs += if (index % 2 == 0) 3_600_000L else -7_200_000L
        if (type == Sensor.TYPE_STEP_COUNTER) {
          fixture.emit(BOOT_NS + offset * 1_000_000, floatArrayOf(100f + index))
        } else {
          // A quiet window removes the previous impulse from the real velocity ring.
          repeat(60) { sample ->
            fixture.emit(BOOT_NS + offset * 1_000_000 - (60 - sample) * 1_000_000, floatArrayOf(0f, 0f, 9.8f))
          }
          if (index > 0) fixture.emit(BOOT_NS + offset * 1_000_000, floatArrayOf(0f, 0f, 30f))
        }
      }
      return fixture.updates.map { it.getDouble("steps") to (it.getDouble("endDate").toLong() - anchor) }
    }
  }

  @Test
  fun backwardsAndDuplicateMeasurementsCannotChangeTheHardwareBaseline() {
    TimestampFixture(Sensor.TYPE_STEP_COUNTER).use { fixture ->
      fixture.start()
      fixture.emit(BOOT_NS, floatArrayOf(100f))
      fixture.emit(BOOT_NS, floatArrayOf(200f))
      fixture.emit(BOOT_NS - 1, floatArrayOf(300f))
      fixture.emit(BOOT_NS + 1_000_000, floatArrayOf(101f))
      assertEquals(listOf(1.0), fixture.updates.map { it.getDouble("steps") })
    }
  }

  @Test
  fun restartClearsHardwareBaselineAndMeasurementOrdering() {
    TimestampFixture(Sensor.TYPE_STEP_COUNTER).use { fixture ->
      fixture.start()
      fixture.emit(BOOT_NS, floatArrayOf(100f))
      fixture.emit(BOOT_NS + 1_000_000_000, floatArrayOf(101f))
      fixture.service.stopService()
      assertFalse(fixture.service.isRunning)
      fixture.start()
      fixture.emit(BOOT_NS, floatArrayOf(0f))
      fixture.emit(BOOT_NS + 1_000_000, floatArrayOf(2f))
      assertEquals(listOf(1.0, 2.0), fixture.updates.map { it.getDouble("steps") })
      assertTrue(fixture.updates.all { it.getDouble("startDate") == HISTORICAL_START.toDouble() })
    }
  }

  @Test
  fun wallClockChangesOnlyReanchorOnRestart() {
    TimestampFixture(Sensor.TYPE_STEP_COUNTER).use { fixture ->
      fixture.start()
      fixture.emit(BOOT_NS, floatArrayOf(100f))
      fixture.epochMs -= 3_600_000
      fixture.elapsedNs += 60_000_000_000
      fixture.emit(BOOT_NS + 60_000_000_000, floatArrayOf(101f))
      assertEquals(1_800_000_060_000.0, fixture.updates.last().getDouble("endDate"), 0.0)
      fixture.start()
      fixture.emit(fixture.elapsedNs, floatArrayOf(0f))
      fixture.emit(fixture.elapsedNs + 500_000_000, floatArrayOf(1f))
      assertEquals(1_799_996_400_500.0, fixture.updates.last().getDouble("endDate"), 0.0)
      assertEquals(HISTORICAL_START.toDouble(), fixture.updates.last().getDouble("startDate"), 0.0)
    }
  }

  @Test
  fun accelerometerPreservesStrictRefractoryBoundaryAndResetsOnRestart() {
    TimestampFixture(Sensor.TYPE_ACCELEROMETER).use { fixture ->
      fixture.start()
      fixture.pulse(BOOT_NS)
      fixture.pulse(BOOT_NS + 250_000_000)
      fixture.pulse(BOOT_NS + 501_000_000)
      assertEquals(listOf(1.0, 2.0), fixture.updates.map { it.getDouble("steps") })
      fixture.start()
      fixture.pulse(BOOT_NS)
      assertEquals(listOf(1.0, 2.0, 1.0), fixture.updates.map { it.getDouble("steps") })
    }
  }

  @Test
  fun restartCannotResetStateDuringAnInFlightEmission() {
    TimestampFixture(Sensor.TYPE_STEP_COUNTER).use { fixture ->
      fixture.start()
      fixture.emit(BOOT_NS, floatArrayOf(100f))
      val entered = CountDownLatch(1)
      val release = CountDownLatch(1)
      val failure = AtomicReference<Throwable?>()
      fixture.beforeEmission = {
        entered.countDown()
        check(release.await(5, TimeUnit.SECONDS))
      }
      val sample =
        Thread {
          workerBoundaries(failure) { fixture.emit(BOOT_NS + 500_000_000, floatArrayOf(101f)) }
        }
      val restart = Thread { workerBoundaries(failure) { fixture.start() } }
      try {
        sample.start()
        assertTrue(entered.await(5, TimeUnit.SECONDS))
        restart.start()
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
        while (restart.isAlive && restart.state != Thread.State.BLOCKED && System.nanoTime() < deadline) Thread.yield()
        assertEquals(Thread.State.BLOCKED, restart.state)
        assertEquals(1.0, fixture.service.currentSteps, 0.0)
      } finally {
        release.countDown()
        sample.join(5000)
        restart.join(5000)
      }
      failure.get()?.let { throw AssertionError("Worker failed", it) }
      assertFalse(sample.isAlive)
      assertFalse(restart.isAlive)
      assertEquals(0.0, fixture.service.currentSteps, 0.0)
      assertEquals(1.0, fixture.updates.single().getDouble("steps"), 0.0)
    }
  }

  private fun workerBoundaries(
    failure: AtomicReference<Throwable?>,
    action: () -> Unit,
  ) {
    // Mockito static boundaries are thread-local. Keep the actual service and locks real.
    try {
      mockStatic(Arguments::class.java).use { arguments ->
        arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
        mockStatic(Log::class.java).use { action() }
      }
    } catch (error: Throwable) {
      failure.set(error)
    }
  }

  companion object {
    private const val BOOT_NS = 10_000_000_000L
    private const val HISTORICAL_START = 1_700_000_000_000L
  }
}

private class TimestampFixture(
  type: Int,
) : AutoCloseable {
  var elapsedNs = 10_000_000_000L
  var epochMs = 1_800_000_000_000L
  var beforeEmission: () -> Unit = {}
  val updates = mutableListOf<WritableMap>()
  private val sensor = mock(Sensor::class.java)
  private val manager = mock(SensorManager::class.java)
  private val module =
    mock(StepCounterModule::class.java) {
      if (it.method.name == "sendDeviceEvent" && it.getArgument<String>(0) == "stepCounterUpdate") {
        beforeEmission()
        updates.add(it.getArgument(1))
      }
      null
    }
  private val arguments = mockStatic(Arguments::class.java)
  private val logging = mockStatic(Log::class.java)
  private val clock =
    object : SensorClock {
      override fun epochMillis() = epochMs

      override fun elapsedRealtimeNanos() = elapsedNs
    }
  val service: SensorListenService

  init {
    arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
    `when`(sensor.type).thenReturn(type)
    `when`(manager.getDefaultSensor(type)).thenReturn(sensor)
    `when`(manager.registerListener(any<SensorEventListener>(), any<Sensor>(), anyInt())).thenReturn(true)
    service =
      if (type == Sensor.TYPE_STEP_COUNTER) StepCounterService(module, manager, clock) else AccelerometerService(module, manager, clock)
  }

  fun start() {
    assertTrue(service.startService(1_700_000_000_000L))
  }

  fun emit(
    timestampNs: Long,
    values: FloatArray,
  ) {
    val event = mock(SensorEvent::class.java)
    event.sensor = sensor
    event.timestamp = timestampNs
    SensorEvent::class.java
      .getField("values")
      .apply { isAccessible = true }
      .set(event, values)
    service.onSensorChanged(event)
  }

  fun pulse(timestampNs: Long) {
    repeat(60) { sample ->
      emit(timestampNs - (60 - sample) * 1_000_000, floatArrayOf(0f, 0f, 9.8f))
    }
    emit(timestampNs, floatArrayOf(0f, 0f, 30f))
  }

  override fun close() {
    logging.close()
    arguments.close()
  }
}
