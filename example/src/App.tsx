import React from 'react';
import { Button, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  isSensorWorking,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type ParsedStepCountData,
} from '@dongminyu/react-native-step-counter';
import { getBodySensorPermission, getStepCounterPermission } from './permission';

type SensorType<T = typeof Platform.OS> = T extends 'ios'
  ? 'CMPedometer'
  : T extends 'android'
  ? 'Step Counter' | 'Accelerometer'
  : 'NONE';

type SensorName = SensorType<Platform['OS']>;

const initState = {
  dailyGoal: '0/10000 steps',
  stepsString: '0.0kCal',
  calories: '0 steps',
  distance: '0.0m',
};

type AdditionalInfo = Partial<ParsedStepCountData>;

export default function App() {
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);
  const [sensorType, setSensorType] = React.useState<SensorName>('NONE');
  const [additionalInfo, setAdditionalInfo] = React.useState<AdditionalInfo>(initState);

  /** get user's motion permission and check pedometer is available */
  const isPedometerSupported = () => {
    isStepCountingSupported().then((result) => {
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  };

  const startStepCounter = () => {
    startStepCounterUpdate(new Date(), (data) => {
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
    if (isSensorWorking) {
      stopStepCounter();
    } else {
      if (sensorType === 'Step Counter') {
        getBodySensorPermission().then(setGranted);
      } else {
        getStepCounterPermission().then(setGranted);
      }
    }
    startStepCounter();
  };

  React.useEffect(() => {
    isPedometerSupported();
    return () => {
      stopStepCounter();
    };
  }, []);

  React.useEffect(() => {
    console.debug(`🚀 stepCounter ${supported ? '' : 'not'} supported`);
    console.debug(`🚀 user ${granted ? 'granted' : 'denied'} stepCounter`);
    startStepCounter();
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.normText}>User Granted the Permission?: {granted ? 'yes' : 'no'}</Text>
        <Text style={styles.normText}>Device has Pedometer Sensor?: {supported ? 'yes' : 'no'}</Text>
        {Platform.OS === 'android' ? (
          <Button title={`sensor: ${sensorType}`} onPress={forceUseAnotherSensor} />
        ) : (
          <Text style={styles.normText}>now Using : {sensorType}</Text>
        )}
        <Text style={styles.normText}>dailyGoal : {additionalInfo.dailyGoal}</Text>
        <Text style={styles.normText}>calories : {additionalInfo.calories}</Text>
        <Text style={styles.normText}>stepsString : {additionalInfo.stepsString}</Text>
        <Text style={styles.normText}>distance : {additionalInfo.distance}</Text>
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
