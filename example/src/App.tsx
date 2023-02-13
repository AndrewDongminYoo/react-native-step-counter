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
import {
  check,
  openSettings,
  Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from 'react-native-permissions';

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
        case RESULTS.GRANTED:
          return true;
        case RESULTS.LIMITED:
          return true;
        case RESULTS.UNAVAILABLE:
          return false;
        case RESULTS.DENIED:
          return false;
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
    const sub = this.nativeEventEmitter.addListener(
      'stepCounterUpdate',
      (data) => {
        this.setState({ stepData: data });
      }
    );
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

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  step: {
    fontSize: 36,
    color: '#000',
  },
});
