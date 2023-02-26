# React-Native Step Counter Library

간단한 리액트 네이티브 패키지로 사용자의 걸음 수를 계산합니다.이 패키지는 `Android`의 `StepCounter` (미지원 시 `Accelerometer`) 센서 API를 사용하고 `iOS`의 `CoreMotion` `Framework CMPedometer` 를 사용하여 단계를 계산합니다.

## 설치 방법

```zsh
npm install react-native-step-counter

# Yarn을 선호하는 경우
yarn add react-native-step-counter
```

## 사전 요구사항

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
  <!-- 권한 섹션 시작 -->
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>We want to access your location to count your steps.</string>
  <key>NSMotionUsageDescription</key>
  <string>We want to access your motion data to count your steps.</string>
  <key>NSHealthShareUsageDescription</key>
  <string>We want you share your health data to count your steps.</string>
  <key>NSHealthUpdateUsageDescription</key>
  <string>We want to update your workout data to count your steps.</string>
  <!-- 권한 섹션 종료 -->
  ...
</plist>
```

## Interface

- `isStepCountingSupported(): boolean`: 장치에 단계 카운터가 있는지 확인하는 방법 또는 가속도계 센서.

  - 필요한 센서에 대한 권한을 요청하고 장치에 단계 카운터 또는 가속도계 센서가 있는지 확인합니다.
  - 장치에 단계 카운터 또는 가속도계 센서가 있으면 True를 반환합니다. 그렇지 않으면 거짓. (대부분의 경우 True)

- `startStepCounterUpdate(new Date()): boolean`:

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
  **Common Interface**
  - `dailyGoal`: 걷기에 대한 사용자의 일일 목표를 나타내는 숫자 속성입니다. 임의로 설정된 기본값은 만 보 입니다.
  - `steps`: 지정된 기간 동안 사용자가 걸은 걸음 수를 나타내는 숫자 속성입니다.
  - `calories`: 이것은 지정된 기간 동안 사용자가 연소한 예상 칼로리 수를 나타내는 숫자 속성입니다. 사용자의 몸무게 등을 수집하지 않기 때문에 정확하지 않을 수 있습니다.
  - `startDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 시작 날짜를 나타내는 숫자 속성입니다.
  - `endDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 종료 날짜를 나타내는 숫자 속성입니다.
  - `distance`: 이것은 지정된 기간 동안 사용자가 걸거나 뛴 거리를 미터로 나타내는 숫자 속성입니다.
    **Android only**
    `counterType`: 이것은 걸음을 감지하는 데 사용되는 카운터 유형을 나타내는 문자열 속성입니다.이 속성은 Android 장치에서만 디버깅 용도로 사용할 수 있으며 `STEP_COUNTER` 또는 `ACCELEROMETER`의 두 가지 값 중 하나를 가질 수 있습니다.
    **iOS only**
  - `floorsAscended`: 이것은 지정된 기간 동안 사용자가 올라간 층 수를 나타내는 숫자 속성입니다.이 속성은 iOS 장치에서만 사용할 수 있습니다.
  - `floorsDescended`: 이것은 지정된 기간 동안 사용자가 내려온 층 수를 나타내는 숫자 속성입니다.이 속성은 iOS 장치에서만 사용할 수 있습니다.

## Usage

React Native 앱에서 Step Counter Library를 사용하려면 다음 단계를 따르세요.:

라이브러리를 React Native 앱으로 임포트합니다.

```typescript
import RNStepCounter, {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
```

`isStepCountingSupported` 메소드를 사용하여 장치에 스텝 카운터 또는 가속도계 센서가 있는지 확인합니다.

```typescript
const [supported, setSupported] = useState(false);
async function askPermission() {
  const granted = isStepCountingSupported();
  console.debug('🚀 - isStepCountingSupported', granted);
  setSupported(supported);
  return supported;
}
```

스텝 카운터를 시작하려면`StepCounterModule` '클래스의 `startStepCounterUpdate` 메소드를 호출합니다. `NativeEventEmitter`를 사용하여 센서 이벤트를 수신합니다.

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

다음은 `NativeStepCounter`를 사용하는 리액트 네이티브 애플리케이션의 예시입니다.

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

리포지토리 및 개발 워크 플로에 기여하는 방법을 알고 싶으시다면 [Contributing Guide](CONTRIBUTING.md)를 참조하십시오.

## License

MIT

---

[create-react-native-library](https://github.com/callstack/react-native-builder-bob)를 사용해 개발했습니다.
