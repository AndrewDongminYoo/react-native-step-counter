# React-Native Step Counter Library

A simple React Native package to count the number of steps taken by the user. This package uses the StepCounter (or Accelerometer) Sensor API on Android and the Core Motion framework on iOS to count the steps.

## Installation

```zsh
npm install react-native-step-counter react-native-permissions

# or if you use Yarn,
yarn add react-native-step-counter react-native-permissions
```

## Requirements

### ANDROID

```xml
<!--  android/src/main/AndroidManifest.xml-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.reactnative.stepcounter">
  <!--  최신 기종 (스텝 카운터 센서가 기본적으로 있는 경우)-->
  <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
  <!--  일부 기종 스텝 카운터 센서 없어 가속도계의 움직임을 추적해 계산 (기록 빈도수가 높은 센서 사용)-->
  <uses-permission android:name="android.permission.BODY_SENSORS" />
  <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS"/>

  <uses-feature
      android:name="android.hardware.sensor.step_counter"
      android:required="true" />
  <uses-feature
      android:name="android.hardware.sensor.step_detector"
      android:required="true" />
  <uses-feature
      android:name="android.hardware.sensor.accelerometer"
      android:required="true" />
</manifest>
```

### iOS

```xml plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
  ...
  <!-- Permission Section Start -->
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>We want to access your location to count your steps.</string>
  <key>NSMotionUsageDescription</key>
  <string>We want to access your motion data to count your steps.</string>
  <key>NSHealthShareUsageDescription</key>
  <string>We want you share your health data to count your steps.</string>
  <key>NSHealthUpdateUsageDescription</key>
  <string>We want to update your workout data to count your steps.</string>
  <!-- Permission Section End -->
  ...
</plist>
```

## Interface

- `isStepCountingSupported(): boolean`: method to check if the device has a step counter or accelerometer sensor.

  - request permission for the required sensors and check if the device has a step counter or accelerometer sensor.
  - if accelerometer sensor is found, then register as listener.
  - else if step counter sensor is found, then register as listener.
  - returns true if the device has a step counter or accelerometer sensor. false otherwise.

- `startStepCounterUpdate(new Date()): boolean`:

  - set module status to `RUNNING`.
  - `stepSensor` is set to step counter sensor or accelerometer sensor.
  - register as listener for `stepSensor` to receive sensor events.
  - In order to access sensor data at high sampling rates
  - (i.e. greater than 200 Hz for `SensorEventListener` and greater than
    `RATE_NORMAL`50Hz)`android.hardware.SensorDirectChannel.RATE_NORMAL`
  - for `android.hardware.SensorDirectChannel`, apps must declare the
    `android.Manifest.permission.HIGH_SAMPLING_RATE_SENSORS`
    permission in their {@link AndroidManifest.xml} file.

- `stopStepCounterUpdate(): void`:

  - set module status to `STOPPED`.
  - unregister as listener for `stepSensor`.

- `StepCountData`:
  **Common Interface**
  - `dailyGoal`: This is a number property that indicates the user's daily goal for number of steps taken. The default value for this property is 10,000.
  - `steps`: This is a number property that indicates the number of steps taken by the user during the specified time period.
  - `calories`: This is a number property that indicates the estimated number of calories burned by the user during the specified time period.
  - `startDate`: This is a number property that indicates the start date of the data in Unix timestamp format, measured in milliseconds.
  - `endDate`: This is a number property that indicates the end date of the data in Unix timestamp format, measured in milliseconds.
  - `distance`: This is a number property that indicates the distance in meters that the user has walked or run during the specified time period.
    **Android only**
    `counterType`: This is a string property that indicates the type of counter used to count the steps. This property is only available on Android devices and can have one of two values: 'STEP_COUNTER' or 'ACCELEROMETER'.
    **iOS only**
  - `floorsAscended`: This is a number property that indicates the number of floors ascended by the user during the specified time period. This property is only available on iOS devices.
  - `floorsDescended`: This is a number property that indicates the number of floors descended by the user during the specified time period. This property is only available on iOS devices.

## Usage

To use the Step Counter Library in your Android app, follow these steps:

Import the library into your React Native app.

```typescript
import RNStepCounter, {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
```

Use the `isStepCountingSupported` method to check if the device has a step counter or accelerometer sensor.

```typescript
const [supported, setSupported] = useState(false);
async function askPermission() {
  const granted = isStepCountingSupported();
  console.debug('🚀 - isStepCountingSupported', granted);
  setSupported(supported);
  return supported;
}
```

Call the `startStepCounterUpdate` method from the `StepCounterModule` class to start the step counter service.

```typescript
const [steps, setSteps] = useState(0);
const [subscription, setSubscription] = useState<EmitterSubscription>();

const startStepCounter = async () => {
  const now = new Date();
  startStepCounterUpdate(Number(now));
  const sub = nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
    console.log(parseStepData(data));
    setSteps(data.steps);
  });
  setSubscription(sub);
};
```

Here's an example of a complete React component that uses the NativeStepCounter:

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import type { EmitterSubscription } from 'react-native';
import { Button, NativeEventEmitter, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import RNStepCounter, {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';

export async function requestRequires() {
  return await requestMultiple(
    Platform.select({
      ios: [PERMISSIONS.IOS.MOTION],
      android: [
        PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
        PERMISSIONS.ANDROID.BODY_SENSORS,
        PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
      ],
      default: [],
    })
  )
    .then((permissions) => {
      Object.entries(permissions).forEach(([key, value]) => {
        console.log('requestPermission', key, value);
      });
      return true;
    })
    .catch((error) => {
      console.error('requestPermission', error);
      return false;
    });
}

export default function App() {
  const [supported, setSupported] = useState(false);
  const [steps, setSteps] = useState(0);
  const [subscription, setSubscription] = useState<EmitterSubscription>();
  const nativeEventEmitter = new NativeEventEmitter(RNStepCounter);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    await requestRequires();
    const granted = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', granted);
    setSupported(supported);
    return supported;
  }

  const startStepCounter = async () => {
    const now = new Date();
    startStepCounterUpdate(Number(now));
    const sub = nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
      console.log(parseStepData(data));
      setSteps(data.steps);
    });
    setSubscription(sub);
  };

  const stopStepCounter = useCallback(() => {
    setSteps(0);
    stopStepCounterUpdate();
    subscription && nativeEventEmitter.removeSubscription(subscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const runService = async () => {
      await askPermission()
        .then((granted) => {
          if (granted) {
            startStepCounter();
          }
        })
        .catch((error) => {
          console.error('askPermission', error);
        });
    };
    runService();
    return () => {
      stopStepCounter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{supported ? '🅾️' : '️❎'}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
        <Button onPress={startStepCounter} title="시작" />
        <Button onPress={stopStepCounter} title="정지" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    display: 'flex',
  },
  step: {
    color: '#000',
    fontSize: 36,
  },
});
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
