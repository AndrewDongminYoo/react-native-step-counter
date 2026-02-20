import * as React from "react";
import { Button, StyleSheet, View, type EventSubscription } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  isSensorWorking,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type ParsedStepCountData,
} from "@dongminyu/react-native-step-counter";
import { getBodySensorPermission, getStepCounterPermission } from "./permission";
import CircularProgress from "react-native-circular-progress-indicator";
import LogCat from "./LogCat";

/** Setting the initial state of the additionalInfo object. */
const initState: Partial<ParsedStepCountData> = {
  dailyGoal: "0/10000 steps",
  stepsString: "0 steps",
  calories: "0 kCal",
  distance: "0.0 m",
};

type AdditionalInfo = Partial<ParsedStepCountData>;

/**
 * @returns {React.ReactComponentElement} - Returns Application Component.
 * @description This module represents the root component of the app.
 * 1. It imports the necessary components and libraries.
 * 2. It defines the initial state of the additionalInfo state.
 * 3. It defines the functions that will be used in the app.
 * 4. It uses the useState hook to define the states that will be used in the app.
 * 5. It uses the useEffect hook to run the isPedometerSupported function when the component mounts.
 * 6. It uses the useEffect hook to call the startStepCounter function when the component mounts.
 * 7. It returns the JSX code for the app.
 */
export default function App(): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);
  const [sensorType, setSensorType] = React.useState<string>("NONE");
  const [stepCount, setStepCount] = React.useState(0);
  const [additionalInfo, setAdditionalInfo] = React.useState<AdditionalInfo>(initState);
  const stepSubscriptionRef = React.useRef<EventSubscription | null>(null);

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
    stepSubscriptionRef.current?.remove();
    setStepCount(0);
    stepSubscriptionRef.current = startStepCounterUpdate(new Date(), (data) => {
      if (data.counterType != sensorType) {
        setSensorType(data.counterType);
      }
      const { steps, ...additional } = parseStepData(data);
      if (stepCount <= steps) {
        setStepCount(steps);
        setAdditionalInfo(additional);
      }
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
    stepSubscriptionRef.current = null;
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
      if (sensorType === "Step Counter") {
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
    console.debug(`🚀 stepCounter ${supported ? "" : "not"} supported`);
    console.debug(`🚀 user ${granted ? "granted" : "denied"} stepCounter`);
    if (supported && granted) {
      startStepCounter();
    }
  }, [granted, supported]);

  return (
    <SafeAreaProvider>
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
              subtitle={additionalInfo.calories === "0 kCal" ? "" : additionalInfo.calories}
              activeStrokeWidth={40}
              title="Step Count"
              titleColor="#555"
              titleFontSize={30}
              titleStyle={{ fontWeight: "bold" }}
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  /** Styling the container. */
  container: {
    height: "100%",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#2f3774",
  },
  /** Styling the circular indicator. */
  indicator: {
    marginTop: 10,
    marginBottom: 20,
  },
  /** Styling the button group. */
  bGroup: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    display: "flex",
  },
});
