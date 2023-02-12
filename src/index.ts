import RNStepCounter, { StepCountData as Data } from './NativeStepCounter';

export const NAME = 'RNStepCounter';
export type StepCountData = Data;

export function isStepCountingSupported() {
  return RNStepCounter.isStepCountingSupported();
}

export function startStepCounterUpdate(from: number) {
  return RNStepCounter.startStepCounterUpdate(from);
}

export function stopStepCounterUpdate() {
  RNStepCounter.stopStepCounterUpdate();
}

export default RNStepCounter;
