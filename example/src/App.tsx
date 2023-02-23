import React, { Component } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
  requestPermissions,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from 'react-native-step-counter';

type AppState = {
  granted: boolean;
  supported: boolean;
  steps: number;
};

export default class App extends Component<{}, AppState> {
  state = {
    granted: false,
    supported: false,
    steps: 0,
  };

  /** get user's motion permission and check pedometer is available */
  askPermission = async () => {
    await requestPermissions().then((response) => {
      console.debug('🐰 permissions granted?', response.granted);
      console.debug('🐰 permissions canAskAgain?', response.canAskAgain);
      console.debug('🐰 permissions expires?', response.expires);
      console.debug('🐰 permissions status?', response.status);
      this.setState({
        granted: response.granted,
      });
    });
    const featureAvailable = isStepCountingSupported();
    console.debug('🚀 - isStepCountingSupported', featureAvailable);
    this.setState({
      supported: featureAvailable,
    });
  };

  startStepCounter = async () => {
    const now = new Date();
    startStepCounterUpdate(now, (data) => {
      console.log(parseStepData(data));
      this.setState({
        steps: data.steps,
      });
    });
  };

  stopStepCounter() {
    this.setState({
      steps: 0,
    });
    stopStepCounterUpdate();
  }

  componentDidMount(): void {
    this.askPermission();
  }
  componentDidUpdate(_: Readonly<{}>, __: Readonly<AppState>): void {
    if (this.state.granted && this.state.supported) {
      this.startStepCounter();
    }
  }
  componentWillUnmount(): void {
    this.stopStepCounter();
  }
  render() {
    return (
      <SafeAreaView>
        <View style={styles.screen}>
          <Text style={styles.step}>권한허용:{this.state.granted ? '🅾️' : '️❎'}</Text>
          <Text style={styles.step}>사용가능:{this.state.supported ? '🅾️' : '️❎'}</Text>
          <Text style={styles.step}>걸음 수: {this.state.steps}</Text>
          <Button onPress={this.startStepCounter} title="시작" />
          <Button onPress={this.stopStepCounter} title="정지" />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    display: 'flex',
  },
  step: {
    color: '#000',
    fontSize: 36,
  },
});
