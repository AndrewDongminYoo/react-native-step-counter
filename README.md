# React-Native Step Counter Library

A simple React Native package to count the number of steps taken by the user. This package uses the StepCounter (or Accelerometer) Sensor API on Android and the Core Motion framework on iOS to count the steps.

## Installation

```zsh
npm install react-native-step-counter

# or if you use Yarn,
yarn add react-native-step-counter
```

## Requirements

### ANDROID

```xml
<!--  android/src/main/AndroidManifest.xml-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stepcounter">
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
  - returns true if the device has a step counter or accelerometer sensor. (usually true for Android devices)

- `startStepCounterUpdate(new Date()): boolean`:

  - `stepSensor` is set to step counter sensor or accelerometer sensor.
    - if step counter sensor is found, then register as listener.
    - else if accelerometer sensor is found instead, then register as listener.
  - create instance of sensor event listener for `stepSensor` to receive sensor events.
  - Set the appropriate listening delay depending on which type of sensor.
    - if step counter sensor is found, then set delay to Sensor.DELAY_NORMAL.
    - if accelerometer sensor is found instead, then set delay to Sensor.DELAY_FASTEST.

- `stopStepCounterUpdate(): void`:

  - unregister the listener from `sensorManager`.

- `StepCountData`:
  **Common Interface**
  - `dailyGoal`: This is a number property that indicates the user's daily goal for number of steps taken. The default value for this property is 10,000.
  - `steps`: This is a number property that indicates the number of steps taken by the user during the specified time period.
  - `calories`: This is a number property that indicates the estimated number of calories burned by the user during the specified time period.
  - `startDate`: This is a number property that indicates the start date of the data in Unix timestamp format, measured in milliseconds.
  - `endDate`: This is a number property that indicates the end date of the data in Unix timestamp format, measured in milliseconds.
  - `distance`: This is a number property that indicates the distance in meters that the user has walked or run during the specified time period.
    **Android only**
    `counterType`: This is a string property that indicates the type of counter used to count the steps. This property is only available on Android devices and can have one of two values: `STEP_COUNTER` or `ACCELEROMETER`.
    **iOS only**
  - `floorsAscended`: This is a number property that indicates the number of floors ascended by the user during the specified time period. This property is only available on iOS devices.
  - `floorsDescended`: This is a number property that indicates the number of floors descended by the user during the specified time period. This property is only available on iOS devices.

## Usage

To use the Step Counter Library in your React Native app, follow these steps:

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

Call the `startStepCounterUpdate` method from the `StepCounterModule` class to start the step counter service. Then `NativeEventEmitter` is used to listen for the `stepCounterUpdate` event.

```typescript
const [steps, setSteps] = useState(0);
const [subscription, setSubscription] = useState<EmitterSubscription>();

const startStepCounter = async () => {
  const now = new Date();
  const sub = startStepCounterUpdate(now, (data) => {
    console.log(parseStepData(data));
    setSteps(data.steps);
  });
  setSubscription(sub);
};
```

Here's an example of a complete React component that uses the `NativeStepCounter`:

```typescript
import React, { Component } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  requestPermissions,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';

type AppState = {
  granted: boolean;
  supported: boolean;
  steps: number;
};

export default class App extends Component<{}, AppState> {
  state = {
    granted: false,
    supported: false,
    steps: 0,
  };

  /** get user's motion permission and check pedometer is available */
  askPermission = async () => {
    await requestPermissions().then((response) => {
      console.debug('🐰 permissions granted?', response.granted);
      console.debug('🐰 permissions canAskAgain?', response.canAskAgain);
      console.debug('🐰 permissions expires?', response.expires);
      console.debug('🐰 permissions status?', response.status);
      this.setState({
        granted: response.granted,
      });
    });
    const featureAvailable = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', featureAvailable);
    this.setState({
      supported: featureAvailable,
    });
  };

  startStepCounter = async () => {
    const now = new Date();
    startStepCounterUpdate(now, (data) => {
      console.log(parseStepData(data));
      this.setState({
        steps: data.steps,
      });
    });
  };

  stopStepCounter() {
    this.setState({
      steps: 0,
    });
    stopStepCounterUpdate();
  }

  componentDidMount(): void {
    this.askPermission();
  }
  componentDidUpdate(_: Readonly<{}>, __: Readonly<AppState>): void {
    if (this.state.granted && this.state.supported) {
      this.startStepCounter();
    }
  }
  componentWillUnmount(): void {
    this.stopStepCounter();
  }

  render() {
    return (
      <SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Motion Tracking Permission: {this.state.granted ? 'granted' : 'denied'}</Text>
          {!this.state.granted ? (
            <Button title="Request Permission" onPress={this.askPermission} />
          ) : (
            <>
                <Text style={{ fontSize: 36, color: '#000' }}>걸음 수: {this.state.steps}</Text>
              <Button title="Start StepCounter Updates" onPress={this.startStepCounter} />
              <Button title="Stop StepCounter Updates" onPress={this.startStepCounter} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }
}
```

## Contributing

See the [Contributing Guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
