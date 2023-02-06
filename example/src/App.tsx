import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import StepCounter from 'react-native-step-counter';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  const [allowed, setAllow] = useState(false);

  useEffect(() => {
    const askPermission = async () => {
      const possible = await StepCounter.isStepCountingSupported();
      console.debug('🚀 - file: App.tsx:21 - possible', possible);
      const available = await StepCounter.isWritingStepsSupported();
      console.debug('🚀 - file: App.tsx:22 - available', available);
      await StepCounter.requestPermission();
      const isOk = await StepCounter.checkPermission();
      console.debug('🚀 - file: App.tsx:18 - isOk', isOk);
      setAllow(isOk && possible && available);
    };
    askPermission();
  }, []);

  useEffect(() => {
    const supported = StepCounter.isStepCountingSupported();
    StepCounter.requestPermission().then((result) =>
      console.debug("User's Permission is", result)
    );
    const possible = StepCounter.checkPermission();
    console.debug("User's Permission is", possible);
    supported
      ? console.debug('Sensor TYPE_STEP_COUNTER is supported on this device')
      : console.debug(
          'Sensor TYPE_STEP_COUNTER is not supported on this device'
        );
    const today = Date.now();
    StepCounter.startStepCounterUpdate(today).then((data) => {
      console.debug('STEPS', data.steps);
      setSteps(data.steps);
    });
  }, []);

  useEffect(() => {
    if (allowed) {
      StepCounter.startStepCounterUpdate(Date.now());
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
