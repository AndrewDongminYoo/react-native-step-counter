package com.stepcounter

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(reactContext: ReactApplicationContext?) :
    NativeModule {
    // Example method
    // See https://reactnative.dev/docs/native-modules-android

    fun multiply(a: Double, b: Double): Double {
        return a * b
    }

    companion object {
        const val NAME = "StepCounter"
    }

    override fun getName(): String {
        return NAME
    }

    override fun initialize() {
    }

    override fun canOverrideExistingModule() = false

    @Deprecated("Deprecated in Java")
    override fun onCatalystInstanceDestroy() {
    }

    override fun invalidate() {
    }
}