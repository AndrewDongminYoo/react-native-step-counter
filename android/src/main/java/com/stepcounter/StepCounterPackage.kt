package com.stepcounter

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

/**
 * This class is responsible for the creation of the ReactNative package.
 * @see com.facebook.react.ReactPackage
 * @see TurboReactPackage
 * @see ReactApplicationContext
 * @see ReactModuleInfo
 * @see ReactModuleInfoProvider
 */
class StepCounterPackage : TurboReactPackage() {
    /**
     * This method is responsible for the creation of the ReactNative module.
     * @param name The name of the module
     * @param reactContext The context of the react-native application
     * @return [com.facebook.react.module.model.ReactModuleInfo] ]The ReactNative module
     * @see NativeModule
     * @see ReactApplicationContext
     * @see StepCounterModule
     * @see StepCounterModule.NAME
     */
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext
    ): NativeModule? {
        return if (name == StepCounterModule.NAME) StepCounterModule(reactContext) else null
    }

    /**
     * This method is responsible for the creation of the ReactNative module info provider.
     * @return The ReactNative module info provider
     * @see ReactModuleInfoProvider
     * @see ReactModuleInfo
     * @see BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
     * @see ReactModuleInfo.mCanOverrideExistingModule
     * @see ReactModuleInfo.mNeedsEagerInit
     * @see ReactModuleInfo.mHasConstants
     * @see ReactModuleInfo.mIsCxxModule
     * @see ReactModuleInfo.mIsTurboModule
     */
    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val moduleInfo: MutableMap<String, ReactModuleInfo> = HashMap()
            val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            moduleInfo[StepCounterModule.NAME] =
                ReactModuleInfo(
                    StepCounterModule.NAME,
                    StepCounterModule.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true, // hasConstants
                    false, // isCxxModule
                    isTurboModule // isTurboModule
                )
            moduleInfo
        }
    }
}