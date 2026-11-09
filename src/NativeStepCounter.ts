import { TurboModuleRegistry, type TurboModule } from "react-native";

export type CounterType = "STEP_COUNTER" | "ACCELEROMETER" | "CMPedometer";

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * StepCountData object - The Object that contains the step count data.
 * counterType - The type of counter used to count the steps.
 * steps - The number of steps taken during the time period.
 * startDate - The start date of the data.
 * endDate - The end date of the data.
 * distance - Distance in meters, or null when unavailable. Android estimates this from steps.
 * floorsAscended - number of floors ascended (iOS only, null when unavailable)
 * floorsDescended - number of floors descended (iOS only, null when unavailable)
 */
export type StepCountData = {
  counterType: CounterType;
  steps: number; // number of steps
  startDate: number; // Unix timestamp in milliseconds (long)
  endDate: number; // Unix timestamp in milliseconds (long)
  distance: number | null; // meters; Android estimate, null when unavailable on iOS
  floorsAscended?: number | null; // number of floors ascended (iOS only, null when unavailable)
  floorsDescended?: number | null; // number of floors descended (iOS only, null when unavailable)
};

export const NAME = "StepCounter";
export const VERSION = "0.5.0";
export const eventName = "StepCounter.stepCounterUpdate";

export interface Spec extends TurboModule {
  /**
   * @description Check if the step counter is supported on the device.
   * @async
   * @returns {Promise<{ supported: boolean, granted: boolean }>} Returns the `Promise` object,
   * including whether a counting sensor is present (`supported`) and permission is allowed (`granted`).
   * On Android, either an actual step counter or an accelerometer provides support.
   * Both backends require activity recognition permission on API 29+ under the package consent policy.
   * On API 24–28 no activity runtime permission is required, so `granted` is true.
   * Check capabilities again after requesting permission; support does not guarantee successful registration.
   * @example
   * isStepCountingSupported().then((response) => {
   *   const { granted, supported } = response;
   *   setStepCountingSupported(supported);
   *   setStepCountingGranted(granted);
   * });
   */
  isStepCountingSupported(): Promise<{ supported: boolean; granted: boolean }>;
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
  addListener(event: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("StepCounter");
