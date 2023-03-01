# React-Native Step Counter Library

A simple React Native package to count the number of steps taken by the user. This package uses the StepCounter (or Accelerometer) Sensor API on Android and the Core Motion framework on iOS to count the steps.

## Installation

```zsh
npm install @donminyu/react-native-step-counter

# or if you use Yarn,
yarn add @donminyu/react-native-step-counter
```

## Requirements

### ANDROID

```xml
<!--  android/src/main/AndroidManifest.xml-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stepcounter">
  <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
  <uses-permission android:name="android.permission.BODY_SENSORS" />
  <uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />

  <uses-feature
    android:name="android.hardware.sensor.stepcounter"
    android:required="true" />
  <uses-feature
    android:name="android.hardware.sensor.stepdetector"
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
import React, { useEffect, useState } from 'react';
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
```

Use the `isStepCountingSupported` method to check if the device has a step counter or accelerometer sensor.

```typescript
const [supported, setSupported] = useState(false);
const [granted, setGranted] = useState(false);

async function askPermission() {
  isStepCountingSupported().then((result) => {
    console.debug('🚀 - isStepCountingSupported', result);
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

Here's an example of a complete React component that uses the `NativeStepCounter`:

```typescript
export default function App() {
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState(false);
  const [steps, setSteps] = useState(0);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    isStepCountingSupported().then((result) => {
      console.debug('🚀 - isStepCountingSupported', result);
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  }

  async function startStepCounter() {
    startStepCounterUpdate(new Date(), (data) => {
      console.debug(parseStepData(data));
      setSteps(data.steps);
    });
  }

  function stopStepCounter() {
    setSteps(0);
    stopStepCounterUpdate();
  }

  useEffect(() => {
    console.debug('🚀 - componentDidMount');
    askPermission();
    return () => {
      console.debug('🚀 - componentWillUnmount');
      stopStepCounter();
    };
  }, []);

  useEffect(() => {
    console.debug('🚀 - componentDidUpdate');
    if (granted && supported) {
      console.debug('🚀 - granted and supported');
      startStepCounter();
    } else if (granted && !supported) {
      console.debug('🚀 - granted but not supported');
      startStepCounter();
    } else if (supported && !granted) {
      console.debug('🚀 - supported but not granted');
      requestPermission().then((accepted) => {
        console.debug('🚀 - requestPermission', accepted);
        setGranted(accepted);
      });
    }
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.normText}>User Granted Step Counter Feature?: {granted ? 'yes' : 'no'}</Text>
        <Text style={styles.normText}>Device has Step Counter Sensor?: {supported ? 'yes' : 'no'}</Text>
        {!granted ? (
          <>
            <Button title="Request Permission Again" onPress={requestPermission} />
          </>
        ) : (
          <>
            <Text style={styles.normText}>걸음 수: {steps}</Text>
            <Button title="Start StepCounter Updates" onPress={startStepCounter} />
            <Button title="Stop StepCounter Updates" onPress={stopStepCounter} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
```

## Contributing

See the [Contributing Guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
