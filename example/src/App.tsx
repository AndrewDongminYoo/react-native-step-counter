import * as React from "react";
import { Button, StyleSheet, View, type EventSubscription } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  isSensorWorking,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type StepCountData,
} from "@dongminyu/react-native-step-counter";
import { getBodySensorPermission, getStepCounterPermission } from "./permission";
import CircularProgress from "react-native-circular-progress-indicator";
import LogCat from "./LogCat";

const initialState = {
  counterType: "",
  steps: 0,
  startDate: 0,
  endDate: 0,
  distance: 0,
};

/**
 * @returns {React.ReactComponentElement} - Returns Application Component.
 * @description This module represents the root component of the app.
 * 1. It imports the necessary components and libraries.
 * 2. It defines the initial state of the calories state.
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
  const [stepData, setStepData] = React.useState<StepCountData>(initialState);
  const [calories, setCalories] = React.useState<string>("");
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
    if (loaded) return;
    stepSubscriptionRef.current?.remove();
    setStepData(initialState);
    const _now = new Date();
    stepSubscriptionRef.current = startStepCounterUpdate(_now, (data) => {
      setStepData(data);
      const parsed = parseStepData(data);
      setCalories(parsed.calories);
      console.log({ ...parsed });
    });
    setLoaded(true);
  };

  /**
   * It sets the state of the calories object to its initial state, stops the step counter update,
   * and sets the loaded state to false.
   * This function is used to stop the step counter.
   */
  const stopStepCounter = () => {
    setCalories("");
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
      if (stepData.counterType === "Step Counter") {
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
              value={stepData.steps}
              maxValue={10000}
              valueSuffix=" steps"
              progressValueFontSize={42}
              radius={165}
              activeStrokeColor="#cdd27e"
              inActiveStrokeColor="#4c6394"
              inActiveStrokeOpacity={0.5}
              inActiveStrokeWidth={40}
              subtitle={calories}
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
