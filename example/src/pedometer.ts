import { NativeModules, NativeEventEmitter } from 'react-native';
import Pedometer from 'react-native-step-counter';
export const myModuleEvt = new NativeEventEmitter(NativeModules.Pedometer);

export const checkAvailable = async () => {
  const supported = Pedometer.isStepCountingSupported();
  if (supported) {
    console.log('Sensor TYPE_STEP_COUNTER is supported on this device');
    return true;
  } else {
    console.log('Sensor TYPE_STEP_COUNTER is not supported on this device');
    return false;
  }
};

export function loggingStop() {
  myModuleEvt.removeAllListeners('StepCounter');
  Pedometer.stopStepCounterUpdate();
}
