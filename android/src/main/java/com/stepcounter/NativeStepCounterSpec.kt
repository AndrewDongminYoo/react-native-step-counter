package com.stepcounter;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;

public class NativeStepCounterSpec implements NativeModule {
  public NativeStepCounterSpec(ReactApplicationContext reactContext) {
    reactContext.getApplicationContext();
  }

  @NonNull
  public String getName() {
    return "NativeStepCounterSpec";
  }

  public void initialize() {
  }

  public boolean canOverrideExistingModule() {
    return false;
  }

  /**
   * @deprecated
   */
  public void onCatalystInstanceDestroy() {
  }

  public void invalidate() {
  }
}
