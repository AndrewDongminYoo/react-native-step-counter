import StepCounter, { LINKING_ERROR } from './NativeStepCounter';

if (StepCounter === null) {
  throw new Error(LINKING_ERROR);
}
export function isStepCountingSupported() {
  return StepCounter.isStepCountingSupported();
}

export function queryStepCounterDataBetweenDates(
  startDate: number,
  endDate: number
) {
  return StepCounter.queryStepCounterDataBetweenDates(startDate, endDate);
}

export function stopStepCounterUpdate() {
  return StepCounter.stopStepCounterUpdate();
}

export function startStepCounterUpdate(date: number) {
  return StepCounter.startStepCounterUpdate(date);
}

export function checkPermission() {
  return StepCounter.checkPermission();
}

export default {
  checkPermission,
  isStepCountingSupported,
  queryStepCounterDataBetweenDates,
  startStepCounterUpdate,
  stopStepCounterUpdate,
};
