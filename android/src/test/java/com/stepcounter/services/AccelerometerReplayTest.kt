package com.stepcounter.services

import android.hardware.SensorManager
import com.stepcounter.StepCounterModule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import kotlin.math.cos
import kotlin.math.sin

class AccelerometerReplayTest {
  @Test
  fun nonFiniteSamplesCannotPoisonOrChangeDetectorState() {
    for (axis in 0..2) {
      for (invalid in listOf(Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY)) {
        val actual = AccelerometerProcessor()
        val expected = AccelerometerProcessor()
        val values = FloatArray(3)
        var steps = 0
        repeat(200) { i ->
          sample("walking", i, values)
          if (i == 59) {
            val bad = values.copyOf()
            bad[axis] = invalid
            assertEquals(false, actual.update(bad, i * 20_000_000L - 1))
          }
          val accepted = actual.update(values, i * 20_000_000L)
          assertEquals(expected.update(values, i * 20_000_000L), accepted)
          assertEquals(expected.velocityEstimate, actual.velocityEstimate, 0f)
          if (accepted) steps++
        }
        assertEquals(5, steps)
      }
    }
  }

  @Test
  fun replayPreservesAcceptedSamplesAndVelocity() {
    for (scenario in listOf("walking", "rotation", "stationary", "zero", "long")) {
      val reference = LegacyAccelerometer()
      val processor = AccelerometerProcessor()
      val service = AccelerometerService(mock(StepCounterModule::class.java), mock(SensorManager::class.java))
      val count = if (scenario == "long") 1_000_000 else 6060
      var accepted = 0
      var maxError = 0f
      val values = FloatArray(3)
      repeat(count) { i ->
        sample(scenario, i, values)
        val timestamp = i * 20_000_000L
        val expected = reference.updateCurrentSteps(values, timestamp)
        assertEquals("$scenario sample $i", expected, processor.update(values, timestamp))
        assertEquals("service $scenario sample $i", expected, service.updateCurrentSteps(values, timestamp))
        val error = kotlin.math.abs(reference.velocityEstimate - processor.velocityEstimate)
        assertTrue("$scenario sample $i velocity error $error", error <= 0.001f)
        maxError = maxOf(maxError, error)
        if (expected) accepted++
      }
      if (scenario == "walking") assertEquals(200, accepted)
      if (scenario in listOf("stationary", "zero", "rotation")) assertEquals(0, accepted)
      assertEquals(accepted.toDouble(), service.currentSteps, 0.0)
      println("replay $scenario: samples=$count accepted=$accepted maxVelocityError=$maxError")
    }
  }

  @Test
  fun resetClearsRingsWarmupAndRefractoryState() {
    val reused = AccelerometerProcessor()
    val values = FloatArray(3)
    repeat(200) { i ->
      sample("walking", i, values)
      reused.update(values, i * 20_000_000L)
    }
    reused.reset()
    val fresh = AccelerometerProcessor()
    repeat(200) { i ->
      sample("walking", i, values)
      assertEquals(fresh.update(values, i * 20_000_000L), reused.update(values, i * 20_000_000L))
      assertEquals(fresh.velocityEstimate, reused.velocityEstimate, 0f)
    }
  }

  @Test
  fun benchmarkBeforeAndAfter() {
    val reference = LegacyAccelerometer()
    val processor = AccelerometerProcessor()
    val values = FloatArray(3)
    // Reuse inputs, consume accepted results, and exclude construction from measurement.
    var sink = 0

    fun run(
      optimized: Boolean,
      count: Int,
    ) {
      repeat(count) { i ->
        sample("walking", i, values)
        val accepted = if (optimized) processor.update(values, i * 20_000_000L) else reference.updateCurrentSteps(values, i * 20_000_000L)
        if (accepted) sink++
      }
    }
    repeat(5) {
      run(false, 100_000)
      run(true, 100_000)
    }
    val bean = Class.forName("java.lang.management.ManagementFactory").getMethod("getThreadMXBean").invoke(null)
    val type = Class.forName("com.sun.management.ThreadMXBean")
    type.getMethod("setThreadAllocatedMemoryEnabled", Boolean::class.javaPrimitiveType).invoke(bean, true)
    val allocated = type.getMethod("getThreadAllocatedBytes", Long::class.javaPrimitiveType)
    val thread = Thread.currentThread().id
    println("JVM ${System.getProperty("java.version")}; escape analysis disabled by test JVM configuration")
    repeat(5) { round ->
      for (optimized in if (round % 2 == 0) listOf(false, true) else listOf(true, false)) {
        reference.resetSessionState()
        processor.reset()
        val before = allocated.invoke(bean, thread) as Long
        val start = System.nanoTime()
        run(optimized, 1_000_000)
        val elapsed = System.nanoTime() - start
        val bytes = (allocated.invoke(bean, thread) as Long) - before
        println(
          "benchmark round=$round optimized=$optimized ns/sample=${elapsed / 1_000_000.0} bytes/sample=${bytes / 1_000_000.0} sink=$sink",
        )
      }
    }
    assertTrue(sink > 0)
  }

  private fun sample(
    scenario: String,
    i: Int,
    values: FloatArray,
  ) {
    values.fill(0f)
    when (scenario) {
      "walking" -> {
        values[2] = if (i >= 60 && i % 30 == 0) 30f else 9.8f
      }

      "rotation" -> {
        values[0] = (9.8 * sin(i * 0.002)).toFloat()
        values[2] = (9.8 * cos(i * 0.002)).toFloat()
      }

      "stationary" -> {
        values[2] = 9.8f
      }

      "long" -> {
        values[0] = (0.1 * sin(i * 0.17)).toFloat()
        values[1] = (0.1 * cos(i * 0.13)).toFloat()
        values[2] = (9.8 + 0.1 * sin(i * 0.23)).toFloat()
      }
    }
  }

  @Test
  fun stationaryProcessingDoesNotAllocatePerSample() {
    val service = AccelerometerService(mock(StepCounterModule::class.java), mock(SensorManager::class.java))
    val sample = floatArrayOf(0f, 0f, 9.8f)
    repeat(100_000) { service.updateCurrentSteps(sample, it * 20_000_000L) }
    val bean = Class.forName("java.lang.management.ManagementFactory").getMethod("getThreadMXBean").invoke(null)
    val beanType = Class.forName("com.sun.management.ThreadMXBean")
    beanType.getMethod("setThreadAllocatedMemoryEnabled", Boolean::class.javaPrimitiveType).invoke(bean, true)
    val allocated = beanType.getMethod("getThreadAllocatedBytes", Long::class.javaPrimitiveType)
    val thread = Thread.currentThread().id
    val before = (allocated.invoke(bean, thread) as Long)
    repeat(100_000) { service.updateCurrentSteps(sample, it * 20_000_000L) }
    val bytes = (allocated.invoke(bean, thread) as Long) - before
    assertTrue("Allocated $bytes bytes for 100000 stationary samples", bytes < 100_000)
  }
}
