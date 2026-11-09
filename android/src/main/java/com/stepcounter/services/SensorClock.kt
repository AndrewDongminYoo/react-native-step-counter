package com.stepcounter.services

import android.os.SystemClock

/** Clock boundaries used to anchor sensor measurements to epoch milliseconds. */
internal interface SensorClock {
  fun epochMillis(): Long

  fun elapsedRealtimeNanos(): Long
}

internal object AndroidSensorClock : SensorClock {
  override fun epochMillis(): Long = System.currentTimeMillis()

  override fun elapsedRealtimeNanos(): Long = SystemClock.elapsedRealtimeNanos()
}
