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
import MeasurementStatus, { type MeasurementResult } from "./MeasurementStatus";
import { EXAMPLE_LOGGING_ENABLED, EXAMPLE_RENDERING_ENABLED, MAX_LOG_ENTRIES } from "./logging";
import {
  BENCHMARK_ENABLED,
  BENCHMARK_WARMUP_MS,
  BENCHMARK_DURATION_MS,
  BenchmarkSession,
  benchmarkNow,
} from "./benchmark";

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
  const [requesting, setRequesting] = React.useState(true);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [measurementStartedAt, setMeasurementStartedAt] = React.useState<number | null>(null);
  const [measurementResult, setMeasurementResult] = React.useState<MeasurementResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const operationRef = React.useRef<AbortController | null>(null);

  const [sessionId, setSessionId] = React.useState<string>(() => newSessionId());
  const [stepData, setStepData] = React.useState<StepCountData>(initialState);
  const [calories, setCalories] = React.useState<string>("");

  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const stepSubscriptionRef = React.useRef<EventSubscription | null>(null);
  const progressRef = React.useRef<ProgressRef | null>(null);
  const benchmarkRef = React.useRef<BenchmarkSession | null>(null);
  const benchmarkTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommitRef = React.useRef<{ begin: number; count: number } | null>(null);
  React.useLayoutEffect(() => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    benchmarkRef.current?.observe(
      "example_commit",
      pending.begin,
      benchmarkNow(),
      true,
      pending.count - 1
    );
    pendingCommitRef.current = null;
  }, [stepData]);

  const sessionIdRef = React.useRef(sessionId);
  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Avoid state race in RESTART/START
  const startedRef = React.useRef(false);

  const appendLog = React.useCallback((tag: string, payload: () => unknown, sid?: string) => {
    if (!EXAMPLE_LOGGING_ENABLED) return;
    const line: LogLine = {
      sessionId: sid ?? sessionIdRef.current,
      ts: Date.now(),
      tag,
      payload: JSON.stringify(payload()),
    };
    setLogs((prev) => [...prev.slice(-(MAX_LOG_ENTRIES - 1)), line]);
  }, []);

  const clearLogs = React.useCallback(() => {
    if (!EXAMPLE_LOGGING_ENABLED) return;
    setLogs([]);
  }, []);

  const stopStepCounter = React.useCallback(() => {
    if (benchmarkTimerRef.current !== null) clearTimeout(benchmarkTimerRef.current);
    benchmarkTimerRef.current = null;
    pendingCommitRef.current = null;
    const report = benchmarkRef.current?.finish(benchmarkNow());
    benchmarkRef.current = null;
    operationRef.current?.abort();
    operationRef.current = null;
    setRequesting(false);
    progressRef.current?.pause();
    stopStepCounterUpdate();
    stepSubscriptionRef.current = null;

    setStepData(initialState);
    setCalories("");
    setLoaded(false);
    startedRef.current = false;

    if (report) {
      setMeasurementStartedAt(null);
      setMeasurementResult({
        complete: report.windowComplete,
        updates: report.records.filter((record) => record.stage === "js_filter").length,
      });
      // Export once, outside all timed regions. Wrap with run metadata using the guide.
      console.log(
        "STEP_BENCHMARK " +
          JSON.stringify({
            type: "start",
            warmupMs: BENCHMARK_WARMUP_MS,
            durationMs: BENCHMARK_DURATION_MS,
            logging: EXAMPLE_LOGGING_ENABLED,
            rendering: EXAMPLE_RENDERING_ENABLED,
          })
      );
      for (const record of report.records)
        console.log("STEP_BENCHMARK " + JSON.stringify({ type: "observation", ...record }));
      console.log(
        "STEP_BENCHMARK " +
          JSON.stringify({
            type: "end",
            count: report.records.length,
            omitted: report.omitted,
            windowComplete: report.windowComplete,
          })
      );
    }

    appendLog("STOP", () => ({ ok: true }));
  }, [appendLog]);

  const startStepCounter = React.useCallback(() => {
    // Make start idempotent, independent of async state updates.
    if (startedRef.current) return;
    startedRef.current = true;

    progressRef.current?.play();

    // New session boundary
    const nextSessionId = newSessionId();
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);

    // Reset UI state
    setStepData(initialState);
    setCalories("");
    clearLogs();
    setLoaded(true);

    const now = new Date();
    setStartedAt(now.getTime());
    setErrorMessage(null);
    appendLog("START", () => ({ at: now.toISOString(), sessionId: nextSessionId }), nextSessionId);
    const filterStepCountData = createStepCountFilter();
    if (BENCHMARK_ENABLED) {
      const begin = benchmarkNow();
      setMeasurementStartedAt(begin);
      setMeasurementResult(null);
      benchmarkRef.current = new BenchmarkSession(begin);
      benchmarkTimerRef.current = setTimeout(
        stopStepCounter,
        BENCHMARK_WARMUP_MS + BENCHMARK_DURATION_MS
      );
    }

    // Subscribe once here; DO NOT subscribe elsewhere in UI.
    stepSubscriptionRef.current = startStepCounterUpdate(
      now,
      (data) => {
        if (!startedRef.current || sessionIdRef.current !== nextSessionId) return;
        const begin = benchmarkRef.current ? benchmarkNow() : 0;
        const filteredData = filterStepCountData(data);
        benchmarkRef.current?.observe("js_filter", begin, benchmarkNow(), !!filteredData);
        if (!filteredData) {
          appendLog(
            "stepCounterUpdateFiltered",
            () => ({
              counterType: data.counterType,
              rawSteps: data.steps,
              rawDistance: data.distance,
              startDate: data.startDate,
              endDate: data.endDate,
            }),
            nextSessionId
          );
          return;
        }

        if (EXAMPLE_RENDERING_ENABLED) {
          if (benchmarkRef.current) {
            const pending = pendingCommitRef.current;
            pendingCommitRef.current = {
              begin: pending?.begin ?? begin,
              count: (pending?.count ?? 0) + 1,
            };
          }
          setStepData(filteredData);
          setCalories(parseStepData(filteredData).calories);
        }

        // Log the raw event we get from wrapper callback (single source of truth)
        appendLog(
          "stepCounterUpdate",
          () => ({
            counterType: data.counterType,
            rawSteps: data.steps,
            acceptedSteps: filteredData.steps,
            rawDistance: data.distance,
            acceptedDistance: filteredData.distance,
            startDate: filteredData.startDate,
            endDate: filteredData.endDate,
          }),
          nextSessionId
        );
      },
      (error) => {
        if (!startedRef.current || sessionIdRef.current !== nextSessionId) return;
        appendLog("sessionError", () => error, nextSessionId);
        if (error.fatal) {
          stopStepCounter();
          setErrorMessage("Counting stopped. Tap START to try again.");
        }
      }
    );
  }, [appendLog, clearLogs, stopStepCounter]);

  const requestAndStartStepCounter = React.useCallback(async () => {
    if (startedRef.current) return;

    operationRef.current?.abort();
    const operation = new AbortController();
    operationRef.current = operation;
    setRequesting(true);
    setErrorMessage(null);
    try {
      let cap = await isStepCountingSupported();
      if (operation.signal.aborted) return;
      appendLog("capabilities", () => cap);
      if (!cap.supported) {
        setErrorMessage("Step counting is unavailable on this device.");
        return;
      }

      if (!cap.granted) {
        const requested = await getStepCounterPermission(operation.signal);
        if (operation.signal.aborted) return;
        cap = await isStepCountingSupported();
        if (operation.signal.aborted) return;
        appendLog("permission", () => ({ requested, ...cap }));
      }
      if (cap.supported && cap.granted) startStepCounter();
      else
        setErrorMessage(
          cap.supported
            ? "Motion access is needed. Tap START to review permissions."
            : "Step counting is unavailable on this device."
        );
    } catch (error) {
      if (!operation.signal.aborted) {
        if (startedRef.current) stopStepCounter();
        appendLog("capabilityError", () => String(error));
        setErrorMessage("Could not start counting. Tap START to try again.");
      }
    } finally {
      if (operationRef.current === operation) {
        operationRef.current = null;
        setRequesting(false);
      }
    }
  }, [appendLog, startStepCounter, stopStepCounter]);

  const restartStepCounter = React.useCallback(async () => {
    const hadSubscription = stepSubscriptionRef.current != null;
    appendLog("RESTART", () => ({ hadSubscription }));

    // Stop first
    stopStepCounter();

    progressRef.current?.reAnimate();

    // Start new session
    await requestAndStartStepCounter();
  }, [appendLog, requestAndStartStepCounter, stopStepCounter]);

  React.useEffect(() => {
    const operation = new AbortController();
    operationRef.current = operation;
    setRequesting(true);
    isStepCountingSupported()
      .then((result) => {
        if (operation.signal.aborted) return;
        appendLog("isStepCountingSupported", () => result);
        if (!BENCHMARK_ENABLED && result.supported && result.granted) startStepCounter();
      })
      .catch((error: unknown) => {
        if (!operation.signal.aborted) {
          if (startedRef.current) stopStepCounter();
          appendLog("capabilityError", () => String(error));
          setErrorMessage("Could not check step counting. Tap START to try again.");
        }
      })
      .finally(() => {
        if (operationRef.current === operation) {
          operationRef.current = null;
          setRequesting(false);
        }
      });

    return () => {
      stopStepCounter();
    };
  }, [appendLog, startStepCounter, stopStepCounter]);

  const startedAtLabel =
    startedAt !== null
      ? new Date(startedAt).toLocaleTimeString([], {
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
              {loaded
                ? `Counting steps · ${startedAtLabel}`
                : requesting
                  ? "Checking motion access…"
                  : "Stopped"}
            </Text>
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}
          {BENCHMARK_ENABLED && !errorMessage ? (
            <MeasurementStatus startedAt={measurementStartedAt} result={measurementResult} />
          ) : null}

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
            <Button
              title="START"
              onPress={() => {
                requestAndStartStepCounter();
              }}
              disabled={loaded}
            />
            <Button
              title="RESTART"
              onPress={() => {
                restartStepCounter();
              }}
            />
            <Button title="STOP" onPress={stopStepCounter} disabled={!loaded && !requesting} />
          </View>

          {/* LogCat becomes a pure renderer. No emitter subscription here. */}
          <View style={styles.logSection}>
            {EXAMPLE_LOGGING_ENABLED ? (
              <LogCat sessionId={sessionId} logs={logs} onClear={clearLogs} />
            ) : null}
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
  errorText: {
    color: "#ffffff",
    fontSize: 15,
    textAlign: "center",
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
    minHeight: 80,
    width: "100%",
  },
});
