package com.stepcounter

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = StepCounterModule.NAME)
class StepCounterModule(reactContext: ReactApplicationContext?) :
    NativeStepCounterSpec(reactContext) {

    companion object {
        const val NAME = "RNStepCounter"
    }

    override val typedExportedConstants: Map<String, Any>
        get() = TODO("Not yet implemented")
    override val isStepCountingSupported: Boolean
        get() = TODO("Not yet implemented")
    override val isWritingStepsSupported: Boolean
        get() = TODO("Not yet implemented")

    override fun startStepCounterUpdate(from: Double, promise: Promise?) {
        TODO("Not yet implemented")
    }

    override fun stopStepCounterUpdate() {
        TODO("Not yet implemented")
    }

    override fun queryStepCounterDataBetweenDates(
        startDate: Double,
        endDate: Double,
        promise: Promise?,
    ) {
        TODO("Not yet implemented")
    }

    override fun requestPermission(promise: Promise?) {
        TODO("Not yet implemented")
    }

    override fun checkPermission(): String? {
        TODO("Not yet implemented")
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