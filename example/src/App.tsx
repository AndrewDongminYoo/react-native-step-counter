import React, { useEffect, useState } from 'react';
import { Button, Platform, type Rationale, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from '@dongminyu/react-native-step-counter';
import { type Permission, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

const requestPermission = async () => {
  const permission: Permission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.MOTION : PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION;
  const rationale: Rationale = {
    title: '"Step Counter" Permission',
    message: '"Step Counter" needs access to your sensor data.',
    buttonPositive: 'ACCEPT',
    buttonNegative: 'DENY',
  };
  return request(permission, rationale).then((result) => {
    if (result === RESULTS.GRANTED) {
      console.debug('The permission is granted');
      return true;
    } else {
      console.debug('The permission is denied');
      return false;
    }
  });
};

export default function App() {
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    dailyGoal: '0/10000 steps',
    stepsString: '0.0kCal',
    calories: '0 steps',
    distance: '0.0m',
  });

  /** get user's motion permission and check pedometer is available */
  async function askPermission() {
    isStepCountingSupported().then((result) => {
      console.debug('🚀 - isStepCountingSupported', result);
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  }

  async function startStepCounter() {
    startStepCounterUpdate(new Date(), (data) => {
      setAdditionalInfo({
        ...parseStepData(data),
      });
    });
  }

  function stopStepCounter() {
    setAdditionalInfo({
      dailyGoal: '0/10000 steps',
      stepsString: '0.0kCal',
      calories: '0 steps',
      distance: '0.0m',
    });
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
    console.debug('🚀 - componentDidUpdate');
    if (granted && supported) {
      console.debug('🚀 - granted and supported');
      startStepCounter();
    } else if (granted && !supported) {
      console.debug('🚀 - granted but not supported');
      startStepCounter();
    } else if (supported && !granted) {
      console.debug('🚀 - supported but not granted');
      requestPermission().then((accepted) => {
        console.debug('🚀 - requestPermission', accepted);
        setGranted(accepted);
      });
    }
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.normText}>User Granted Step Counter Feature?: {granted ? 'yes' : 'no'}</Text>
        <Text style={styles.normText}>Device has Step Counter Sensor?: {supported ? 'yes' : 'no'}</Text>
        {!granted ? (
          <>
            <Button title="Request Permission Again" onPress={requestPermission} />
          </>
        ) : (
          <>
            <Text style={styles.normText}>dailyGoal : {additionalInfo.dailyGoal}</Text>
            <Text style={styles.normText}>calories : {additionalInfo.calories}</Text>
            <Text style={styles.normText}>stepsString : {additionalInfo.stepsString}</Text>
            <Text style={styles.normText}>distance : {additionalInfo.distance}</Text>
            <Button title="Start StepCounter Update" onPress={startStepCounter} />
            <Button title="Stop StepCounter Updates" onPress={stopStepCounter} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    display: 'flex',
  },
  normText: {
    fontSize: 20,
    color: 'slategrey',
  },
});
