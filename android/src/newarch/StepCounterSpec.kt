package com.stepcounter

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

abstract class StepCounterSpec internal constructor(context: ReactApplicationContext) :
    NativeStepCounterSpec(context) {
        override fun getName(): String = "StepCounter"

        abstract override fun isStepCountingSupported(promise: Promise)

        abstract override fun startStepCounterUpdate(from: Double)

        abstract override fun stopStepCounterUpdate()

        override fun addListener(eventName: String) {
        }

        override fun removeListeners(count: Double) {
        }
    }