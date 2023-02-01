import type { Platform, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import { PermissionStatus, IDate } from './types';

export interface StepCounterModule extends TurboModule {
  getConstants(): {
    platform: Platform;
  };
  isStepCountingSupported(
    callback: (error: any, isAvailable: boolean) => void
  ): void;
  isWritingStepsSupported(
    callback: (error: any, isAvailable: boolean) => void
  ): void;
  startStepCounterUpdate(
    date: IDate,
    callback: (stepCounterData: any) => void
  ): void;
  stopStepCounterUpdate(): void;
  queryStepCounterDataBetweenDates(
    startDate: IDate,
    endDate: IDate,
    callback: (error: any, stepCounterData: any) => void
  ): void;
  authorizationStatus(
    callback: (error: any, status: PermissionStatus) => void
  ): void;
}

const TMStepCounter =
  TurboModuleRegistry.getEnforcing<StepCounterModule>('StepCounter');

export default TMStepCounter;
