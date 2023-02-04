package com.stepcounter

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext

open class NativeStepCounterSpec(reactContext: ReactApplicationContext) : NativeModule {
    init {
        reactContext.applicationContext
    }

    override fun getName(): String {
        return "NativeStepCounterSpec"
    }

    override fun initialize() {}
    override fun canOverrideExistingModule(): Boolean {
        return false
    }

    @Deprecated("")
    override fun onCatalystInstanceDestroy() {
    }

    override fun invalidate() {}
}