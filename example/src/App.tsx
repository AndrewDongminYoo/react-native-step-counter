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

/** Setting the initial state of the additionalInfo object. */
const initState = {
  dailyGoal: '0/10000 steps',
  stepsString: '0 steps',
  calories: '0 kCal',
  distance: '0.0 m',
};

type AdditionalInfo = Partial<ParsedStepCountData>;

/**
 * This module represents the root component of the app.
 * 1. It imports the necessary components and libraries.
 * 2. It defines the initial state of the additionalInfo state.
 * 3. It defines the functions that will be used in the app.
 * 4. It uses the useState hook to define the states that will be used in the app.
 * 5. It uses the useEffect hook to run the isPedometerSupported function when the component mounts.
 * 6. It uses the useEffect hook to call the startStepCounter function when the component mounts.
 * 7. It returns the JSX code for the app.
 *
 * @module App
 * @requires react
 * @requires react-native
 * @requires react-native-permissions
 * @requires react-native-svg
 * @requires react-native-reanimated
 * @requires react-native-gesture-handler
 * @requires react-native-circular-progress-indicator
 * @returns {React.ReactComponentElement} - Returns Application Component.
 * @example
 */
export default function App(): JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);
  const [sensorType, setSensorType] = React.useState<SensorName>('NONE');
  const [stepCount, setStepCount] = React.useState(0);
  const [additionalInfo, setAdditionalInfo] = React.useState<AdditionalInfo>(initState);

  /**
   * Get user's motion permission and check pedometer is available.
   * This function checks if the step counting is supported by the device
   * and if the user has granted the app the permission to use it.
   * It sets the state variables 'granted' and 'supported' accordingly.
   */
  const isPedometerSupported = () => {
    isStepCountingSupported().then((result) => {
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  };

  /**
   * It starts the step counter and sets the sensor type, step count, and additional info.
   * The function startStepCounter is called when the user clicks the "Start" button.
   * It starts the step counter.
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
   * and sets the loaded state to false.
   * This function is used to stop the step counter.
   */
  const stopStepCounter = () => {
    setAdditionalInfo(initState);
    stopStepCounterUpdate();
    setLoaded(false);
  };

  /**
   * If the sensor is working, stop it. If it's not working,
   * Get permission for the other sensor and start it.
   * This function is used to force the use of another sensor.
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
   * This effect runs when the component is first mounted
   * and then runs again when the `count` variable changes.
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
        <LogCat triggered={loaded} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /** Styling the container. */
  container: {
    height: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2f3774',
  },
  /** Styling the circular indicator. */
  indicator: {
    marginTop: 10,
    marginBottom: 20,
  },
  /** Styling the button group. */
  bGroup: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    display: 'flex',
    marginVertical: 8,
  },
});
