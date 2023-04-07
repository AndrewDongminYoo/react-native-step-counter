import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 *
 * @typedef StepCountData object - The Object that contains the step count data.
 * @property {string} counterType - The type of counter used to count the steps.
 * @property {number} steps - The number of steps taken during the time period.
 * @property {number} startDate - The start date of the data.
 * @property {number} endDate - The end date of the data.
 * @property {number} distance - The distance in meters that the user has walked or run.
 * @property {number|undefined} floorsAscended - number of floors ascended (iOS only)
 * @property {number|undefined} floorsDescended - number of floors descended (iOS only)
 */
export type StepCountData = {
  counterType: string; // 'STEP_COUNTER'|'ACCELEROMETER'|'CMPedometer'
  steps: number; // number of steps
  startDate: number; // Unix timestamp in milliseconds (long)
  endDate: number; // Unix timestamp in milliseconds (long)
  distance: number; // distance in meters (android: probably not accurate)
  floorsAscended?: number; // number of floors ascended (iOS only)
  floorsDescended?: number; // number of floors descended (iOS only)
};

export const NAME = 'RNStepCounter';
export const VERSION = '0.1.11';
export const eventName = 'StepCounter.stepCounterUpdate';

export interface Spec extends TurboModule {
  /**
   * Check if the step counter is supported on the device.
   *
   * @async
   * @returns {Promise<Record<string, boolean>>} Returns the `Promise` object,
   * including information such as whether the user's device has a step counter sensor by default (`supported`)
   * and whether the user has allowed the app to measure the pedometer data. (`granted`)
   * @property {boolean} granted - The permission is granted or not.
   * @property {boolean} supported - The step counter is supported or not.
   * @example
   * isStepCountingSupported().then((response) => {
   *   const { granted, supported } = response;
   *   setStepCountingSupported(supported);
   *   setStepCountingGranted(granted);
   * });
   */
  isStepCountingSupported(): Promise<Record<string, boolean>>;
  /**
   * @param {number} from the current time obtained by `new Date()` in milliseconds.
   */
  startStepCounterUpdate(from: number): void;
  /**
   * Stop updating the step count data.
   * Removes all the listeners that were registered with `startStepCounterUpdate`.
   */
  stopStepCounterUpdate(): void;

  /* Required Methods for NativeEventEmitter */
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/* Getting enforcing the module from the registry. */
export default TurboModuleRegistry.get<Spec>('RNStepCounter') as Spec | null;
