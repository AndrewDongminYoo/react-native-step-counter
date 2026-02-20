# React-Native Step Counter Library

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M8Q4QZ7)

한국어 사용자는 [Korean version.](README.kr.md)를 참조하십시오.

This library provides an interface for tracking the number of steps taken by the user in a React Native app. This package uses the `StepCounter` (or Custom accelerometer-based step-counter) Sensor API on Android and the `Core Motion` framework on iOS to count the steps. It's built using Turbo Module, a new module development architecture for React Native. I made this library compatible with both new and legacy architectures. (Because the turbo module is still in the experimental stage. so it is not widely used.)

## Installation

```shell
# if you use pure npm (what a classic!),
npm install @dongminyu/react-native-step-counter
```

```shell
# or if you prefer to use Yarn (I love it's parallel install feature),
yarn add @dongminyu/react-native-step-counter
```

```shell
# or if you use pnpm (it's fast and efficient),
pnpm add @dongminyu/react-native-step-counter
```

Native modules will automatically connect after React Native 0.60 version. So you don't need to link the native modules manually.

> ⚠️ **New Architecture required from v0.3.0**: This version requires React Native's New Architecture (TurboModule/Fabric) to be enabled. Expo Go, Expo managed workflow, and React Native versions below 0.68 are not supported.

👣 If you have not yet enabled the New Architecture, follow the guide below. If it is already enabled, you can [skip](#android) to the next step.

## IF YOU WANT SEE A DEMO IN STANDALONE REACT-NATIVE APPLICATION, SEE [WALKING_TRACKER EXAMPLE](https://github.com/AndrewDongminYoo/walking_tracker) REPO

Thank you for your interest in my first NPM open source package! I've received a lot of issue reports on various issues, especially the react-native's `NEW ARCHITECTURE` backwards compatibility, and I've more or less finalized those issues by fixing the code structure across the board. We had generated an example folder from [create-react-native-library](https://github.com/callstack/react-native-builder-bob)'s template and used it for this project, but due to the structure of that template, we found that the example folder contained a lot of code that was not suitable for reference in a working app, as it was part of the overall development process rather than a standalone application. For this reason, I'm going to independently manage the example application, which we had been developing informally as a sub-repository, as a repository named [walking_tracker](https://github.com/AndrewDongminYoo/walking_tracker). I'd really appreciate it if you could take this into consideration.

---

## Setup the New Architecture

- Applying a new architecture to React Native applications (Common)
  1. React Native released the support for the New Architecture with the release [`0.68.0`](https://reactnative.dev/blog/2022/03/30/version-068#opting-in-to-the-new-architecture).
  2. This is written with the expectation that you’re using the [latest React Native release](https://github.com/facebook/react-native/releases/latest).
  3. You can find instructions on how to upgrade in the [page upgrading to new versions](https://reactnative.dev/docs/upgrading).
  4. write all JS bridges with [TypeScript](https://www.typescriptlang.org/) (or [Flow.js](https://flow.org/)) because Codegen requires explicitly defined types. As you know, JavaScript is a dynamically typed language, so it is not possible to generate code.
  5. use hermes and flipper debugging tools.
     - [Hermes](https://reactnative.dev/docs/hermes) is a new JavaScript engine optimized for running React Native apps on Android and iOS. enabled by default, and you want to use JSC, explicitly disable it.
     - [Flipper](https://fbflipper.com/) is a new debugging and profiling tool for React Native.

- Applying a new architecture to React Native iOS applications

  _1_. set platform version to [12.4](https://github.com/facebook/react-native/blob/main/CHANGELOG.md#ios-specific-25) or higher.

  ```diff
  - platform :ios, '11.0'
  + platform :ios, '12.4'
  # ↓ or you can use the variable of (react_native_pods.rb)
  + platform :ios, min_ios_version_supported
  ```

  _2_. set NODE_BINARY to .xcode.env file.

  ```shell
  echo 'export NODE_BINARY=$(command -v node)' > .xcode.env
  ```

  _3_. Fix an API Change in the `AppDelegate.m` file.

  ```diff
   - (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
   {
   #if DEBUG
  -    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
  +    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
   #else
       return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
   #endif
   }
  ```

  _4_. Rename all Objective-C(.m) files to Objective-C++ (.mm)
  _5_. Make your AppDelegate conform to RCTAppDelegate
  - `AppDelegate.h` example:

    ```diff
    - #import <React/RCTBridgeDelegate.h>
    + #import <RCTAppDelegate.h>
    #import <UIKit/UIKit.h>

    - @interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>
    + @interface AppDelegate : RCTAppDelegate

    - @property (nonatomic, strong) UIWindow *window;
    @end
    ```

  - `AppDelegate.mm` example:

    ```objective-c++
    #import "AppDelegate.h"
    #import <React/RCTBundleURLProvider.h>
    @implementation AppDelegate
    - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
    {
      self.moduleName = @"StepCounterExample";
      self.initialProps = @{};
      return [super application:application didFinishLaunchingWithOptions:launchOptions];
    }
    - (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
    {
    #if DEBUG
      return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
    #else
      return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
    #endif
    }
    - (BOOL)concurrentRootEnabled
    {
      return true;
    }
    @end
    ```

  > **Note for Swift projects (React Native 0.76+):** If your app uses a Swift-based `AppDelegate.swift`, New Architecture is already enabled by default. No AppDelegate changes are required — simply run `pod install` with `RCT_NEW_ARCH_ENABLED=1`.
  - Run `pod install`

    ```shell
    export RCT_NEW_ARCH_ENABLED=1
    cd example/ios && pod install
    ```

- Applying a new architecture to React Native Android applications
  1. If your project has React Native later than `v0.71.0`, you already meet all the prerequisites to use the New Architecture on Android.
  2. You will only need to set `newArchEnabled` to `true` in your `android/gradle.properties` file.

> If you prefer to read the official documentation, you can find it [here](https://reactnative.dev/docs/new-architecture-intro).

### ANDROID

> 3 uses-permission, 3 uses-feature

```xml
<!--  android/src/main/AndroidManifest.xml-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stepcounter">
  <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
  <uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />

  <uses-feature
    android:name="android.hardware.sensor.stepcounter"
    android:required="false" />
  <uses-feature
    android:name="android.hardware.sensor.accelerometer"
    android:required="true" />
</manifest>
```

### iOS

> set NSMotionUsageDescription

```xml plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
  ...
  <key>NSMotionUsageDescription</key>
  <string>We want to access your motion data to count your steps.</string>
  ...
</plist>
```

## Interface

- `isStepCountingSupported()`: Promise<Record<string, boolean>>: method to check if the device has a feature related step counter or accelerometer.
  - One key for the response object is `granted`, whether the app user has granted this feature permission, and `supported` is whether the device supports this feature.
  - This NativeModule can apply algorithms to a raw accelerometer to extract walking event data without activity sensor privileges, regardless of this response, but it is not recommended. You must write a code that stops tracking sensor events if user denies read-permission - even if you can do that.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: EmitterSubscription:
  - If the pedometer sensor is available and supported on the device, register it with the listener in the sensor manager, and return the step count event listener.
  - If the pedometer sensor is not supported by the device or is not available, register the accelerometer sensor with the listener, generate a accel event through an vector algorithm filter and receive it to the app.

- `stopStepCounterUpdate(): void`:
  - unregister registered listener from `sensorManager` and release it.

- `StepCountData`:
  - **Common Interface**
    - `steps`: This is a number property that indicates the number of steps taken by the user during the specified time period.
    - `startDate`: This is a number property that indicates the start date of the data in Unix timestamp format, measured in milliseconds.
    - `endDate`: This is a number property that indicates the end date of the data in Unix timestamp format, measured in milliseconds.
    - `distance`: This is a number property that indicates the distance in meters that the user has walked or run during the specified time period.
    - `counterType`: The name of the sensor used to count the number of steps. In iOS, only the `CMPedometer` is returned, and in Android, the `StepCounter` or `Accelerometer` is returned depending on the device state.

  - **iOS Only**
    - `floorsAscended`: This is a number property that indicates the number of floors the user has ascended during the specified time period. it can be nil if the device does not support this feature.
    - `floorsDescended`: This is a number property that indicates the number of floors the user has descended during the specified time period. it can be nil if the device does not support this feature.
    - `currentPace`: (iOS 9.0+) This is a number property that indicates the current pace of the user in meters per second.
    - `currentCadence`: (iOS 9.0+) This is a number property that indicates the current cadence of the user in steps per second.
    - `averageActivePace`: (iOS 10.0+) This is a number property that indicates the average pace of the user in meters per second.

## Usage

To use the Step Counter Library in your React Native app, follow these steps:

Import the library into your React Native app.

```typescript
import React, { useEffect, useState } from "react";
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from "@dongminyu/react-native-step-counter";
```

Use the `isStepCountingSupported` method to check if the device has a step counter or accelerometer sensor.

```typescript
const [supported, setSupported] = useState(false);
const [granted, setGranted] = useState(false);

async function askPermission() {
  isStepCountingSupported().then((result) => {
    console.debug("🚀 - isStepCountingSupported", result);
    setGranted(result.granted === true);
    setSupported(result.supported === true);
  });
}
```

Call the `startStepCounterUpdate` method to start the step counter service.

```typescript
const [steps, setSteps] = useState(0);

async function startStepCounter() {
  startStepCounterUpdate(new Date(), (data) => {
    console.debug(parseStepData(data));
    setSteps(data.steps);
  });
}
```

Here's an example of a complete React component that uses the `NativeStepCounter`.

Link to Example Application: [here](https://github.com/AndrewDongminYoo/react-native-step-counter/blob/main/example/src/App.tsx)

## Change Log

See the [`Release Notes`](CHANGELOG.md) for a list of changes.

## Contributing

See the [`Contributing Guide`](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
