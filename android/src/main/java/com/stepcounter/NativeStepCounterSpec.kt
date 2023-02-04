package com.stepcounter

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.*
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.turbomodule.core.interfaces.TurboModule

abstract class NativeStepCounterSpec(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext), ReactModuleWithSpec, TurboModule {
    protected abstract val typedExportedConstants: Map<String, Any>

    @DoNotStrip
    override fun getConstants(): Map<String, Any>? {
        val constants = typedExportedConstants
        if (ReactBuildConfig.DEBUG || ReactBuildConfig.IS_INTERNAL_BUILD) {
            val obligatoryFlowConstants: MutableSet<String> = HashSet(
                mutableListOf(
                    "platform",
                ),
            )
            val optionalFlowConstants: Set<String> = HashSet()
            var undeclaredConstants: MutableSet<String> = HashSet(constants.keys)
            undeclaredConstants.removeAll(obligatoryFlowConstants)
            undeclaredConstants.removeAll(optionalFlowConstants)
            check(undeclaredConstants.isEmpty()) {
                String.format(
                    "Native Module Flow doesn't declare constants: %s",
                    undeclaredConstants,
                )
            }
            undeclaredConstants = obligatoryFlowConstants
            undeclaredConstants.removeAll(constants.keys)
            check(undeclaredConstants.isEmpty()) {
                String.format(
                    "Native Module doesn't fill in constants: %s",
                    undeclaredConstants,
                )
            }
        }
        return constants
    }

    @get:DoNotStrip
    @get:ReactMethod(isBlockingSynchronousMethod = true)
    abstract val isStepCountingSupported: Boolean

    @get:DoNotStrip
    @get:ReactMethod(isBlockingSynchronousMethod = true)
    abstract val isWritingStepsSupported: Boolean

    @ReactMethod
    @DoNotStrip
    abstract fun startStepCounterUpdate(from: Double, promise: Promise?)

    @ReactMethod
    @DoNotStrip
    abstract fun stopStepCounterUpdate()

    @ReactMethod
    @DoNotStrip
    abstract fun queryStepCounterDataBetweenDates(
        startDate: Double,
        endDate: Double,
        promise: Promise?,
    )

    @ReactMethod
    @DoNotStrip
    abstract fun requestPermission(promise: Promise?)

    @ReactMethod(isBlockingSynchronousMethod = true)
    @DoNotStrip
    abstract fun checkPermission(): String?
}