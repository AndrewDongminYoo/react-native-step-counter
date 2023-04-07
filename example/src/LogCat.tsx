import React, { Fragment, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.RNStepCounter);

/**
 * A component that displays the logs from the native module.
 *
 * @param {object} props - View Component Props but only has one property.
 * @param {boolean} props.triggered - A boolean that indicates whether the native module is loaded.
 * @returns {React.ReactComponentElement} Logger Component.
 * @see https://reactnative.dev/docs/native-modules-ios#sending-events-to-javascript
 * @see https://reactnative.dev/docs/native-modules-android#sending-events-to-javascript
 * @see https://reactnative.dev/docs/scrollview
 * @example
 *    <LogCat triggered={loaded} />
 */
const LogCat = ({ triggered }: { triggered: boolean }) => {
  const [rendered, setRendered] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [_, setSubscriptions] = useState<EmitterSubscription[]>([]);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    const supportedEvents = [
      // 'StepCounter.stepCounterUpdate',
      'StepCounter.stepDetected',
      'StepCounter.errorOccurred',
      'StepCounter.stepsSensorInfo',
    ];

    for (const eventName of supportedEvents) {
      const newSub = eventEmitter.addListener(eventName, (event: unknown) => {
        // handle the event data and update the log list
        setLogs((prevLogs) => {
          return [...prevLogs, `[${eventName}]`, JSON.stringify(event)];
        });
        scrollRef.current?.scrollToEnd({ animated: false });
      });
      setSubscriptions((prevSubs) => [...prevSubs, newSub]);
    }
    setRendered(triggered);
    // unsubscribe the event listener when the component unmounts
    return () => {
      setSubscriptions([]);
    };
  }, [rendered, triggered]);

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef}>
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
    if (part.startsWith('{')) {
      return (
        <Text key={index} style={styles.nString}>
          {formatJson(part)}
        </Text>
      );
    } else if (part.startsWith('[')) {
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
 * This function takes a JSON string and returns an array of React elements that
 * display the key and value of each property in the JSON string. The key is
 * displayed in a dark gray color, and the value is displayed in a light gray
 * color. The value is also formatted as a string, boolean, or number.
 *
 * @param {string} json - JSON formatted String.
 * @returns {React.ReactElement[]} - Formatted Console Text Element.
 * @example
 * eventEmitter.addListener(EVENT_NAME, (data) => {
 *    return (
 *       <Text>{formatJson(data)}</Text>
 *    );
 * });
 */
function formatJson(json: string): JSX.Element[] {
  const parsed = JSON.parse(json);
  return Object.entries(parsed).map(([key, value]) => {
    const KEY = <Text style={styles.nString}>{`"${key}": `}</Text>;
    let VAL = <></>;
    switch (typeof value) {
      case 'boolean':
        VAL = <Text style={styles.nBoolean}>{value.toString()}</Text>;
        break;
      case 'number':
        VAL = <Text style={styles.nNumber}>{value.toFixed(1)}</Text>;
        break;
      case 'string':
        VAL = <Text style={styles.sensorName}>{`"${value}"`}</Text>;
        break;
    }
    return (
      <Fragment key={key}>
        {' '}
        {KEY}
        {VAL}
        {',\n'}
      </Fragment>
    );
  });
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    height: 200,
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: '#111827',
  },
  log: {
    fontFamily: 'Helvetica',
    fontSize: 15,
    lineHeight: 18,
    marginVertical: 2,
    color: 'white',
  },
  nTag: {
    color: 'crimson',
    fontWeight: 'bold',
  },
  nString: {
    color: 'yellow',
  },
  nBoolean: {
    color: 'pink',
  },
  nNumber: {
    color: 'skyblue',
  },
  sensorName: {
    color: 'white',
  },
});

export default LogCat;
