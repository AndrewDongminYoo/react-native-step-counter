import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import StepCounter from 'react-native-step-counter';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  const [allowed, setAllow] = useState(false);

  useEffect(() => {
    const askPermission = async () => {
      await StepCounter.requestPermission().then((result) => {
        console.debug('🚀 - file: App.tsx:29 - requestPermission', result);
        const supported = StepCounter.isStepCountingSupported();
        console.debug(
          `Sensor TYPE_STEP_COUNTER is ${
            supported ? '' : 'not '
          }supported on this device`
        );
        const available = StepCounter.isWritingStepsSupported();
        console.debug(
          '🚀 - file: App.tsx:22 - isWritingStepsSupported',
          available
        );
        let isOk = false;
        if (isOk) {
          const current = StepCounter.checkPermission();
          console.debug('🚀 - file: App.tsx:28 - checkPermissionStr', current);
          isOk = current === 'granted';
          console.debug('🚀 - file: App.tsx:24 - checkPermissionBool', isOk);
        }
        setAllow(isOk && supported && available);
      });
    };
    askPermission();
  }, []);

  useEffect(() => {
    if (allowed) {
      const today = Date.now();
      console.debug('🚀 - startStepCounterUpdate');
      StepCounter.startStepCounterUpdate(today).then((data) => {
        console.debug('STEPS', data.steps);
        setSteps(data.steps);
      });
    }
    return () => {
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
