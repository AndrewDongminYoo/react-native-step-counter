import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import Spec, {
  LINKING_ERROR,
  StepCountData as Data,
} from './NativeStepCounter';

const { RNStepCounter } = NativeModules;
const RNStepCounterImpl = Object.assign(Spec, RNStepCounter);

const RNStepEmitter = new NativeEventEmitter(RNStepCounter);
const stepCountEmitter = new NativeEventEmitter(RNStepCounterImpl);

console.log('🚀  ~ Spec', Spec);
console.log('🚀  ~ RNStepCounter', RNStepCounter);
console.log('🚀  ~ RNStepCounterImpl', RNStepCounterImpl);
console.log('🚀 ~ RNStepEmitter', RNStepEmitter);
console.log('🚀  ~ stepCountEmitter', stepCountEmitter);

export const NAME = 'StepCounter';
export type StepCountData = Data;

if (Spec === null) {
  throw new Error(LINKING_ERROR);
}

export function isStepCountingSupported() {
  if (Spec.isSupported()) {
    console.log(`${NAME} is supported on this device`);
    return true;
  } else {
    console.log(`${NAME} is not supported on this device`);
    return false;
  }
}

export function startStepCounterUpdate(
  from: number,
  listener: (data: StepCountData) => void,
  context?: object
) {
  Spec.startStepCounter(from);
  return stepCountEmitter.addListener(NAME, listener, context);
}

export function stopStepCounterUpdate(sub?: EmitterSubscription) {
  Spec.stopStepCounter();
  sub && stepCountEmitter.removeSubscription(sub);
  stepCountEmitter.removeAllListeners(NAME);
}

export default {
  ModuleName: NAME,
  isStepCountingSupported,
  startStepCounterUpdate,
  stopStepCounterUpdate,
};
