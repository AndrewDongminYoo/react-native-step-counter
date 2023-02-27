import React, { useEffect, useState } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';
export default function App() {
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState(false);
  const [steps, setSteps] = useState(0);

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    isStepCountingSupported().then((result) => {
      console.debug('🚀 - isStepCountingSupported', result);
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  }

  async function startStepCounter() {
    const now = new Date();
    startStepCounterUpdate(now, (data) => {
      console.debug('🚀 - startStepCounterUpdate', data);
      console.log(parseStepData(data));
      setSteps(data.steps);
    });
  }

  function stopStepCounter() {
    setSteps(0);
    stopStepCounterUpdate();
  }

  useEffect(() => {
    console.debug('🚀 - componentDidMount');
    askPermission();
    return () => {
      console.debug('🚀 - componentWillUnmount');
      stopStepCounter();
    };
  }, []);

  useEffect(() => {
    if (granted && supported) {
      console.debug('🚀 - componentDidUpdate');
      startStepCounter();
    }
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View
        style={{
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          display: 'flex',
        }}
      >
        <Text style={{ fontSize: 20, color: 'slategrey' }}>
          User Granted Step Counter Feature?: {granted ? 'yes' : 'no'}
        </Text>
        <Text style={{ fontSize: 20, color: 'slategrey' }}>
          Device has Step Counter Sensor?: {supported ? 'yes' : 'no'}
        </Text>
        {!granted ? (
          <Button title="Check Permission Again" onPress={askPermission} />
        ) : (
          <>
            <Text style={{ fontSize: 36, color: 'dimgray' }}>걸음 수: {steps}</Text>
            <Button title="Start StepCounter Updates" onPress={startStepCounter} />
            <Button title="Stop StepCounter Updates" onPress={stopStepCounter} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
