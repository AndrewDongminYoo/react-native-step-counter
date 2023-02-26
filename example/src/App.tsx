import React, { Component } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
import {
  isStepCountingSupported,
  parseStepData,
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
    isStepCountingSupported().then((result) => {
      console.debug('🚀 - isStepCountingSupported', result);
      this.setState({
        granted: result.granted ?? false,
        supported: result.supported ?? false,
      });
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
        <View style={{
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          display: 'flex',
        }}>
          <Text style={{ fontSize: 20, color: 'slategrey' }}>
            User Granted Step Counter Feature?: {this.state.granted ? 'yes' : 'no'}
          </Text>
          <Text style={{ fontSize: 20, color: 'slategrey' }}>
            Device has Step Counter Sensor?: {this.state.supported ? 'yes' : 'no'}
          </Text>
          {!this.state.granted ? (
            <Button title="Check Permission" onPress={this.askPermission} />
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
