/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Platform } from 'react-native';
import StepCounter from 'react-native-step-counter';

const permission =
  Platform.OS === 'ios'
    ? 'ios.permission.MOTION'
    : 'android.permission.BODY_SENSORS';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  const [allowed, setAllow] = useState(false);
  const [checked, setChecked] = useState('');
  const [available, setAvailable] = useState(false);
  const [response, setResponse] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setResponse(StepCounter.requestPermission(permission));
    console.debug('🚀 - file: App.tsx:29 - requestPermission', response);
    setSupported(StepCounter.isStepCountingSupported());
    console.debug(
      `Sensor TYPE_STEP_COUNTER is ${
        supported ? '' : 'not '
      }supported on this device`
    );
    setAvailable(StepCounter.isWritingStepsSupported());
    console.debug('🚀 - file: App.tsx:22 - isWritingStepsSupported', available);
    const current = StepCounter.checkPermission(permission);
    setChecked(current);
    console.debug('🚀 - file: App.tsx:28 - checkPermissionStr', current);
    setAllow(current === 'granted');
    console.debug('🚀 - file: App.tsx:24 - checkPermissionBool', allowed);
  }, []);

  useEffect(() => {
    const today = Date.now();
    console.debug('🚀 - startStepCounterUpdate');
    StepCounter.startStepCounterUpdate(today).then((data) => {
      console.log(data);
      console.debug('STEPS', data.numberOfSteps);
      if (typeof data.numberOfSteps === 'number') {
        setSteps(data.numberOfSteps);
      }
    });
    return () => {
      StepCounter.stopStepCounterUpdate();
    };
  }, []);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>권한요청:{response}</Text>
        <Text style={styles.step}>권한체크:{checked}</Text>
        <Text style={styles.step}>
          모션입력:{available ? 'available' : 'not-available'}
        </Text>
        <Text style={styles.step}>
          쓰기가능:{available ? 'available' : 'not-available'}
        </Text>
        <Text style={styles.step}>걸음 수:{steps}</Text>
      </View>
    </SafeAreaView>
  );
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
