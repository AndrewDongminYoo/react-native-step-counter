import React, { useCallback, useEffect, useState } from 'react';
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
  ]).then((statuses) => {
    console.log('RequiredPermissions', statuses);
  });
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
    .catch((_) => {
      openSettings();
      return false;
    });
}

const App = () => {
  const [allowed, setAllow] = useState(false);
  const [steps, setSteps] = useState(0);
  const [subscription, setSubscription] = useState<EmitterSubscription>();
  const nativeEventEmitter = new NativeEventEmitter(RNStepCounter);

  /** get user's motion permission and check pedometer is available */
  const askPermission = async () => {
    await requestRequiredPermissions();
    const granted = await (Platform.OS === 'ios'
      ? checkPermission(PERMISSIONS.IOS.MOTION)
      : checkPermission(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION));

    console.debug('🚀 - file: App.tsx:18 - granted', granted);
    const supported = isStepCountingSupported();
    console.debug('🚀 - file: App.tsx:21 - supported', supported);
    setAllow(granted && supported);
  };

  useEffect(() => {
    askPermission();
    if (allowed) {
      startStepCounter();
    }
    return () => stopStepCounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const startStepCounter = () => {
    const now = Date.now();
    startStepCounterUpdate(now);
    const sub = nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
      console.debug('🚀 nativeEventEmitter.stepCounterUpdate', data);
      setSteps(data.steps);
    });
    setSubscription(sub);
  };

  const stopStepCounter = useCallback(() => {
    setSteps(0);
    stopStepCounterUpdate();
    subscription && nativeEventEmitter.removeSubscription(subscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{allowed ? `🅾️` : `️❎`}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
        <Button title="stop" onPress={() => stopStepCounter()} />
        <Button title="start" onPress={() => startStepCounter()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    display: 'flex',
  },
  step: {
    color: '#000',
    fontSize: 36,
  },
});

export default App;
