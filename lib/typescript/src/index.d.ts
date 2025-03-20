import type { EmitterSubscription as Subscription } from 'react-native';
import type { StepCountData, Spec } from './NativeStepCounter';
import { VERSION, NAME } from './NativeStepCounter';
export interface ParsedStepCountData {
    dailyGoal: string;
    steps: number;
    stepsString: string;
    calories: string;
    startDate: string;
    endDate: string;
    distance: string;
}
/**
 * A module that allows you to get the step count data.
 * `CMStepCounter` is deprecated in iOS 8.0. Used `CMPedometer` instead.
 * floorsAscended - The number of floors ascended during the time period. iOS Only.
 * floorsDescended - The number of floors descended during the time period. iOS Only.
 * counterType - The type of counter used to count the steps.
 * @throws {Error} LINKING_ERROR - Throws Error If global variable turboModuleProxy is undefined.
 * @example
 * import { StepCounter } from '@dongminyu/react-native-step-counter';
 */
declare const StepCounter: Spec;
type StepCountUpdateCallback = (result: StepCountData) => void;
export declare const isSensorWorking: boolean;
/**
 * Transform the step count data into a more readable format.
 * You can use it or directly use the `StepCountData` type.
 * @param {StepCountData} data - Step Counter Sensor Event Data.
 * @returns {ParsedStepCountData} - String Parsed Count Data.
 */
export declare function parseStepData(data: StepCountData): ParsedStepCountData;
/**
 * Returns whether the stepCounter is enabled on the device.
 * iOS 8.0+ only. Android is available since KitKat (4.4 / API 19).
 * @see https://developer.android.com/about/versions/android-4.4.html
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613963-isstepcountingavailable
 * @returns {Promise<Record<string, boolean>>} A promise that resolves with an object containing the stepCounter availability.
 * supported - Whether the stepCounter is supported on device.
 * granted - Whether user granted the permission.
 */
export declare function isStepCountingSupported(): Promise<Record<string, boolean>>;
/**
 * Start to subscribe stepCounter updates.
 * Only the past seven days worth of data is stored and available for you to retrieve.
 * Specifying a start date that is more than seven days in the past returns only the available data.
 * ### iOS
 * `CMStepCounter.startStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.startUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates
 * @see https://developer.apple.com/documentation/coremotion/cmstepcounter/1616151-startstepcountingupdates
 * @param {Date} start A date indicating the start of the range over which to measure steps.
 * @param {StepCountUpdateCallback} callBack - This callback function makes it easy for app developers to receive sensor events.
 * @returns {Subscription} - Returns a Subscription that enables you to call.
 * When you would like to unsubscribe the listener, just use a method of subscriptions's `remove()`.
 * @example
 * const startDate = new Date();
 * startStepCounterUpdate(startDate).then((response) => {
 *    const data = parseStepCountData(response);
 * })
 */
export declare function startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback): Subscription;
/**
 * Stop the step counter updates.
 * ### iOS
 * `CMStepCounter.stopStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.stopUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613973-stopupdates
 * @see https://developer.apple.com/documentation/coremotion/cmstepcounter/1616157-stopstepcountingupdates
 */
export declare function stopStepCounterUpdate(): void;
export { NAME, VERSION };
export default StepCounter;
//# sourceMappingURL=index.d.ts.map