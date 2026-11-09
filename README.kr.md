# React-Native Step Counter Library

English-speaking developers, please return to the repository main page or click [the following link](README.md)

사용자가 일정 시간 걸은 걸음 수를 계산하기 위한 리액트 네이티브 모듈입니다. 이 패키지는 Android의 `StepCounter` 센서, Android 기기에서 하드웨어 스텝 카운터를 사용할 수 없을 때의 가속도계 기반 폴백, iOS의 `Core Motion` 프레임워크를 사용합니다.

## 설치 방법

```shell
npm install react-native-step-counter-newarch
```

```shell
yarn add react-native-step-counter-newarch
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
  - `supported`는 걸음 수를 측정할 센서가 있는지를 나타냅니다. Android에서는 실제 스텝 카운터나 가속도계 중 하나가 있으면 지원하며, 하드웨어 feature 플래그만으로 지원 여부를 판단하지 않습니다.
  - `granted`는 센서 유무와 별개로 권한 상태를 나타냅니다. Android 10(API 29) 이상에서는 두 센서 모두 `ACTIVITY_RECOGNITION` 권한을 확인하며, 사용자가 거부한 권한을 가속도계로 우회하지 않습니다. API 24~28에서는 해당 런타임 권한이 필요하지 않으므로 `granted`는 `true`입니다.
  - 필요한 권한을 요청한 뒤에는 지원 여부와 권한 상태를 다시 확인하고 시작하세요. 기존 Android 전용 런타임 필드 `working`은 센서 등록이 성공한 뒤 중지되거나 호스트가 종료되기 전까지 `true`입니다. 이 값은 센서 이벤트 수신을 보장하지 않으며 공개 TypeScript 반환 타입에는 포함되지 않습니다.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: EmitterSubscription:
  - Android에서는 시작할 때마다 권한과 센서를 다시 확인하고 이전 센서를 중지한 뒤 하드웨어 스텝 카운터를 우선 사용합니다.
  - 하드웨어 스텝 카운터가 없거나 등록에 실패하면 권한이 허용된 상태에서만 사용 가능한 가속도계를 시도합니다. 센서가 없거나 권한이 거부되었거나 등록에 실패하면 네이티브 카운팅은 중지 상태로 남고 실패한 센서의 메타데이터도 전송하지 않습니다. 반환된 JS 구독만으로 네이티브 센서 등록 성공을 판단할 수는 없습니다.
  - `start`는 `Date` 객체로, 이벤트를 수신하기 시작할 날짜를 나타냅니다. (new Date())

- `stopStepCounterUpdate()`: void:
  - `startStepCounterUpdate`로 등록된 구독을 제거하고 네이티브 센서 세션을 중지합니다.

- `createStepCountFilter(options?: StepCountFilterOptions)`: `(data: StepCountData) => StepCountData | null`:
  - 손으로 휴대폰을 축을 중심으로 돌리는 것처럼 센서 오탐이 발생할 수 있는 라이브 업데이트를 걸러내기 위한 상태 기반 필터를 생성합니다.
  - `startDate`부터 경과한 측정 시간과 누적 걸음 수를 `minimumStepIntervalMs`(기본값 250ms) 기준으로 비교합니다. 이벤트가 짧은 간격으로 도착해도 세션 전체에서 가능한 누적값이면 유지합니다. 이 기준을 초과한 이벤트는 버리고 이후 걸음 수와 거리에서 차감합니다. 세션 앞부분의 유휴 시간 때문에 전체 기준을 초과하지 않는 오탐은 판별할 수 없습니다.
  - 잘못된 걸음 수·날짜·거리, 중복되거나 역순인 종료 시각, 같은 세션에서 감소한 걸음 수·거리는 상태를 바꾸지 않고 무시합니다. 더 새로운 `startDate`는 새 세션으로 처리하고 이전 세션의 이벤트는 무시합니다. 시작 시각이 같은 백엔드 전환은 종료 시각이 더 최신일 때만 허용하며, 이전 백엔드는 다음 세션까지 무시합니다.
  - iOS에서 거리를 구할 수 없어 `null`을 보내도 걸음 수는 처리합니다. 같은 세션·백엔드에서 마지막으로 받은 거리를 유지하고, 아직 받은 거리가 없으면 0으로 시작합니다.
  - 구독마다 새 필터를 만드세요. 같은 `startDate`와 백엔드로 다시 시작하거나 카운터를 초기화할 때, 또는 무시 중인 백엔드로 돌아갈 때도 필터를 새로 만들어야 합니다. 누적값만으로는 이러한 경계를 구분할 수 없습니다. 명시적인 세션·백엔드 전환에서는 더 작은 누적값으로 다시 시작할 수 있습니다.
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
} from "react-native-step-counter-newarch";
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
