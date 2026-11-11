import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BENCHMARK_DURATION_MS, BENCHMARK_WARMUP_MS, benchmarkNow } from "./benchmark";

export type MeasurementResult = { complete: boolean; updates: number };

export default function MeasurementStatus({
  startedAt,
  result,
}: {
  startedAt: number | null;
  result: MeasurementResult | null;
}) {
  const [now, setNow] = React.useState(benchmarkNow);
  React.useEffect(() => {
    if (startedAt === null) return;
    setNow(benchmarkNow());
    const timer = setInterval(() => setNow(benchmarkNow()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);
  const warmingUp = elapsed < BENCHMARK_WARMUP_MS;
  const remaining = Math.ceil(
    Math.max(
      0,
      (warmingUp ? BENCHMARK_WARMUP_MS : BENCHMARK_WARMUP_MS + BENCHMARK_DURATION_MS) - elapsed
    ) / 1000
  );
  const title =
    startedAt !== null
      ? `${warmingUp ? "Warm-up" : "Measuring"} · ${remaining}s left`
      : result
        ? result.complete
          ? "Measurement complete"
          : "Measurement stopped early"
        : "Ready to measure";
  const detail =
    startedAt !== null
      ? "Keep this screen open. Stops automatically."
      : result
        ? result.updates > 0
          ? `Step updates during measurement: ${result.updates}`
          : "No step updates during measurement. Tap START to try again."
        : "Tap START when you are ready to walk.";

  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  detail: { color: "#e5e7eb", fontSize: 13, marginTop: 4, textAlign: "center" },
});
