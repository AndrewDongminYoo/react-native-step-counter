import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

export type LogLine = {
  sessionId: string;
  ts: number;
  tag: string;
  payload: string;
};

const LogCat = ({
  sessionId,
  logs,
  onClear,
}: {
  sessionId: string;
  logs: LogLine[];
  onClear: () => void;
}) => {
  const [copyText, setCopyText] = useState("Copy");
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll on new logs
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [logs.length]);

  // Reset copy state when session changes
  useEffect(() => {
    setCopyText("Copy");
  }, [sessionId]);

  const visibleLines = useMemo(() => {
    // In this design, App already clears logs per session.
    // Keeping filter anyway as a safety net.
    return logs.filter((l) => l.sessionId === sessionId);
  }, [logs, sessionId]);

  const copyLogs = () => {
    if (visibleLines.length === 0) return;

    const text = visibleLines
      .map((l) => {
        const time = new Date(l.ts).toLocaleTimeString([], { hour12: false });
        return `${time} [${l.tag}] ${safeJson(l.payload)}`;
      })
      .join("\n");

    Clipboard.setString(text);
    setCopyText("Copied");
    if (Platform.OS === "android") {
      ToastAndroid.show("Logs copied to clipboard", ToastAndroid.SHORT);
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyText("Copy"), 1200);
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LogCat</Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear logs"
            disabled={visibleLines.length === 0}
            onPress={onClear}
            style={({ pressed }) => [
              styles.clearButton,
              visibleLines.length === 0 && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.copyText}>Clear</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy logs"
            disabled={visibleLines.length === 0}
            onPress={copyLogs}
            style={({ pressed }) => [
              styles.copyButton,
              visibleLines.length === 0 && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Svg height={16} viewBox="0 0 24 24" width={16}>
              <Rect
                height={10}
                rx={2}
                stroke="#f3f4f6"
                strokeWidth={1.8}
                width={10}
                x={10}
                y={10}
              />
              <Rect height={10} rx={2} stroke="#f3f4f6" strokeWidth={1.8} width={10} x={4} y={4} />
            </Svg>
            <Text style={styles.copyText}>{copyText}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.logArea}>
        {visibleLines.map((line, index) => (
          <Text key={`${line.ts}-${index}`} style={styles.log}>
            {formatLogLine(line)}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

function formatLogLine(line: LogLine) {
  const time = new Date(line.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Render tag + JSON pretty-ish
  return (
    <>
      <Text style={styles.nTag}>{`${time} [${line.tag}] `}</Text>
      <Text style={styles.nString}>{safeJson(line.payload)}</Text>
    </>
  );
}

function safeJson(json: string) {
  try {
    const parsed = JSON.parse(json);
    return Object.entries(parsed).map(([key, value]) => {
      const KEY = <Text style={styles.nString}>{`"${key}": `}</Text>;
      let VAL = <></>;
      switch (typeof value) {
        case "boolean":
          VAL = <Text style={styles.nBoolean}>{value.toString()}</Text>;
          break;
        case "number":
          VAL = <Text style={styles.nNumber}>{value.toFixed(1)}</Text>;
          break;
        case "string":
          VAL = <Text style={styles.sensorName}>{`"${value}"`}</Text>;
          break;
      }
      return (
        <Fragment key={key}>
          {" \n"}
          {KEY}
          {VAL}
          {", "}
        </Fragment>
      );
    });
  } catch {
    return (
      <Text>
        {"\n"}
        {JSON.stringify(json)}
        {"\n"}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    height: "45%",
    width: "100%",
    alignItems: "stretch",
    justifyContent: "center",
    margin: 10,
    padding: 20,
    borderRadius: 10,
    borderColor: "white",
    borderWidth: 2,
    backgroundColor: "#111827",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    color: "#f3f4f6",
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: "#334155",
    borderColor: "#64748b",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "#1f2937",
    borderColor: "#64748b",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  copyText: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "600",
  },
  logArea: {
    flex: 1,
  },
  log: {
    fontFamily: "Helvetica",
    fontSize: 15,
    lineHeight: 18,
    marginVertical: 2,
    color: "white",
  },
  nTag: {
    color: "crimson",
    fontWeight: "bold",
  },
  nString: {
    color: "yellow",
  },
  nBoolean: {
    color: "pink",
  },
  nNumber: {
    color: "skyblue",
  },
  sensorName: {
    color: "white",
  },
});

export default LogCat;
