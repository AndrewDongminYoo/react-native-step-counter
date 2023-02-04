package com.stepcounter;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = StepCounterModule.NAME)
public class StepCounterModule extends NativeStepCounterSpec {
  public static final String NAME = "StepCounter";

  public StepCounterModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

}
