import React from 'react';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  NativeEventEmitter,
} from 'react-native';
import StepCounter from 'react-native-step-counter';

export default function App() {
  const [steps, setSteps] = useState<number>(0);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(StepCounter.isStepCountingSupported());
    console.debug(
      `Sensor TYPE_STEP_COUNTER is ${
        supported ? '' : 'not '
      }supported on this device`
    );
    const today = Date.now();
    console.debug('🚀 - startStepCounterUpdate', today);
    StepCounter.startStepCounterUpdate(today).then((data) => {
      console.log(data);
      console.debug('STEPS', data.steps);
      if (typeof data.steps === 'number') {
        setSteps(data.steps);
      }
    });

    const evenEmitter = new NativeEventEmitter();
    evenEmitter.addListener('pedometerDataDidUpdate', (data) => {
      console.debug('🚀 - pedometerDataDidUpdate', data);
    });
    return () => {
      StepCounter.stopStepCounterUpdate();
    };
  }, [supported]);

  return (
    <SafeAreaView>
      <View style={styles.screen}>
        <Text style={styles.step}>
          권한요청:{supported ? 'available' : 'not-available'}
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
