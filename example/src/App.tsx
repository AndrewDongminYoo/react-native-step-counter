import React, { useCallback, useEffect, useState } from 'react';
import { checkAvailable } from './pedometer';
import {
  Button,
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PERMISSIONS } from 'react-native-permissions';
import StepCounter from 'react-native-step-counter';
import { requestRequiredPermissions, checkPermission } from './permission';
export const myModuleEvt = new NativeEventEmitter(NativeModules.Pedometer);

const App = () => {
  const [allowed, setAllow] = useState(false);
  const [steps, setSteps] = useState(0);
  const [subscription, setSubscription] = useState<EmitterSubscription>();

  /** get user's motion permission and check pedometer is available */
  const askPermission = async () => {
    await requestRequiredPermissions();
    const isOk = await (Platform.OS === 'ios'
      ? checkPermission(PERMISSIONS.IOS.MOTION)
      : checkPermission(PERMISSIONS.ANDROID.BODY_SENSORS));
    console.debug('🚀 - file: App.tsx:18 - isOk', isOk);
    const possible = await checkAvailable();
    console.debug('🚀 - file: App.tsx:21 - possible', possible);
    setAllow(isOk && possible);
  };

  useEffect(() => {
    askPermission();
  }, []);

  const startStepCounter = () => {
    const sub = myModuleEvt.addListener('StepCounter', (data) => {
      console.debug('🚀 - file: App.tsx:31 - stepData', data);
      setSteps(data.steps);
    });
    setSubscription(sub);
    const now = Date.now();
    StepCounter.startStepCounterUpdate(now);
  };

  const stopStepCounter = useCallback(() => {
    if (subscription) {
      myModuleEvt.removeAllListeners('StepCounter');
      myModuleEvt.removeSubscription(subscription);
      StepCounter.stopStepCounterUpdate();
    }
  }, [subscription]);

  const restartStepCounter = () => {
    stopStepCounter();
    startStepCounter();
  };

  /** get user's step count change and set-state of it */
  useEffect(() => {
    if (allowed) {
      startStepCounter();
    }
    return () => stopStepCounter();
  }, [allowed, stopStepCounter]);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{allowed ? `🅾️` : `️❎`}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
        <Button title="restart" onPress={() => restartStepCounter()} />
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
