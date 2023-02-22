/* A way to import the module. */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * @type {object} StepCountData - The Object that contains the step count data.
 * @property {string} counterType - The type of counter used to count the steps. (Android only)
 * @property {number} steps - The number of steps taken during the time period.
 * @property {number} calories - The number of calories burned during the time period.
 * @property {number} startDate - The start date of the data.
 * @property {number} endDate - The end date of the data.
 * @property {number} distance - The distance in meters that the user has walked or run.
 * ---
 * ** iOS Only Properties **
 * @property {number} floorsAscended - The number of floors ascended during the time period.
 * @property {number} floorsDescended - The number of floors descended during the time period.
 */
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

/* Defining the interface of the module. */
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
