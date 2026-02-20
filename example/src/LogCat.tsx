import StepCounter, { StepEventEmitter } from "@dongminyu/react-native-step-counter";
import React, { Fragment, useEffect, useState } from "react";
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
console.debug("🚀 - NativeModules.StepCounter:", StepCounter);

/**
 * @description A component that displays the logs from the native module.
 * @returns {React.ReactComponentElement} Logger Component.
 * @see https://reactnative.dev/docs/native-modules-ios#sending-events-to-javascript
 * @see https://reactnative.dev/docs/native-modules-android#sending-events-to-javascript
 * @see https://reactnative.dev/docs/scrollview
 * @example
 *    <LogCat triggered={loaded} />
 */
const LogCat = ({ triggered, clearTrigger }: { triggered: boolean; clearTrigger: number }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [copyText, setCopyText] = useState("Copy");
  const scrollRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clearTrigger > 0) {
      setLogs([]);
    }
  }, [clearTrigger]);

  const copyLogs = () => {
    if (logs.length === 0) {
      return;
    }

    Clipboard.setString(logs.join("\n"));
    setCopyText("Copied");
    if (Platform.OS === "android") {
      ToastAndroid.show("Logs copied to clipboard", ToastAndroid.SHORT);
    }
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopyText("Copy");
    }, 1200);
  };

  useEffect(() => {
    const supportedEvents = [
      "StepCounter.stepCounterUpdate",
      "StepCounter.stepDetected",
      "StepCounter.errorOccurred",
      "StepCounter.stepsSensorInfo",
    ];

    const subscriptions = supportedEvents.map((eventName) =>
      StepEventEmitter.addListener(eventName, (event: unknown) => {
        setLogs((prevLogs) => [...prevLogs, `[${eventName}]`, JSON.stringify(event)]);
        scrollRef.current?.scrollToEnd({ animated: false });
      })
    );

    return () => {
      subscriptions.forEach((sub) => sub.remove());
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, [triggered]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LogCat</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy logs"
          disabled={logs.length === 0}
          onPress={copyLogs}
          style={({ pressed }) => [
            styles.copyButton,
            logs.length === 0 && styles.copyButtonDisabled,
            pressed && styles.copyButtonPressed,
          ]}
        >
          <Svg height={16} viewBox="0 0 24 24" width={16}>
            <Rect height={10} rx={2} stroke="#f3f4f6" strokeWidth={1.8} width={10} x={10} y={10} />
            <Rect height={10} rx={2} stroke="#f3f4f6" strokeWidth={1.8} width={10} x={4} y={4} />
          </Svg>
          <Text style={styles.copyText}>{copyText}</Text>
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} style={styles.logArea}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.log}>
            {formatLog(log)}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const formatLog = (logs: string) => {
  const parts = logs.split(/\n/);
  return parts.map((part, index) => {
    if (part.startsWith("{")) {
      return (
        <Text key={index} style={styles.nString}>
          {formatJson(part)}
        </Text>
      );
    } else if (part.startsWith("[")) {
      return (
        <Text key={index} style={styles.nTag}>
          {part.substring(13, part.length - 1)}
        </Text>
      );
    } else {
      return <Text key={index}>{part}</Text>;
    }
  });
};

/**
 * @description This function takes a JSON string and returns an array of React elements that
 * display the key and value of each property in the JSON string. The key is
 * displayed in a dark gray color, and the value is displayed in a light gray
 * color. The value is also formatted as a string, boolean, or number.
 * @param {string} json - JSON formatted String.
 * @returns {React.ReactElement[]} - Formatted Console Text Element.
 * @example
 * eventEmitter.addListener(EVENT_NAME, (data) => {
 *    return (
 *       <Text>{formatJson(data)}</Text>
 *    );
 * });
 */
function formatJson(json: string): React.JSX.Element[] {
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
        {" "}
        {KEY}
        {VAL}
        {",\n"}
      </Fragment>
    );
  });
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
  copyButtonPressed: {
    opacity: 0.85,
  },
  copyButtonDisabled: {
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
