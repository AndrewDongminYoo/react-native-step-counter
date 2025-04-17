# React-Native Step Counter Library

This library provides an interface for tracking the number of steps taken by the user in a React Native app. On Android, it uses the `StepCounter` or a fallback accelerometer-based step counter. On iOS, it uses the `Core Motion` framework. The library is designed to support both React Native's **New Architecture (Turbo Modules)** and the legacy bridge system.

---

## Installation

```bash
npm install react-native-step-counter
# or
yarn add react-native-step-counter
# or
pnpm add react-native-step-counter
```

If you're using React Native `0.60` or higher, native linking is automatic.

If you're using the **legacy architecture**, continue reading below for additional setup — otherwise, you can skip to [Android setup](#android).

---

## Example Application

A full example application is available in the [`walking_tracker`](https://github.com/AndrewDongminYoo/walking_tracker) repository.

Please note: earlier versions of this package used the `example` folder generated via [`create-react-native-library`](https://github.com/callstack/react-native-builder-bob). That folder was intended for library development and not as a real-world app reference. The new `walking_tracker` repo provides a clearer and more production-like example.

---

## Enabling the New Architecture

### General Steps

1. React Native officially supports the New Architecture starting from [`0.68.0`](https://reactnative.dev/blog/2022/03/30/version-068#opting-in-to-the-new-architecture).
2. Make sure you're using the [latest React Native release](https://github.com/facebook/react-native/releases/latest).
3. Upgrade instructions are available in the [React Native upgrade guide](https://reactnative.dev/docs/upgrading).
4. Write your JS bridges using [TypeScript](https://www.typescriptlang.org/) (or Flow) — code generation requires strict type definitions.
5. Enable [Hermes](https://reactnative.dev/docs/hermes) and [Flipper](https://fbflipper.com/) for optimal performance and debugging.

---

### iOS Setup for New Architecture

1. Set the iOS platform version to `12.4` or higher:

```ruby
- platform :ios, '11.0'
+ platform :ios, '12.4'
```
Alternatively, use `min_ios_version_supported` if you're following React Native's pod spec.

2. Create an `.xcode.env` file to define `NODE_BINARY`:

```bash
echo 'export NODE_BINARY=$(command -v node)' > .xcode.env
```

3. Update `AppDelegate.m` to handle the `sourceURLForBridge` change:

```diff
- return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
+ return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
```

4. Rename all Objective-C `.m` files to `.mm` to enable Objective-C++.
5. Make `AppDelegate` inherit from `RCTAppDelegate`:

```objc
- @interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>
+ @interface AppDelegate : RCTAppDelegate
```

6. Run:

```bash
export RCT_NEW_ARCH_ENABLED=1
cd ios && pod install
```

---

### Android Setup for New Architecture

1. If you're using React Native `0.71.0` or newer, prerequisites are already met.
2. Enable the New Architecture by adding this line to `android/gradle.properties`:

```properties
newArchEnabled=true
```

For more info, see the [official React Native documentation](https://reactnative.dev/docs/new-architecture-intro).

---

## Android Permissions and Features

Make sure you declare these permissions and features in your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />

<uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false" />
<uses-feature android:name="android.hardware.sensor.accelerometer" android:required="true" />
```

---

## iOS Permissions

Add the following to your `Info.plist`:

```xml
<key>NSMotionUsageDescription</key>
<string>We want to access your motion data to count your steps.</string>
```

---

## API Overview

### Methods

- `isStepCountingSupported(): Promise<{ granted: boolean; supported: boolean }>`
  
  Checks whether the step counter or accelerometer is available on the device, and whether the necessary permission has been granted.

- `startStepCounterUpdate(startDate: Date, callBack: StepCountUpdateCallback): EmitterSubscription`

  Begins listening for step count updates starting from `startDate`. If hardware step counters are unavailable, a fallback using accelerometer data is applied.

- `stopStepCounterUpdate(): void`

  Stops the step counter or accelerometer listener.

---

### StepCountData Interface

- `steps`: Number of steps recorded.
- `startDate`: Start timestamp (milliseconds since epoch).
- `endDate`: End timestamp (milliseconds since epoch).
- `distance`: Distance covered in meters.
- `counterType`: Sensor used for step counting (`CMPedometer`, `StepCounter`, or `Accelerometer`).

#### iOS-Only Properties

- `floorsAscended`: Number of floors climbed.
- `floorsDescended`: Number of floors descended.
