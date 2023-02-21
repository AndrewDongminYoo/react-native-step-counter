import React, { useCallback, useEffect, useState } from 'react';
import type { EmitterSubscription, GestureResponderEvent } from 'react-native';
import { NativeEventEmitter, NativeModules, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { isStepCountingSupported, startStepCounterUpdate, stopStepCounterUpdate } from 'react-native-step-counter';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';

type OnPress = (event?: GestureResponderEvent) => void;

export async function requestRequiredPermissions() {
  return await requestMultiple(
    Platform.select({
      ios: [PERMISSIONS.IOS.MOTION],
      android: [
        PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
        PERMISSIONS.ANDROID.BODY_SENSORS,
        PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
      ],
      default: [],
    })
  ).then((permissions) => {
    Object.entries(permissions).forEach(([key, value]) => {
      console.log('requestPermission', key, value);
    });
    return true;
  });
}

export default function App() {
  const [allowed, setAllow] = useState(false);
  const [steps, setSteps] = useState(0);
  const [subscription, setSubscription] = useState<EmitterSubscription>();
  const RNStepCounter = NativeModules.RNStepCounter;
  console.log('🚀 ~ file: App.tsx:37 ~ App ~ RNStepCounter:', RNStepCounter);
  console.log('🚀 ~ file: App.tsx:37 ~ App ~ NativeModules:', NativeModules);
  const nativeEventEmitter = new NativeEventEmitter(RNStepCounter);
  console.log('🚀 ~ file: App.tsx:40 ~ App ~ nativeEventEmitter:', nativeEventEmitter);
  console.log('🚀 ~ file: App.tsx:40 ~ App ~ RNStepCounter:', RNStepCounter);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    await requestRequiredPermissions();
    const supported = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', supported);
    setAllow(supported);
    return supported;
  }

  const startStepCounter: OnPress = () => {
    const now = Date.now();
    startStepCounterUpdate(now);
    const sub = nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
      console.debug('🚀 nativeEventEmitter.stepCounterUpdate', data);
      setSteps(data.steps);
    });
    setSubscription(sub);
  };

  const stopStepCounter: OnPress = useCallback(() => {
    setSteps(0);
    stopStepCounterUpdate();
    subscription && nativeEventEmitter.removeSubscription(subscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    askPermission();
    startStepCounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{allowed ? '🅾️' : '️❎'}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
      </View>
    </SafeAreaView>
  );
}

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
