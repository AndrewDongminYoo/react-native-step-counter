import type { TurboModule } from 'react-native';
/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * StepCountData object - The Object that contains the step count data.
 * counterType - The type of counter used to count the steps.
 * steps - The number of steps taken during the time period.
 * startDate - The start date of the data.
 * endDate - The end date of the data.
 * distance - The distance in meters that the user has walked or run.
 * floorsAscended - number of floors ascended (iOS only)
 * floorsDescended - number of floors descended (iOS only)
 */
export type StepCountData = {
    counterType: string;
    steps: number;
    startDate: number;
    endDate: number;
    distance: number;
    floorsAscended?: number;
    floorsDescended?: number;
};
export declare const NAME = "StepCounter";
export declare const VERSION = "0.2.3";
export declare const eventName = "StepCounter.stepCounterUpdate";
export interface Spec extends TurboModule {
    /**
     * @description Check if the step counter is supported on the device.
     * @async
     * @returns {Promise<Record<string, boolean>>} Returns the `Promise` object,
     * including information such as whether the user's device has a step counter sensor by default (`supported`)
     * and whether the user has allowed the app to measure the pedometer data. (`granted`)
     * granted - The permission is granted or not.
     * supported - The step counter is supported or not.
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
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeStepCounter.d.ts.map