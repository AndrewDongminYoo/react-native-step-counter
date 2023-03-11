# React-Native Step Counter Library

English-speaking developers, please return to the repository main page or click [the following link](README.md)

간단한 리액트 네이티브 패키지로 사용자의 걸음 수를 계산합니다.이 패키지는 `Android`의 `StepCounter` (미지원 시 `Accelerometer`) 센서 API를 사용하고 `iOS`의 `CoreMotion` `Framework CMPedometer` 를 사용하여 단계를 계산합니다.

## 설치 방법

```zsh
npm install @dongminyu/react-native-step-counter

# Yarn을 선호하는 경우
yarn add @dongminyu/react-native-step-counter
```

## 사전 요구사항

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
  <key>NSMotionUsageDescription</key>
  <string>We want to access your motion data to count your steps.</string>
  <key>NSHealthUpdateUsageDescription</key>
  <string>We want to update your workout data to count your steps.</string>
  ...
</plist>
```

## Interface

- `isStepCountingSupported(): Promise<Record<string, boolean>>`: 장치에 단계 카운터가 있는지 확인하는 방법 또는 가속도계 센서.

  - 필요한 센서에 대한 권한을 요청하고 장치에 단계 카운터 또는 가속도계 센서가 있는지 확인합니다.
  - 장치에 단계 카운터 또는 가속도계 센서가 있으면 True를 반환합니다. 그렇지 않으면 거짓. (대부분의 경우 True)

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback): EmitterSubscription`:

  - `stepSensor` 를 스텝카운터 센서 혹은 가속도계 센서로 설정합니다.
    - 스텝 카운터 센서가 발견되면 `stepSensor`로 등록합니다.
    - 스텝 카운터 센서가 발견되지 않으면 가속도계 센서를 `stepSensor`로 등록합니다.
  - create instance of sensor event listener for `stepSensor` to receive sensor events.
  - 센서 유형에 따라 적절한 이벤트 수신 주기를 설정합니다.
    - 스텝 카운터 센서가 발견되면 비교적 빈도가 낮은 센서를 설정합니다.
    - 대신 가속도계 센서가 발견되면 짧은 주기로 센서를 설정합니다.

- `stopStepCounterUpdate(): void`:

  - `sensorManager`의 센서 이벤트 리스너를 해제합니다.

- `StepCountData`:
  - `steps`: 지정된 기간 동안 사용자가 걸은 걸음 수를 나타내는 숫자 속성입니다.
  - `startDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 시작 날짜를 나타내는 숫자 속성입니다.
  - `endDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 종료 날짜를 나타내는 숫자 속성입니다.
  - `distance`: 이것은 지정된 기간 동안 사용자가 걸거나 뛴 거리를 미터로 나타내는 숫자 속성입니다.
  - `counterType`: 이것은 걸음을 감지하는 데 사용되는 센서 유형을 나타내는 문자열 타입으로, iOS에서는 `CMPedometer`, 안드로이드에서는 `STEP_COUNTER` 또는 `ACCELEROMETER`의 두 가지 값 중 하나를 가질 수 있습니다.

## Usage

React Native 앱에서 Step Counter Library를 사용하려면 다음 단계를 따르세요.:

라이브러리를 React Native 앱으로 임포트합니다.

```typescript
import React, { useEffect, useState } from 'react';
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from '@dongminyu/react-native-step-counter';
```

`isStepCountingSupported` 메소드를 사용하여 장치에 스텝 카운터 또는 가속도계 센서가 있는지 확인합니다.

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

스텝 카운터를 시작하려면 `startStepCounterUpdate` 메소드를 호출합니다.

```typescript
const [steps, setSteps] = useState(0);

async function startStepCounter() {
  startStepCounterUpdate(new Date(), (data) => {
    console.debug(parseStepData(data));
    setSteps(data.steps);
  });
}
```

다음은 `NativeStepCounter`를 사용하는 리액트 네이티브 애플리케이션의 예시입니다.

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
          <Button title="Request Permission Again" onPress={requestPermission} />
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

## Change Log

패키지의 버전별 변경 사항을 확인하려면 [CHANGELOG](CHANGELOG.md)를 참조하십시오.

## Contributing

리포지토리 및 개발 워크 플로에 기여하는 방법을 알고 싶으시다면 [Contributing Guide](CONTRIBUTING.md)를 참조하십시오.

## License

MIT

---

[create-react-native-library](https://github.com/callstack/react-native-builder-bob)를 사용해 개발했습니다.
