import * as React from "react";
import { Button, Platform, StyleSheet, Text, View, type EventSubscription } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type StepCountData,
} from "@dongminyu/react-native-step-counter";
import { getStepCounterPermission } from "./permission";
import CircularProgress, { type ProgressRef } from "react-native-circular-progress-indicator";
import LogCat, { type LogLine } from "./LogCat";

const initialState: StepCountData = {
  counterType: "",
  steps: 0,
  startDate: 0,
  endDate: 0,
  distance: 0,
};

function newSessionId() {
  // small + deterministic enough for demo
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App(): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [granted, setGranted] = React.useState(false);

  const [sessionId, setSessionId] = React.useState<string>(() => newSessionId());
  const [stepData, setStepData] = React.useState<StepCountData>(initialState);
  const [calories, setCalories] = React.useState<string>("");

  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const stepSubscriptionRef = React.useRef<EventSubscription | null>(null);
  const progressRef = React.useRef<ProgressRef | null>(null);

  const sessionIdRef = React.useRef(sessionId);
  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Avoid state race in RESTART/START
  const startedRef = React.useRef(false);

  const appendLog = React.useCallback((tag: string, payload: unknown, sid?: string) => {
    const line: LogLine = {
      sessionId: sid ?? sessionIdRef.current,
      ts: Date.now(),
      tag,
      payload: JSON.stringify(payload),
    };
    setLogs((prev) => [...prev, line]);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  const stopStepCounter = React.useCallback(() => {
    progressRef.current?.pause();
    stopStepCounterUpdate();
    stepSubscriptionRef.current?.remove();
    stepSubscriptionRef.current = null;

    setStepData(initialState);
    setCalories("");
    setLoaded(false);
    startedRef.current = false;

    appendLog("STOP", { ok: true });
  }, [appendLog]);

  const startStepCounter = React.useCallback(() => {
    // Make start idempotent, independent of async state updates.
    if (startedRef.current) return;
    startedRef.current = true;

    progressRef.current?.play();

    // Ensure old subscription is gone
    stepSubscriptionRef.current?.remove();
    stepSubscriptionRef.current = null;

    // New session boundary
    const nextSessionId = newSessionId();
    setSessionId(nextSessionId);

    // Reset UI state
    setStepData(initialState);
    setCalories("");
    clearLogs();
    setLoaded(true);

    const now = new Date();
    appendLog("START", { at: now.toISOString(), sessionId: nextSessionId });

    // Subscribe once here; DO NOT subscribe elsewhere in UI.
    stepSubscriptionRef.current = startStepCounterUpdate(now, (data) => {
      // NOTE: because sessionId is state, closure might reference old value.
      // For demo we log without relying on closure correctness; use ref if needed.
      setStepData(data);
      setCalories(parseStepData(data).calories);

      // Log the raw event we get from wrapper callback (single source of truth)
      setLogs((prev) => [
        ...prev,
        {
          sessionId: nextSessionId,
          ts: Date.now(),
          tag: "stepCounterUpdate",
          payload: JSON.stringify(data),
        },
      ]);
    });
  }, [appendLog, clearLogs]);

  const restartStepCounter = React.useCallback(async () => {
    const hadSubscription = stepSubscriptionRef.current != null;
    appendLog("RESTART", { hadSubscription });

    // Stop first
    stopStepCounter();

    // Re-check capability/permission rather than inferring from subscription existence
    const cap = await isStepCountingSupported().catch(() => ({ supported: false, granted: false }));
    appendLog("capabilities", cap);

    // If not granted, request permission (platform-specific branching stays yours)
    if (cap.supported && !cap.granted) {
      const ok = await getStepCounterPermission().catch(() => false);
      setGranted(ok);
      appendLog("permission", { ok });
      if (!ok) {
        // Don't start if user denied
        return;
      }
    }

    progressRef.current?.reAnimate();

    // Start new session
    startStepCounter();
  }, [appendLog, startStepCounter, stopStepCounter, setGranted]);

  React.useEffect(() => {
    let cancelled = false;

    isStepCountingSupported().then((result) => {
      if (cancelled) return;
      setGranted(result.granted === true);
      setSupported(result.supported === true);
      appendLog("isStepCountingSupported", result);
    });

    return () => {
      cancelled = true;
      stopStepCounter();
    };
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    appendLog("capabilities", { supported, granted });
    if (supported && granted) {
      startStepCounter();
    }
  }, [supported, granted, startStepCounter, appendLog]);

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
            <Button title="RESTART" onPress={restartStepCounter} />
            <Button title="STOP" onPress={stopStepCounter} disabled={!loaded} />
          </View>

          {/* LogCat becomes a pure renderer. No emitter subscription here. */}
          <LogCat sessionId={sessionId} logs={logs} onClear={clearLogs} />
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
