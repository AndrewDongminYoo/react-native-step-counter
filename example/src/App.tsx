import React from 'react';
import { Button, Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import {
  isSensorWorking,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type ParsedStepCountData,
} from '@dongminyu/react-native-step-counter';
import { getBodySensorPermission, getStepCounterPermission } from './permission';
import CircularProgress from 'react-native-circular-progress-indicator';
import LogCat from './LogCat';

type SensorType<T = typeof Platform.OS> = T extends 'ios'
  ? 'CMPedometer'
  : T extends 'android'
  ? 'Step Counter' | 'Accelerometer'
  : 'NONE';

type SensorName = SensorType<Platform['OS']>;

/* Setting the initial state of the additionalInfo object. */
const initState = {
  dailyGoal: '0/10000 steps',
  stepsString: '0 steps',
  calories: '0 kCal',
  distance: '0.0m',
};

type AdditionalInfo = Partial<ParsedStepCountData>;

export default function App() {
  const [loaded, setLoaded] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);
  const [sensorType, setSensorType] = React.useState<SensorName>('NONE');
  const [stepCount, setStepCount] = React.useState(0);
  const [additionalInfo, setAdditionalInfo] = React.useState<AdditionalInfo>(initState);

  /** get user's motion permission and check pedometer is available */
  const isPedometerSupported = () => {
    isStepCountingSupported().then((result) => {
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  };

  /**
   * It starts the step counter and sets the sensor type, step count, and additional info.
   */
  const startStepCounter = () => {
    startStepCounterUpdate(new Date(), (data) => {
      setSensorType(data.counterType as SensorName);
      const parsedData = parseStepData(data);
      setStepCount(parsedData.steps);
      setAdditionalInfo({
        ...parsedData,
      });
    });
    setLoaded(true);
  };

  /**
   * It sets the state of the additionalInfo object to its initial state, stops the step counter update,
   * and sets the loaded state to false
   */
  const stopStepCounter = () => {
    setAdditionalInfo(initState);
    stopStepCounterUpdate();
    setLoaded(false);
  };

  /**
   * If the sensor is working, stop it. If it's not working,
   * get permission for the other sensor and start it
   */
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

  /**
   * A hook that runs when the component mounts. It calls the isPedometerSupported function
   * and returns a function that stops the step counter.
   */
  React.useEffect(() => {
    isPedometerSupported();
    return () => {
      stopStepCounter();
    };
  }, []);

  /**
   * A hook that runs when the component mounts.
   * It calls the isPedometerSupported function and returns a
   * function that stops the step counter.
   */
  React.useEffect(() => {
    console.debug(`🚀 stepCounter ${supported ? '' : 'not'} supported`);
    console.debug(`🚀 user ${granted ? 'granted' : 'denied'} stepCounter`);
    startStepCounter();
  }, [granted, supported]);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <View style={styles.indicator}>
          <CircularProgress
            value={stepCount}
            maxValue={10000}
            valueSuffix="steps"
            progressValueFontSize={42}
            radius={165}
            activeStrokeColor="#cdd27e"
            inActiveStrokeColor="#4c6394"
            inActiveStrokeOpacity={0.5}
            inActiveStrokeWidth={40}
            subtitle={additionalInfo.calories === '0 kCal' ? '' : additionalInfo.calories}
            activeStrokeWidth={40}
            title="Step Count"
            titleColor="#555"
            titleFontSize={30}
            titleStyle={{ fontWeight: 'bold' }}
          />
        </View>
        <View style={styles.bGroup}>
          <Button title="START" onPress={startStepCounter} />
          <Button title="RESTART" onPress={forceUseAnotherSensor} />
          <Button title="STOP" onPress={stopStepCounter} />
        </View>
        <LogCat trigger={loaded} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Styling the container. */
  container: {
    height: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2f3774',
  },
  /* Styling the circular indicator. */
  indicator: {
    marginTop: 10,
    marginBottom: 20,
  },
  /* Styling the button group. */
  bGroup: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    display: 'flex',
    marginVertical: 8,
  },
});
