import React, { Fragment, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, type EmitterSubscription } from 'react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.RNStepCounter);

const LogCat = ({ trigger: loaded }: { trigger: boolean }) => {
  const [rendered, setRendered] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [_, setSubscriptions] = useState<EmitterSubscription[]>([]);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    const supportedEvents = [
      'StepCounter.stepCounterUpdate',
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
        scrollRef.current?.scrollToEnd();
      });
      setSubscriptions((prevSubs) => [...prevSubs, newSub]);
    }
    setRendered(loaded);
    // unsubscribe the event listener when the component unmounts
    return () => {
      setSubscriptions([]);
    };
  }, [rendered, loaded]);

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
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('{') ? (
          <Text key={index} style={styles.nString}>
            {formatJson(part)}
          </Text>
        ) : part.startsWith('[') ? (
          <Text key={index} style={styles.nTag}>
            {part.substring(13, part.length - 1)}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </>
  );
};

function formatJson(json: string) {
  const parsed = JSON.parse(json);
  return Object.entries(parsed).map(([key, value]) => {
    const KEY = <Text style={styles.nString}>{`"${key}"`}: </Text>;
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
    width: '90%',
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
    fontSize: 12,
    lineHeight: 16,
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
