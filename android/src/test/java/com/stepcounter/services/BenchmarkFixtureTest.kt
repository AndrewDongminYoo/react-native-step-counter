package com.stepcounter.services

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.stepcounter.StepCounterModule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeNotNull
import org.junit.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`
import java.io.File

class BenchmarkFixtureTest {
  @Test
  fun replayAndMeasureFrozenInputs() {
    val directory = System.getenv("STEP_BENCHMARK_FIXTURES")
    val output = System.getenv("STEP_BENCHMARK_NATIVE_OUT")
    assumeNotNull(directory, output)
    val rows = mutableListOf<String>()
    for (name in listOf("stationary", "walking", "rapid_rotation", "delayed_batches", "long_teardown")) {
      // Parsing and construction stay outside every timed region.
      val samples =
        File(directory, "$name.csv").readLines().map { line ->
          val fields = line.split(',')
          fields[0].toLong() to floatArrayOf(fields[1].toFloat(), fields[2].toFloat(), fields[3].toFloat())
        }
      val processor = AccelerometerProcessor()
      val legacy = LegacyAccelerometer()
      var expected = 0
      for ((time, values) in samples) {
        val accepted = legacy.updateCurrentSteps(values, time)
        assertEquals("$name at $time", accepted, processor.update(values, time))
        if (accepted) expected++
      }
      if (name == "walking" || name == "delayed_batches") assertEquals(200, expected)
      if (name == "stationary") assertEquals(0, expected)
      if (name == "long_teardown") assertEquals(3332, expected)

      fun process(): Int {
        var accepted = 0
        for ((time, values) in samples) if (processor.update(values, time)) accepted++
        return accepted
      }
      repeat(10) {
        processor.reset()
        process()
      }
      repeat(5) { round ->
        processor.reset()
        val begin = System.nanoTime()
        val accepted = process()
        val elapsed = System.nanoTime() - begin
        assertEquals(expected, accepted)
        rows.add(row(name, "native_processing", round, samples.size, accepted, elapsed))
      }

      val service = AccelerometerService(mock(StepCounterModule::class.java), mock(SensorManager::class.java))
      service.currentSteps = expected.toDouble()
      mockStatic(Arguments::class.java).use { arguments ->
        // JavaOnlyMap replaces JNI allocation; this is not a bridge benchmark.
        arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
        val payloads = minOf(samples.size, 2000)
        repeat(10) {
          repeat(payloads) { service.stepsParamsMap }
          arguments.clearInvocations()
        }
        repeat(5) { round ->
          var sink = 0.0
          val begin = System.nanoTime()
          repeat(payloads) { sink += service.stepsParamsMap.getDouble("steps") }
          val elapsed = System.nanoTime() - begin
          assertEquals(expected.toDouble() * payloads, sink, 0.0)
          rows.add(row(name, "payload_creation", round, payloads, payloads, elapsed))
          arguments.clearInvocations()
        }
      }
    }
    File(output!!).writeText(rows.joinToString(",\n", "[\n", "\n]\n"))
    // Record the test process, which may differ from the Java executable on PATH.
    File("$output.runtime.txt").writeText("${System.getProperty("java.vm.name")} ${System.getProperty("java.runtime.version")}\n")
  }

  @Test
  fun stoppedServiceRejectsLongQueuedTrace() {
    val manager = mock(SensorManager::class.java)
    val sensor = mock(Sensor::class.java)
    val module = mock(StepCounterModule::class.java)
    `when`(sensor.type).thenReturn(Sensor.TYPE_ACCELEROMETER)
    `when`(manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)).thenReturn(sensor)
    `when`(manager.registerListener(any<SensorEventListener>(), any<Sensor>(), anyInt())).thenReturn(true)
    val clock =
      object : SensorClock {
        override fun epochMillis() = 1_700_000_000_000L

        override fun elapsedRealtimeNanos() = 0L
      }
    val service = AccelerometerService(module, manager, clock)
    mockStatic(Arguments::class.java).use { arguments ->
      arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
      mockStatic(Log::class.java).use {
        assertTrue(service.startService())
        val event = mock(SensorEvent::class.java)
        event.sensor = sensor
        val values = floatArrayOf(0f, 0f, 9.8f)
        SensorEvent::class.java
          .getField("values")
          .apply { isAccessible = true }
          .set(event, values)
        repeat(10000) { i ->
          event.timestamp = i * 20_000_000L
          values[2] = if (i >= 60 && i % 30 == 0) 30f else 9.8f
          service.onSensorChanged(event)
        }
        assertTrue(service.currentSteps > 0)
        val before = service.currentSteps
        service.stopService()
        repeat(10000) { i ->
          event.timestamp = (10000 + i) * 20_000_000L
          values[2] = if (i % 30 == 0) 30f else 9.8f
          service.onSensorChanged(event)
        }
        assertEquals(before, service.currentSteps, 0.0)
      }
    }
  }

  private fun row(
    name: String,
    stage: String,
    round: Int,
    operations: Int,
    accepted: Int,
    elapsed: Long,
  ) =
    """{"scenario":"$name","stage":"$stage","round":$round,"operations":$operations,"accepted":$accepted,"rejected":${operations - accepted},"durationNs":$elapsed}"""
}
