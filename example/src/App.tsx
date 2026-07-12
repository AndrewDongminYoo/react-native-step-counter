import * as React from "react";
import {
  Button,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type EventSubscription,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  createStepCountFilter,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type StepCountData,
} from "react-native-step-counter-newarch";
import { getStepCounterPermission } from "./permission";
import CircularProgress, { type ProgressRef } from "react-native-circular-progress-indicator";
import LogCat, { type LogLine } from "./LogCat";

const initialState: StepCountData = {
  counterType: "STEP_COUNTER",
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
  const { width, height } = useWindowDimensions();
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
    const filterStepCountData = createStepCountFilter();

    // Subscribe once here; DO NOT subscribe elsewhere in UI.
    stepSubscriptionRef.current = startStepCounterUpdate(now, (data) => {
      const filteredData = filterStepCountData(data);
      if (!filteredData) {
        setLogs((prev) => [
          ...prev,
          {
            sessionId: nextSessionId,
            ts: Date.now(),
            tag: "stepCounterUpdateFiltered",
            payload: JSON.stringify({
              counterType: data.counterType,
              rawSteps: data.steps,
              rawDistance: data.distance,
              startDate: data.startDate,
              endDate: data.endDate,
            }),
          },
        ]);
        return;
      }

      // NOTE: because sessionId is state, closure might reference old value.
      // For demo we log without relying on closure correctness; use ref if needed.
      setStepData(filteredData);
      setCalories(parseStepData(filteredData).calories);

      // Log the raw event we get from wrapper callback (single source of truth)
      setLogs((prev) => [
        ...prev,
        {
          sessionId: nextSessionId,
          ts: Date.now(),
          tag: "stepCounterUpdate",
          payload: JSON.stringify({
            counterType: data.counterType,
            rawSteps: data.steps,
            acceptedSteps: filteredData.steps,
            rawDistance: data.distance,
            acceptedDistance: filteredData.distance,
            startDate: filteredData.startDate,
            endDate: filteredData.endDate,
          }),
        },
      ]);
    });
  }, [appendLog, clearLogs]);

  const requestAndStartStepCounter = React.useCallback(async () => {
    if (startedRef.current) return;

    const cap = await isStepCountingSupported().catch(() => ({ supported: false, granted: false }));
    setSupported(cap.supported === true);
    setGranted(cap.granted === true);
    appendLog("capabilities", cap);

    if (!cap.supported) {
      return;
    }

    let hasPermission = cap.granted === true;
    if (!hasPermission) {
      hasPermission = await getStepCounterPermission().catch(() => false);
      setGranted(hasPermission);
      appendLog("permission", { ok: hasPermission });
    }

    if (!hasPermission) {
      return;
    }

    startStepCounter();
  }, [appendLog, startStepCounter]);

  const restartStepCounter = React.useCallback(async () => {
    const hadSubscription = stepSubscriptionRef.current != null;
    appendLog("RESTART", { hadSubscription });

    // Stop first
    stopStepCounter();

    progressRef.current?.reAnimate();

    // Start new session
    await requestAndStartStepCounter();
  }, [appendLog, requestAndStartStepCounter, stopStepCounter]);

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
  const progressRadius = Math.min(132, Math.max(104, Math.floor(Math.min(width, height) / 3.1)));
  const progressSize = progressRadius * 2;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, loaded ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusText}>
              {loaded && startedAtLabel ? `Active · ${startedAtLabel}` : "Stopped"}
            </Text>
          </View>

          <View style={[styles.indicator, { width: progressSize, height: progressSize }]}>
            <CircularProgress
              ref={progressRef}
              value={stepData.steps}
              maxValue={10000}
              radius={progressRadius}
              activeStrokeColor="#cdd27e"
              inActiveStrokeColor="#4c6394"
              inActiveStrokeOpacity={0.5}
              inActiveStrokeWidth={28}
              activeStrokeWidth={28}
              showProgressValue={false}
            />
            <View pointerEvents="none" style={styles.progressValueOverlay}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.progressValueText}>
                {stepData.steps}
              </Text>
              <Text style={styles.progressUnitText}>steps</Text>
              {calories ? <Text style={styles.progressMetaText}>{calories}</Text> : null}
            </View>
          </View>

          <View style={styles.bGroup}>
            <Button title="START" onPress={requestAndStartStepCounter} disabled={loaded} />
            <Button title="RESTART" onPress={restartStepCounter} />
            <Button title="STOP" onPress={stopStepCounter} disabled={!loaded} />
          </View>

          {/* LogCat becomes a pure renderer. No emitter subscription here. */}
          <View style={styles.logSection}>
            <LogCat sessionId={sessionId} logs={logs} onClear={clearLogs} />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2f3774",
  },
  container: {
    flex: 1,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#2f3774",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
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
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    position: "relative",
  },
  progressValueOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 36,
    position: "absolute",
    right: 0,
    top: 0,
  },
  progressValueText: {
    color: "#d8dc78",
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    textAlign: "center",
  },
  progressUnitText: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  progressMetaText: {
    color: "#aeb9df",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  bGroup: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    flexShrink: 0,
  },
  logSection: {
    flex: 1,
    minHeight: 180,
    width: "100%",
  },
});
