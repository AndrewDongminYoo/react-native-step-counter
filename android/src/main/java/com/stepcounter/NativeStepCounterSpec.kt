package com.stepcounter

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.turbomodule.core.interfaces.TurboModule

open class NativeStepCounterSpec(reactContext: ReactApplicationContext) : TurboModule, NativeModule {
    var reactContext: ReactApplicationContext

    init {
        this.reactContext = reactContext
    }

    override fun getName(): String {
        return "NativeStepCounterSpec"
    }

    override fun initialize() {
        TODO("Not yet implemented")
    }

    override fun canOverrideExistingModule(): Boolean {
        return false
    }

    @Deprecated("Deprecated in Java", ReplaceWith("TODO(\"Not yet implemented\")"))
    override fun onCatalystInstanceDestroy() {
        TODO("Not yet implemented")
    }

    override fun invalidate() {
        TODO("Not yet implemented")
    }
}