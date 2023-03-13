import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

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
   */
  startStepCounterUpdate(from: number): void;
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
export default TurboModuleRegistry.get<Spec>('RNStepCounter') as Spec | null;
