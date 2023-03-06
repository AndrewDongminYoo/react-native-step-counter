import React, { useEffect, useState } from 'react';
import {
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from '@dongminyu/react-native-step-counter';
import {
  getBodySensorPermission,
  getStepCounterPermission,
} from './permission';

type SensorType<T = typeof Platform.OS> = T extends 'ios'
  ? 'CMStepCounter' | 'CMPedometer'
  : T extends 'android'
  ? 'STEP_COUNTER' | 'ACCELEROMETER'
  : 'NONE';

type SensorName = SensorType<Platform['OS']>;

const initState = {
  dailyGoal: '0/10000 steps',
  stepsString: '0.0kCal',
  calories: '0 steps',
  distance: '0.0m',
};

export default function App() {
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState(false);
  const [sensorType, setSensorType] = useState<SensorName>('NONE');
  const [additionalInfo, setAdditionalInfo] = useState(initState);

  /** get user's motion permission and check pedometer is available */
  const isPedometerSupported = () => {
    isStepCountingSupported().then(result => {
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  };

  const startStepCounter = () => {
    startStepCounterUpdate(new Date(), data => {
      console.debug('🚀 data', data);
      setSensorType(data.counterType as SensorName);
      const parsedData = parseStepData(data);
      setAdditionalInfo({
        ...parsedData,
      });
    });
  };

  const stopStepCounter = () => {
    setAdditionalInfo(initState);
    stopStepCounterUpdate();
  };

  const forceUseAnotherSensor = () => {
    if (sensorType !== 'NONE') {
      stopStepCounter();
    }
    if (sensorType === 'STEP_COUNTER') {
      getBodySensorPermission().then(setGranted);
    } else {
      getStepCounterPermission().then(setGranted);
    }
    startStepCounter();
  };

  useEffect(() => {
    isPedometerSupported();
    return () => {
      stopStepCounter();
    };
  }, []);

  useEffect(() => {
    console.debug(`🚀 stepCounter ${supported ? '' : 'not'} supported`);
    console.debug(`🚀 user ${granted ? 'granted' : 'denied'} stepCounter`);
    startStepCounter();
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.normText}>
          User Granted the Permission?: {granted ? 'yes' : 'no'}
        </Text>
        <Text style={styles.normText}>
          Device has Pedometer Sensor?: {supported ? 'yes' : 'no'}
        </Text>
        {Platform.OS === 'android' ? (
          <Button
            title={`sensor: ${sensorType}`}
            onPress={forceUseAnotherSensor}
          />
        ) : (
          <Text style={styles.normText}>now Using : {sensorType}</Text>
        )}
        <Text style={styles.normText}>
          dailyGoal : {additionalInfo.dailyGoal}
        </Text>
        <Text style={styles.normText}>
          calories : {additionalInfo.calories}
        </Text>
        <Text style={styles.normText}>
          stepsString : {additionalInfo.stepsString}
        </Text>
        <Text style={styles.normText}>
          distance : {additionalInfo.distance}
        </Text>
        <Button title="Start StepCounter Update" onPress={startStepCounter} />
        <Button title="Stop StepCounter Updates" onPress={stopStepCounter} />
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
