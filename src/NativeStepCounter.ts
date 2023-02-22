/* A way to import the module. */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type StepCountData = {
  counterType?: string; // 'STEP_COUNTER'|'ACCELEROMETER'; // (Android only)
  dailyGoal: number; // daily goal (default: 10000)
  steps: number; // number of steps
  calories: number; // number of calories (probably not accurate)
  startDate: number; // Unix timestamp in milliseconds
  endDate: number; // Unix timestamp in milliseconds
  distance: number; // distance in meters (probably not accurate)
  floorsAscended?: number; // number of floors ascended (iOS only)
  floorsDescended?: number; // number of floors descended (iOS only)
};

export interface Spec extends TurboModule {
  isStepCountingSupported(): boolean;
  startStepCounterUpdate(from: number): boolean;
  stopStepCounterUpdate(): void;

  /* Required Methods for NativeEventEmitter */
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/* Getting enforcing the module from the registry. */
export default TurboModuleRegistry.getEnforcing<Spec>('RNStepCounter') as Spec;
