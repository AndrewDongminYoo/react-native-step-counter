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

export const NAME = 'RNStepCounter';
export const VERSION = '0.1.0';
export const eventName = 'StepCounter.stepCounterUpdate';

export interface Spec extends TurboModule {
  /**
   * check if the step counter is supported on the device.
   * @return {Promise<Record<string, boolean>>} Returns the `Promise` object,
   * including information such as whether the user's device has a step counter sensor by default (`supported`)
   * and whether the user has allowed the app to measure the pedometer data. (`granted`)
   * @property {boolean} granted - The permission is granted or not.
   * @property {boolean} supported - The step counter is supported or not.
   * @example
   * ```ts
   * isStepCountingSupported().then((response) => {
   *   const { granted, supported } = response;
   *   setStepCountingSupported(supported);
   *   setStepCountingGranted(granted);
   * });
   * ```
   */
  isStepCountingSupported(): Promise<Record<string, boolean>>;
  /**
   * @param {number} from the current time obtained by `new Date()` in milliseconds.
   * @example
   * ```ts
   * const startDate = new Date();
   * startStepCounterUpdate(startDate).then((response) => {
   *    const data = parseStepCountData(response);
   * })
   * ```
   */
  startStepCounterUpdate(from: number): boolean;
  /**
   * Stop updating the step count data.
   *
   * removes all the listeners that were registered with `startStepCounterUpdate`.
   */
  stopStepCounterUpdate(): void;

  /* Required Methods for NativeEventEmitter */
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/* Getting enforcing the module from the registry. */
export default TurboModuleRegistry.getEnforcing<Spec>('RNStepCounter') as Spec;
