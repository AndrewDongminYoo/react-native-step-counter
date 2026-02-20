package com.stepcounter

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * This class is responsible for the creation of the ReactNative package.
 * @see com.facebook.react.ReactPackage
 * @see BaseReactPackage
 * @see ReactApplicationContext
 * @see ReactModuleInfo
 * @see ReactModuleInfoProvider
 */
class StepCounterPackage : BaseReactPackage() {
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
    reactContext: ReactApplicationContext,
  ): NativeModule? = if (name == StepCounterModule.NAME) StepCounterModule(reactContext) else null

  /**
   * This method is responsible for the creation of the ReactNative module info provider.
   * @return The ReactNative module info provider
   * @see ReactModuleInfoProvider
   * @see ReactModuleInfo
   */
  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      val moduleInfo: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfo[StepCounterModule.NAME] =
        ReactModuleInfo(
          name = StepCounterModule.NAME,
          className = StepCounterModule.NAME,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = true,
        )
      moduleInfo
    }
}
