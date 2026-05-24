# React-Native Step Counter Library

English-speaking developers, please return to the repository main page or click [the following link](README.md)

사용자가 일정 시간 걸은 걸음 수를 계산하기 위한 리액트 네이티브 모듈입니다. 이 패키지는 Android의 `StepCounter` 센서, Android 기기에서 하드웨어 스텝 카운터를 사용할 수 없을 때의 가속도계 기반 폴백, iOS의 `Core Motion` 프레임워크를 사용합니다.

## 설치 방법

```shell
npm install @dongminyu/react-native-step-counter
```

```shell
yarn add @dongminyu/react-native-step-counter
```

리액트네이티브 0.60 버전 이후 설치된 네이티브 모듈은 오토 링크됩니다. 네이티브 모듈을 수동으로 연결할 필요가 없습니다.

## 요구 사항

- React Native `>=0.71.0`
- React Native CLI 앱. 네이티브 코드가 포함되어 있으므로 Expo Go는 지원하지 않습니다.

### ANDROID

앱에 아래 권한과 센서 feature 선언이 없다면 추가하세요.

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

앱의 `Info.plist`에 `NSMotionUsageDescription`을 추가하세요.

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

- `isStepCountingSupported()`: `Promise<{ supported: boolean; granted: boolean }>`: 장치에 기능 관련 스텝 카운터 또는 가속도계가 있는지 확인하는 메서드입니다.
  - 응답 객체의 키 `granted`의 Boolean 값은 앱 사용자가 이 기능 사용 권한을 부여했는지 권한 허용 여부이며, `supported`는 장치가 이 기능을 지원하는지 여부입니다.
  - Android에서는 하드웨어 스텝 카운터를 사용할 수 없을 때 가속도계 기반 카운팅으로 폴백할 수 있습니다. 그래도 업데이트를 시작하기 전에 플랫폼의 동작/활동 권한을 요청하고 사용자의 권한 선택을 존중해야 합니다.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: EmitterSubscription:
  - 만보계 센서가 장치에서 지원되고 사용 가능한 상태인 경우 센서 매니저의 수신기 이벤트 리스너를 등록하고 스텝 카운트 이벤트 수신기를 자바스크립트에 전달합니다.
  - 만보계 센서가 장치에서 지원되지 않거나 사용할 수 없는 경우, 가속도계 센서를 리스너에 등록하고, 걸음을 감지하는 벡터 알고리즘 필터를 통해 걸음 이벤트를 생성한 후 앱으로 전달합니다.
  - `start`는 `Date` 객체로, 이벤트를 수신하기 시작할 날짜를 나타냅니다. (new Date())

- `stopStepCounterUpdate()`: void:
  - `startStepCounterUpdate`로 등록된 구독을 제거하고 네이티브 센서 세션을 중지합니다.

- `createStepCountFilter(options?: StepCountFilterOptions)`: `(data: StepCountData) => StepCountData | null`:
  - 손으로 휴대폰을 축을 중심으로 돌리는 것처럼 센서 오탐이 발생할 수 있는 라이브 업데이트를 걸러내기 위한 상태 기반 필터를 생성합니다.
  - `minimumStepIntervalMs`보다 빠른 보행 간격을 의미하는 버스트 업데이트를 버리고, 이후 누적 값에서 무시한 걸음 수를 보정합니다.
  - 하드웨어/OS 만보계가 이미 오탐을 걸음으로 판단한 경우 패키지는 원시 움직임 정보를 받을 수 없습니다. 앱에서 원시 센서 스트림보다 엄격한 라이브 세션 카운트가 필요할 때 이 헬퍼를 사용하세요.

- `StepCountData`:
  - **공통 데이터**
    - `steps`: 지정된 기간 동안 사용자가 걸은 걸음 수를 나타내는 숫자 속성입니다.
    - `startDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 시작 날짜를 나타내는 숫자 속성입니다.
    - `endDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 종료 날짜를 나타내는 숫자 속성입니다.
    - `distance`: 이것은 지정된 기간 동안 사용자가 걸거나 뛴 거리를 미터로 나타내는 숫자 속성입니다. (안드로이드는 지원하지 않기 때문에 임의 설정한 상수와 걸음 수를 이용해 계산됩니다.)
    - `counterType`: (`CounterType`) 걸음을 감지하는 데 사용되는 센서 유형을 나타내는 유니온 타입입니다. iOS에서는 `"CMPedometer"`, 안드로이드에서는 하드웨어 만보계 센서 사용 시 `"STEP_COUNTER"`, 가속도계 폴백 사용 시 `"ACCELEROMETER"` 중 하나의 값을 가집니다.

  - **iOS에만 있음**
    - `floorsAscended`: 지정된 기간 동안 사용자가 상승한 층의 수를 나타내는 숫자 속성입니다. 기기가 이 기능을 지원하지 않으면 `nil`이 될 수 있습니다.
    - `floorsDescended`: 지정된 기간 동안 사용자가 하강한 층의 수를 나타내는 숫자 속성입니다. 기기가 이 기능을 지원하지 않으면 `nil`이 될 수 있습니다.

## Usage

리액트 네이티브 앱에서 이 라이브러리를 실제로 사용하려면 다음 단계를 따르세요.:

라이브러리를 리액트 네이티브 앱으로 임포트합니다.

```typescript
import React, { useEffect, useState } from "react";
import {
  createStepCountFilter,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from "@dongminyu/react-native-step-counter";
```

`isStepCountingSupported` 메소드를 사용하여 장치에 스텝 카운터 또는 가속도계 센서가 있는지 확인합니다.

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

스텝 카운터를 시작하려면 `startStepCounterUpdate` 메소드를 호출합니다.

```typescript
const [steps, setSteps] = useState(0);

async function startStepCounter() {
  const filterStepCountData = createStepCountFilter();

  startStepCounterUpdate(new Date(), (data) => {
    const filteredData = filterStepCountData(data);
    if (!filteredData) {
      return;
    }

    console.debug(parseStepData(filteredData));
    setSteps(filteredData.steps);
  });
}
```

다음은 `NativeStepCounter`를 사용하는 리액트 네이티브 애플리케이션의 예시입니다.

예제 앱 코드 보기: [링크](https://github.com/AndrewDongminYoo/react-native-step-counter/blob/main/example/src/App.tsx)

## Change Log

패키지의 버전별 변경 사항을 확인하려면 [`Release Notes`](CHANGELOG.md)를 참조하십시오.

## Contributing

리포지토리 및 개발 워크 플로에 기여하는 방법을 알고 싶으시다면 [`Contributing Guide`](CONTRIBUTING.md)를 참조하십시오.

## License

MIT

---

[CallStack](https://callstack.com/)의 [create-react-native-library](https://github.com/callstack/react-native-builder-bob/tree/main/packages/create-react-native-library)를 사용해 개발했습니다.
