import React, { useEffect, useState } from 'react';
import { checkAvailable } from './pedometer';
import {
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

  /** get user's motion permission and check pedometer is available */
  useEffect(() => {
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
    askPermission();
  }, []);

  /** get user's step count change and set-state of it */
  useEffect(() => {
    if (allowed) {
      myModuleEvt.addListener('StepCounter', (data) => {
        console.debug('🚀 - file: App.tsx:31 - stepData', data);
        setSteps(data.steps);
      });
      const now = Date.now();
      StepCounter.startStepCounterUpdate(now);
    }
    return () => {
      myModuleEvt.removeAllListeners('StepCounter');
      StepCounter.stopStepCounterUpdate();
    };
  }, [allowed]);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{allowed ? `🅾️` : `️❎`}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
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
