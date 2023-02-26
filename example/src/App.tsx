import React, { Component } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Motion Tracking Permission: {this.state.granted ? 'granted' : 'denied'}</Text>
          {!this.state.granted ? (
            <Button title="Request Permission" onPress={this.askPermission} />
          ) : (
            <>
              <Text style={{ fontSize: 36, color: '#000' }}>걸음 수: {this.state.steps}</Text>
              <Button title="Start StepCounter Updates" onPress={this.startStepCounter} />
              <Button title="Stop StepCounter Updates" onPress={this.stopStepCounter} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }
}
