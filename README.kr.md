# React-Native Step Counter Library

English-speaking developers, please return to the repository main page or click [the following link](README.md)

사용자가 일정시간 걸은 걸음 수를 계산하기 위한 간단한 리액트 네이티브 모듈입니다. 이 패키지는 Android의 `StepCounter`(또는 가속도계 기반 자체 만보계 센서) 센서 `API`와 iOS의 `Core Motion` 프레임워크를 사용하여 스텝을 카운트합니다. 리액트 네이티브의 새로운 모듈 개발 아키텍처인 터보 모듈을 사용하여 제작되었습니다. 새로운 아키텍처와 레거시 아키텍처 둘다 호환되도록 만들었습니다. (터보 모듈과 패브릭 컴포넌트 모두 아직 실험 단계에 있기 때문에 보편적으로 사용되지는 않는 것 같습니다.)

## 설치 방법

```shell
# npm을 사용한다면, (기본 패키지 매니저입니다.)
npm install @dongminyu/react-native-step-counter
```

```shell
# Yarn을 선호한다면, (병렬 설치를 지원해 빠른 속도를 제공하는 패키지 매니저입니다.)
yarn add @dongminyu/react-native-step-counter
```

```shell
# pnpm을 선호한다면, (글로벌 패키지와 하드링크로 빠른 속도를 제공하는 패키지 매니저입니다.)
pnpm add @dongminyu/react-native-step-counter
```

리액트네이티브 0.60 버전 이후 설치된 네이티브 모듈은 오토 링크됩니다. 네이티브 모듈을 수동으로 연결할 필요가 없습니다.

> ⚠️ **v0.3.0부터 New Architecture 필수**: 이 버전부터는 React Native의 New Architecture(TurboModule/Fabric)가 반드시 활성화되어 있어야 합니다. Expo Go, Expo 관리형 워크플로, 또는 구버전 React Native(0.68 미만)와는 호환되지 않습니다.

👣 아직 New Architecture를 활성화하지 않았다면 아래 가이드를 따라 설정하세요. 이미 New Architecture를 활성화하고 사전설정을 마친 상태라면, [다음 단계](#android)로 넘어갑니다.

## 독립 앱에서 사용할 수 있는 리얼월드 예제 앱을 원하시는 분들은 [walking_tracker](https://github.com/AndrewDongminYoo/walking_tracker) 참고

저의 첫 NPM 오픈소스 패키지에 많은 관심 가져주셔서 감사합니다! 배포 이후 사용자 분들로부터 특히 리액트 네이티브 신규 아키텍쳐 하위호환에 관한 이슈 제보가 많았습니다. 전반적으로 코드 구조를 고치면서 해당 이슈를 어느 정도 마무리했습니다. [create-react-native-library](https://github.com/callstack/react-native-builder-bob)의 템플릿으로부터 생성되는 example 폴더에 예제 앱을 작성했고 저도 개발 중에 사용해왔지만, 해당 템플릿의 구조 상 example 폴더가 하나의 standalone 애플리케이션보다는 전체 개발 프로세스의 한 부분을 맡고 있는 관계로, 실제 사용하는 앱에서 참고하기에는 부적합한 코드들이 다수 포함되어 있는 점을 발견했습니다. 이 때문에 비공식적으로 서브 리포지토리로 개발 중이던 example 애플리케이션을 [walking_tracker](https://github.com/AndrewDongminYoo/walking_tracker)라는 이름의 리포지토리로 독립 관리하려고 합니다. 이 점을 꼭 참고해 주시면 감사하겠습니다.

---

## 라이브러리를 의존성에 추가하기 전 사전세팅

- 리액트 네이티브 애플리케이션 공통 변경사항 셋업
  1. React Native는 [`0.68.0`](https://reactnative.dev/blog/2022/03/30/version-068#opting-in-to-the-new-architecture) 버전 릴리스와 함께 새 아키텍처를 디폴트로 선언했습니다. 따라서 이 버전 이하의 리액트네이티브 라이브러리를 의존하고 있는 애플리케이션은 업데이트해야 합니다. 안드로이드는 0.71.0 이상으로 업데이트하는 것이 좋습니다.
  2. 대부분의 리액트 네이티브 문서와 마찬가지로 이 문서는 최신 리액트 네이티브 [릴리즈](https://github.com/facebook/react-native/releases/latest) 버전을 사용한다는 것을 전제로 작성되었습니다.
  3. 버전 업그레이드에 어려움을 겪고 있다면 다음 페이지를 참고하시길 바랍니다. [새로운 버전으로 업그레이드](https://reactnative.dev/docs/upgrading).
  4. 리액트 네이티브 코드젠(네이티브 코드 생성 변환 모듈)은 모호한 타입과 다이나믹한 타입을 지원해주지 않기 때문에, 모든 자바스크립트 브릿지 파일들은 [TypeScript](https://www.typescriptlang.org/) 또는 [Flow.js](https://flow.org/)로 작성되어야 합니다. (코드 제너레이터에 입력되지 않는 코드들은 타입 세이프하지 않아도 무관하지만, 최신의 리액트 네이티브 디폴트 랭귀지로 타입스크립트가 선택된 점을 고려하세요.)
  5. 헤르메스 엔진과 플리퍼 디버깅 도구를 사용합니다.
     - [Hermes](https://reactnative.dev/docs/hermes)는 Android 및 iOS에서 React Native 앱을 실행하도록 최적화된 새로운 JavaScript 엔진입니다. 최신 리액트 네이티브 버전에서 기본적으로 활성화되어 있으며, 기존의 JSC를 사용하려면 명시적으로 비활성화 해야합니다. 적은 리소스와 빠른 속도 퍼포먼스는 일반적으로 헤르메스가 강하지만, 디버그 모드에서 JSC를 사용하는 것이 더 간편한 면도 있습니다.
     - [Flipper](https://fbflipper.com/)는 리액트 네이티브의 새로운 디버깅 및 프로파일링 도구입니다. 헤르메스 엔진을 사용하는 경우, Flipper를 사용하는 것이 디버깅에서 보다 쾌적한 개발 경험을 제공합니다.

- 리액트 네이티브 애플리케이션 iOS 변경사항 셋업

  _1_. 대상 iOS 플랫폼 버전을 [12.4](https://github.com/facebook/react-native/blob/main/CHANGELOG.md#ios-specific-25)혹은 그 이상으로 설정합니다. ([min_ios_version_supported](https://github.com/facebook/react-native/blob/main/scripts/react_native_pods.rb#LL29-L31C4))

  ```diff
  - platform :ios, '11.0'
  + platform :ios, '12.4'
  # ↓ or you can use the variable of (react_native_pods.rb)
  + platform :ios, min_ios_version_supported
  ```

  _2_. NODE_BINARY 환경 변수를 설정합니다. (이는 XCode 리액트 네이티브 빌드 스크립트에서 사용됩니다.)

  ```shell
  echo 'export NODE_BINARY=$(command -v node)' > .xcode.env
  ```

  _3_. `AppDelegate.m` 파일의 API 코드를 수정합니다.

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

  _4_. ios 애플리케이션 폴더 내의 모든 Objective-C(.m) 파일의 이름을 Objective-C++(.mm)으로 변경합니다. (Objective-C++의 문법은 Objective-C의 확장입니다.)
  _5_. ios 애플리케이션 폴더 내의 AppDelegate 파일(헤더파일/소스파일)들이 RCTAppDelegate 인터페이스를 구현하도록 변경합니다.
  - `AppDelegate.h` 수정 예시:

    ```diff
    - #import <React/RCTBridgeDelegate.h>
    + #import <RCTAppDelegate.h>
    #import <UIKit/UIKit.h>

    - @interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>
    + @interface AppDelegate : RCTAppDelegate

    - @property (nonatomic, strong) UIWindow *window;
    @end
    ```

  - `AppDelegate.mm` 수정 예시:

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

  > **Swift 프로젝트 안내 (React Native 0.76 이상):** `AppDelegate.swift` 기반의 앱이라면 New Architecture가 이미 기본 활성화되어 있습니다. AppDelegate 파일 수정 없이 `RCT_NEW_ARCH_ENABLED=1`을 설정한 뒤 `pod install`만 실행하면 됩니다.
  - Run `pod install`

    ```shell
    export RCT_NEW_ARCH_ENABLED=1
    cd example/ios && pod install
    ```

- 리액트 네이티브 애플리케이션 안드로이드 변경사항 셋업
  1. 프로젝트에 사용되는 리액트 네이티브 버전이 `v0.71.0` 이상인 경우 안드로이드 네이티브의 대부분의 사전 설정 되어 있는 상태이므로, 새로운 아키텍쳐를 사용하기 위해 따로 설정해야 할 것이 많지 않습니다.
  2. `android/gradle.properties` 파일에서 `newArchEnabled`를 `true`로 설정하기만 하면 됩니다.

> 공식 문서를 읽는 것을 더 선호한다면 [여기](https://reactnative.dev/docs/new-architecture-intro)에서 찾을 수 있습니다.

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

- `isStepCountingSupported()`: `Promise<{ supported: boolean; granted: boolean }>`: 장치에 기능 관련 스텝 카운터 또는 가속도계가 있는지 확인하는 메서드입니다.
  - 응답 객체의 키 `granted`의 Boolean 값은 앱 사용자가 이 기능 사용 권한을 부여했는지 권한 허용 여부이며, `supported`는 장치가 이 기능을 지원하는지 여부입니다. 장치에 스텝 카운터 센서가 존재하는지만을 체크하기 때문에 실제로 사용가능한 상태인지는 알 수 없습니다.
  - 이 응답의 참/거짓 값과 실제 센서의 작동 여부는 일치하지 않을 수 있습니다. 만보계 센서를 찾지 못하거나 사용자가 접근을 거부한 경우에도, 모듈은 동작센서 권한 허용과 관계없이 원시 가속도계에 알고리즘을 적용하여 보행 이벤트 데이터를 추출하는 것이 가능하지만 권장되지 않습니다. 사용자가 읽기 권한을 거부할 경우 센서 이벤트 추적을 중지하는 코드를 반드시 작성해야 합니다.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: EmitterSubscription:
  - 만보계 센서가 장치에서 지원되고 사용 가능한 상태인 경우 센서 매니저의 수신기 이벤트 리스너를 등록하고 스텝 카운트 이벤트 수신기를 자바스크립트에 전달합니다.
  - 만보계 센서가 장치에서 지원되지 않거나 사용할 수 없는 경우, 가속도계 센서를 리스너에 등록하고, 걸음을 감지하는 벡터 알고리즘 필터를 통해 걸음 이벤트를 생성한 후 앱으로 전달합니다.
  - `start`는 `Date` 객체로, 이벤트를 수신하기 시작할 날짜를 나타냅니다. (new Date())
  -

- `stopStepCounterUpdate()`: void:
  - `sensorManager`에 등록되어 있는 센서 이벤트 리스너를 해제합니다.

- `StepCountData`:
  - **공통 데이터**
    - `steps`: 지정된 기간 동안 사용자가 걸은 걸음 수를 나타내는 숫자 속성입니다.
    - `startDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 시작 날짜를 나타내는 숫자 속성입니다.
    - `endDate`: 이것은 밀리세컨드로 측정 된 UNIX 타임 스탬프 형식의 데이터의 종료 날짜를 나타내는 숫자 속성입니다.
    - `distance`: 이것은 지정된 기간 동안 사용자가 걸거나 뛴 거리를 미터로 나타내는 숫자 속성입니다. (안드로이드는 지원하지 않기 때문에 임의 설정한 상수와 걸음 수를 이용해 계산됩니다.)
    - `counterType`: (`CounterType`) 걸음을 감지하는 데 사용되는 센서 유형을 나타내는 유니온 타입입니다. iOS에서는 `"CMPedometer"`, 안드로이드에서는 하드웨어 만보계 센서 사용 시 `"STEP_COUNTER"`, 가속도계 폴백 사용 시 `"ACCELEROMETER"` 중 하나의 값을 가집니다.

  - **iOS에만 있음**
    - `floorsAscended`: 지정된 기간 동안 사용자가 상승한 층의 수를 나타내는 숫자 속성입니다. 기기가 이 기능을 지원하지 않으면 `nil`이 될 수 있습니다.
    - `floorsDescended`입니다: 지정된 기간 동안 사용자가 하강한 층의 수를 나타내는 숫자 속성입니다. 기기가 이 기능을 지원하지 않으면 `nil`이 될 수 있습니다.
    - `currentPace`: (iOS 9.0+) 사용자의 현재 걸음걸이 속도를 meter/s 단위로 나타내는 숫자 속성입니다.
    - `currentCadence`: (iOS 9.0+) 사용자의 현재 케이던스(박자)를 step/s 으로 나타내는 숫자 속성입니다.
    - `averageActivePace`: (iOS 10.0+) 사용자의 평균 속도를 meter/s 단위로 나타내는 숫자 속성입니다.

## Usage

리액트 네이티브 앱에서 이 라이브러리를 실제로 사용하려면 다음 단계를 따르세요.:

라이브러리를 리액트 네이티브 앱으로 임포트합니다.

```typescript
import React, { useEffect, useState } from "react";
import {
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
  startStepCounterUpdate(new Date(), (data) => {
    console.debug(parseStepData(data));
    setSteps(data.steps);
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
