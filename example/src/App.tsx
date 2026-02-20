import * as React from "react";
import { Button, Platform, StyleSheet, Text, View, type EventSubscription } from "react-native";
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
import CircularProgress, { type ProgressRef } from "react-native-circular-progress-indicator";
import LogCat from "./LogCat";

const initialState: StepCountData = {
  counterType: "",
  steps: 0,
  startDate: 0,
  endDate: 0,
  distance: 0,
};

export default function App(): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);
  const [stepData, setStepData] = React.useState<StepCountData>(initialState);
  const [calories, setCalories] = React.useState<string>("");
  const [clearLogsTrigger, setClearLogsTrigger] = React.useState(0);
  const stepSubscriptionRef = React.useRef<EventSubscription | null>(null);
  const progressRef = React.useRef<ProgressRef | null>(null);
  const isPedometerSupported = () => {
    isStepCountingSupported().then((result) => {
      setGranted(result.granted === true);
      setSupported(result.supported === true);
    });
  };

  const startStepCounter = () => {
    if (loaded) return;
    progressRef.current?.play();
    stepSubscriptionRef.current?.remove();
    setStepData(initialState);
    const _now = new Date();
    stepSubscriptionRef.current = startStepCounterUpdate(_now, (data) => {
      setStepData(data);
      setCalories(parseStepData(data).calories);
    });
    setLoaded(true);
  };

  const stopStepCounter = () => {
    progressRef.current?.pause();
    stopStepCounterUpdate();
    stepSubscriptionRef.current = null;
    setStepData(initialState);
    setCalories("");
    setClearLogsTrigger((n) => n + 1);
    setLoaded(false);
  };

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
    progressRef.current?.reAnimate();
    startStepCounter();
  };

  React.useEffect(() => {
    isPedometerSupported();
    return () => {
      stopStepCounter();
    };
  }, []);

  React.useEffect(() => {
    console.debug(`🚀 stepCounter ${supported ? "" : "not"} supported`);
    console.debug(`🚀 user ${granted ? "granted" : "denied"} stepCounter`);
    if (supported && granted) {
      startStepCounter();
    }
  }, [granted, supported]);

  const startedAtLabel = stepData.startDate
    ? new Date(stepData.startDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <View style={styles.container}>
          {/* Status indicator */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, loaded ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusText}>
              {loaded && startedAtLabel ? `Active · ${startedAtLabel}` : "Stopped"}
            </Text>
          </View>

          <View style={styles.indicator}>
            <CircularProgress
              ref={progressRef}
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
            <Button title="START" onPress={startStepCounter} disabled={loaded} />
            <Button title="RESTART" onPress={forceUseAnotherSensor} />
            <Button title="STOP" onPress={stopStepCounter} disabled={!loaded} />
          </View>

          <LogCat triggered={loaded} clearTrigger={clearLogsTrigger} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#2f3774",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 100,
    zIndex: 30,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: "#cdd27e",
  },
  dotInactive: {
    backgroundColor: "#6b7280",
  },
  statusText: {
    color: "#e5e7eb",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  indicator: {
    marginTop: 10,
    marginBottom: 20,
    marginInline: 30,
    position: "relative",
  },
  bGroup: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    display: "flex",
    marginVertical: 8,
  },
});
