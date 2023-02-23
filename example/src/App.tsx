import React, { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  requestPermissions,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';

export default function App() {
  const [supported, setSupported] = useState(false);
  const [steps, setSteps] = useState(0);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    await requestPermissions();
    const granted = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', granted);
    setSupported(supported);
    return supported;
  }

  const startStepCounter = async () => {
    const now = new Date();
    startStepCounterUpdate(now, (data) => {
      console.log(parseStepData(data));
      setSteps(data.steps);
    });
  };

  const stopStepCounter = useCallback(() => {
    setSteps(0);
    stopStepCounterUpdate();
  }, []);

  useEffect(() => {
    const runService = async () => {
      await askPermission()
        .then((granted) => {
          if (granted) {
            startStepCounter();
          }
        })
        .catch((error) => {
          console.error('askPermission', error);
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
        <Text style={styles.step}>사용가능:{supported ? '🅾️' : '️❎'}</Text>
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
