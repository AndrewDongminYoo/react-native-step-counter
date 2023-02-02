# react-native-step-counter

리액트네이티브 모바일 디바이스를 위한 걸음 측정 라이브러리입니다.

## Installation

```sh
npm install react-native-step-counter

# or if you use Yarn,
yarn add react-native-step-counter
```

## Interface

- `requestPermission`: Asynchronously requests motion tracking permission from the user. Returns a promise that resolves with the permission status.

- `checkPermission`: Synchronously retrieves the current motion tracking permission status. Returns the permission status.

- `startStepCounterUpdate`: Starts updating StepCounter data. Returns a listener that should be passed to stopStepCounterUpdates to stop the updates.

- `stopStepCounterUpdate`: Stops updating stepCounter data. Accepts a listener returned by startStepCounterUpdates.

- `PermissionStatus`: An enumeration of possible permission statuses.

## Usage

To use the module, first import it in your React component:

```typescript
import {
  requestMotionTrackingPermission,
  queryMotionTrackingPermission,
  startStepCounterUpdates,
  stopStepCounterUpdates,
  PermissionStatus,
} from './NativeStepCounter';
```

Then, you can use the requestMotionTrackingPermission function to request permission from the user:

```typescript
const status = await requestMotionTrackingPermission();
```

You can use the queryMotionTrackingPermission function to retrieve the current permission status:

```typescript
const status = await queryMotionTrackingPermission();
```

Once you have permission, you can start and stop stepCounter updates:

```typescript
const stepCounterListener = startStepCounterUpdates();

stopStepCounterUpdates(stepCounterListener);
```

Here's an example of a complete React component that uses the NativeStepCounter:

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
            <Button
              title="Start StepCounter Updates"
              onPress={this.startUpdates}
            />
            <Button
              title="Stop StepCounter Updates"
              onPress={this.stopUpdates}
            />
          </>
        ) : null}
      </View>
    );
  }
}

export default App;
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
