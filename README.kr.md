# react-native-step-counter

리액트네이티브 모바일 디바이스를 위한 걸음 측정 라이브러리입니다.

## 설치

```sh
npm install react-native-step-counter

# or if you use Yarn,
yarn add react-native-step-counter
```

## 인터페이스

- `startStepCounterUpdate` '걸음 수 측정 시작': StepCounter 데이터 업데이트를 시작합니다. 추후 StepCounter 업데이트를 중지할 수 있도록 이벤트 수신기를 리턴합니다.

- `stopStepCounterUpdate` '걸음 수 측정 종료': StepCounter 데이터 업데이트를 중지합니다. startStepCounterUpdate에서 반환된 수신기를 인수로 받아 제거합니다.

- `PermissionStatus` '권한 상태': 가능한 권한 상태의 열거(Enum 타입)입니다.

## 용법

모듈을 사용하려면 먼저 React Component로 임포트해 가져옵니다:

```typescript
import {
  requestMotionTrackingPermission,
  queryMotionTrackingPermission,
  startStepCounterUpdates,
  stopStepCounterUpdates,
  PermissionStatus,
} from 'react-native-step-counter';
```

그런 다음 requestMotionTrackingPermission 기능을 사용하여 사용자에게 권한을 요청할 수 있습니다:

```typescript
const status = await requestMotionTrackingPermission();
```

queryMotionTrackingPermission 함수를 사용하여 현재 권한 상태를 검색할 수 있습니다:

```typescript
const status = await queryMotionTrackingPermission();
```

권한이 확인되면 stepCounter 업데이트를 시작 및 중지할 수 있습니다:

```typescript
const stepCounterListener = startStepCounterUpdates();

stopStepCounterUpdates(stepCounterListener);
```

다음은 NativeStepCounter를 사용하는 전체 React 컴포넌트의 예입니다:

```typescript
import React, { Component } from 'react';
import { View, Text, Button } from 'react-native';
import {
  requestMotionTrackingPermission,
  queryMotionTrackingPermission,
  startStepCounterUpdates,
  stopStepCounterUpdates,
  PermissionStatus,
} from './NativeStepCounter';

class App extends Component {
  state = {
    permissionStatus: PermissionStatus.UNDETERMINED,
    stepCounterListener: null,
  };

  componentDidMount() {
    queryMotionTrackingPermission()
      .then((status) => this.setState({ permissionStatus: status }))
      .catch((error) => console.error(error));
  }

  requestPermission = async () => {
    try {
      const status = await requestMotionTrackingPermission();
      this.setState({ permissionStatus: status });
    } catch (error) {
      console.error(error);
    }
  };

  startUpdates = () => {
    const stepCounterListener = startStepCounterUpdates();
    this.setState({ stepCounterListener });
  };

  stopUpdates = () => {
    stopStepCounterUpdates(this.state.stepCounterListener);
    this.setState({ stepCounterListener: null });
  };

  render() {
    const { permissionStatus, stepCounterListener } = this.state;

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Motion Tracking Permission: {permissionStatus}</Text>
        {permissionStatus === PermissionStatus.UNDETERMINED ? (
          <Button title="Request Permission" onPress={this.requestPermission} />
        ) : null}
        {permissionStatus === PermissionStatus.GRANTED ? (
          <>
            <Button title="Start StepCounter Updates" onPress={this.startUpdates} />
            <Button title="Stop StepCounter Updates" onPress={this.stopUpdates} />
          </>
        ) : null}
      </View>
    );
  }
}

export default App;
```

## 기여

[기여 가이드](CONTRIBUTING.md)에서 저장소 및 개발 워크플로우에 기여하는 방법을 알아보십시오.

## 라이선스

MIT

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
