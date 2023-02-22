import React, { useCallback, useEffect, useState } from 'react';
import type { EmitterSubscription } from 'react-native';
import { Button, NativeEventEmitter, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import RNStepCounter, {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';

export async function requestRequires() {
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
  const nativeEventEmitter = new NativeEventEmitter(RNStepCounter);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    await requestRequires();
    const supported = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', supported);
    setAllow(supported);
    return supported;
  }

  const startStepCounter = async () => {
    const now = new Date();
    startStepCounterUpdate(Number(now));
    const sub = nativeEventEmitter.addListener('stepCounterUpdate', (data) => {
      console.log(parseStepData(data));
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

  useEffect(() => {
    const runService = async () => {
      await askPermission().then((granted) => {
        if (granted) {
          startStepCounter();
        }
      });
    };
    runService();
    return () => {
      stopStepCounter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>사용가능:{allowed ? '🅾️' : '️❎'}</Text>
        <Text style={styles.step}>걸음 수: {steps}</Text>
        <Button onPress={startStepCounter} title="시작" />
        <Button onPress={stopStepCounter} title="정지" />
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
