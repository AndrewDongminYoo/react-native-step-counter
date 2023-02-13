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
import { PERMISSIONS } from 'react-native-permissions';
import RNStepCounter, {
  isStepCountingSupported,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
import { requestRequiredPermissions, checkPermission } from './permission';

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

export default App;
