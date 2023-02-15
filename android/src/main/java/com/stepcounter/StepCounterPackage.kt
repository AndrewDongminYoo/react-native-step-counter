package com.stepcounter

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

@Suppress("unused")
class StepCounterPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == StepCounterModule.NAME) {
            StepCounterModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val moduleInfo: MutableMap<String, ReactModuleInfo> =
                HashMap()
            moduleInfo[StepCounterModule.NAME] = ReactModuleInfo(
                StepCounterModule.NAME,
                StepCounterModule.NAME,
                false,
                false,
                true,
                false,
                true,
            )
            moduleInfo
        }
    }
}