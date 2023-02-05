import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import StepCounter from 'react-native-step-counter';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  useEffect(() => {
    const supported = StepCounter.isStepCountingSupported();
    const possible = StepCounter.checkPermission();
    console.debug("User's Permission is", possible);
    if (supported) {
      console.debug('Sensor TYPE_STEP_COUNTER is supported on this device');
      const today = Date.now();
      StepCounter.startStepCounterUpdate(today).then((data) => {
        console.debug('STEPS', data.steps);
        setSteps(data.steps);
      });
    } else {
      console.error('Sensor TYPE_STEP_COUNTER is not supported on this device');
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text>Steps: {steps}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
