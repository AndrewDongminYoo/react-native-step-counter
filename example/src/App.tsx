import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import StepCounter from 'react-native-step-counter';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  useEffect(() => {
    StepCounter.isStepCountingSupported((error, result) => {
      if (result) {
        console.debug('Sensor TYPE_STEP_COUNTER is supported on this device');
        const today = Date.now();
        StepCounter.startStepCounterUpdate(today, (data) => {
          console.debug('STEPS', data.steps);
          setSteps(data.steps);
        });
      } else {
        console.error(
          'Sensor TYPE_STEP_COUNTER is not supported on this device',
          error
        );
      }
    });
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
