import StepCounter from './NativeStepCounter';
import { IDate, PermissionStatus } from './types';

export function isStepCountingSupported(
  callback: (error: any, isAvailable: boolean) => void
) {
  return StepCounter.isStepCountingSupported(callback);
}

export function queryStepCounterDataBetweenDates(
  startDate: IDate,
  endDate: IDate,
  handler: (error: any, stepCounterData: any) => void
) {
  return StepCounter.queryStepCounterDataBetweenDates(
    startDate,
    endDate,
    handler
  );
}

export function stopStepCounterUpdate() {
  return StepCounter.stopStepCounterUpdate();
}

export function startStepCounterUpdate(
  date: IDate,
  handler: (stepCounterData: any) => void
) {
  return StepCounter.startStepCounterUpdate(date, handler);
}

export function authorizationStatus(
  callback: (error: any, status: PermissionStatus) => void
) {
  return StepCounter.authorizationStatus(callback);
}

export default {
  authorizationStatus,
  isStepCountingSupported,
  queryStepCounterDataBetweenDates,
  startStepCounterUpdate,
  stopStepCounterUpdate,
};
