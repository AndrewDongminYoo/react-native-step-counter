# React-Native Step Counter Library

This library provides an interface for tracking the number of steps taken by the user in a React Native app.

## Installation

```zsh
npm install react-native-step-counter

# or if you use Yarn,
yarn add react-native-step-counter
```

## Requirements

### ANDROID

```xml
// android/src/main/AndroidManifest.xml
// 최신 기종 (스텝 카운터 센서가 기본적으로 있는 경우)
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
// 일부 기종 스텝 카운터 센서 없어 가속도계의 움직임을 추적해 계산 (기록 빈도수가 높은 센서 사용)
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
```

### iOS

```plist
  // ios/<APP_PROJECT_NAME>/Info.plist
  // 모션 사용에 대한 권한을 요청할 때 나타날 메세지를 Info.plist에 입력해야 함
  <key>NSMotionUsageDescription</key>
  <string>We need to access your motion data to count your steps.</string>
```

## Interface

- `isStepCountingSupported`: method to check if the device has a step counter or accelerometer sensor.

  - request permission for the required sensors and check if the device has a step counter or accelerometer sensor.
  - if accelerometer sensor is found, then register as listener.
  - else if step counter sensor is found, then register as listener.
  - returns true if the device has a step counter or accelerometer sensor. false otherwise.

- `startStepCounterUpdate(Date.now())`:

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
  - The Object that contains the step count data.
  - with four properties: `distance`, `steps`, `startDate`, and `endDate`.
  - `distance` - The distance in meters that the user has walked or run.
  - `steps` - The number of steps taken during the time period.
  - `startDate` - The start date of the data.
  - `endDate` - The end date of the data.
  - `floorsAscended` - The number of floors ascended during the time period.
  - `floorsDescended` - The number of floors descended during the time period.

## Usage

To use the Step Counter Library in your Android app, follow these steps:

Import the library into your React Native app.

```typescript
import RNStepCounter, {
  isStepCountingSupported,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  StepCountData,
} from 'react-native-step-counter';
```

Use the `isStepCountingSupported` method to check if the device has a step counter or accelerometer sensor.

```typescript
const [supported, setSupported] = useState(false);
const OK = isStepCountingSupported();
setSupported(OK);
```

Call the `startStepCounterUpdate` method from the `StepCounterModule` class to start the step counter service.

```typescript
const now = Date.now();
startStepCounterUpdate(now);
```

Here's an example of a complete React component that uses the NativeStepCounter:

```typescript
import React, { Component } from 'react';
import {
  Button,
  EmitterSubscription,
  NativeEventEmitter,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RNStepCounter, {
  isStepCountingSupported,
  startStepCounterUpdate,
  StepCountData,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
import { check, openSettings, Permission, PERMISSIONS, requestMultiple, RESULTS } from 'react-native-permissions';

export async function requestRequiredPermissions() {
  await requestMultiple([
    PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
    PERMISSIONS.ANDROID.BODY_SENSORS,
    PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
    PERMISSIONS.IOS.MOTION,
  ]);
}

export async function checkPermission(permission: Permission) {
  return check(permission)
    .then((result) => {
      switch (result) {
        case RESULTS.UNAVAILABLE:
          return false;
        case RESULTS.DENIED:
          return false;
        case RESULTS.LIMITED:
          return true;
        case RESULTS.GRANTED:
          return true;
        default:
          throw Error(result);
      }
    })
    .catch((_err) => {
      openSettings();
      return false;
    });
}

type StepCountState = {
  allowed: boolean;
  stepData: StepCountData;
  subscription: EmitterSubscription | null;
};

export default class App extends Component<never, StepCountState> {
  state = {
    allowed: false,
    subscription: null as EmitterSubscription | null,
    stepData: {
      steps: 0,
      distance: 0,
      startDate: 0,
      endDate: 0,
    },
  };
  nativeEventEmitter = new NativeEventEmitter(RNStepCounter);

  componentDidMount() {
    const askPermission = async () => {
      await requestRequiredPermissions();
      const granted = await (Platform.OS === 'ios'
        ? checkPermission(PERMISSIONS.IOS.MOTION)
        : checkPermission(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION));
      const supported = isStepCountingSupported();
      this.setState({ allowed: granted && supported });
    };
    askPermission();
    if (this.state.allowed) {
      this.startStepCounter();
    }
  }

  startStepCounter() {
    const now = Date.now();
    startStepCounterUpdate(now);
    const sub = this.nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
      this.setState({ stepData: data });
    });
    this.setState({ subscription: sub });
  }

  componentWillUnmount() {
    this.setState({ stepData: { steps: 0 } });
    stopStepCounterUpdate();
    if (this.state.subscription) {
      this.nativeEventEmitter.removeSubscription(this.state.subscription);
    }
  }

  render() {
    const { allowed, stepData } = this.state;
    return (
      <SafeAreaView>
        <View style={styles.screen}>
          <Text style={styles.step}>사용가능:{allowed ? `🅾️` : `️❎`}</Text>
          <Text style={styles.step}>걸음 수: {stepData.steps}</Text>
          <Button title="stop" onPress={stopStepCounterUpdate} />
          <Button title="start" onPress={this.startStepCounter} />
        </View>
      </SafeAreaView>
    );
  }
}
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
