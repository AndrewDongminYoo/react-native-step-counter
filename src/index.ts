import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { EmitterSubscription as Subscription } from 'react-native';
import type { StepCountData as Data, Spec } from './NativeStepCounter';
import { eventName, VERSION, NAME } from './NativeStepCounter';

/* A way to check if the module is linked. */
const LINKING_ERROR =
  "The package '@dongminyu/react-native-step-counter' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({
    ios: '- You have run `pod install` in the `ios` directory and then clean, rebuild and re-run the app. You may also need to re-open Xcode to get the new pods.\n',
    android: '- You have the Android development environment set up: `https://reactnative.dev/docs/environment-setup.`',
    default: '',
  }) +
  '- Use the "npx react-native clean" command to clean up the module\'s cache and select the ' +
  '"watchman", "yarn", "metro", "android", "npm" options with comma-separated. ' +
  'Re-Install packages and re-build the app again .' +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n' +
  'If none of these fix the issue, please open an issue on the Github repository: ' +
  'https://github.com/AndrewDongminYoo/react-native-step-counter`';

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * @type {object} StepCountData - The Object that contains the step count data.
 * @property {string} counterType - The type of counter used to count the steps.
 * @property {number} steps - The number of steps taken during the time period.
 * @property {number} startDate - The start date of the data.
 * @property {number} endDate - The end date of the data.
 * @property {number} distance - The distance in meters that the user has walked or run.
 */
type StepCountData = Data;

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
 * We keep TurboModuleManager alive until the JS VM is deleted.
 * It is perfectly valid to only use/create TurboModules from JS.
 * In such a case, we shouldn't de-alloc TurboModuleManager if there
 * aren't any strong references to it in ObjC. Hence, we give
 * __turboModuleProxy a strong reference to TurboModuleManager.
 * @link [`TurboModuleRegistry`](../node_modules/react-native/Libraries/TurboModule/TurboModuleRegistry.js)
 * @link [`RCTTurboModuleManager`](../node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/RCTTurboModuleManager.mm)
 * @link [`TurboModuleBinding`](../node_modules/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleBinding.cpp)
 */
// @ts-ignore
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const StepCounterModule = isTurboModuleEnabled ? require('./NativeStepCounter').default : NativeModules.RNStepCounter;

/**
 * A module that allows you to get the step count data.
 * @module StepCounter
 * @example
 * ```ts
 * import { StepCounter } from '@dongminyu/react-native-step-counter';
 * ```
 * ---
 * ** iOS Only Properties **
 * @property {number} floorsAscended - The number of floors ascended during the time period.
 * @property {number} floorsDescended - The number of floors descended during the time period.
 * `CMStepCounter` is deprecated in iOS 8.0. Used `CMPedometer` instead.
 * ---
 * ** Android Only Properties **
 * @property {string} counterType - The type of counter used to count the steps.
 * ---
 */
const RNStepCounter = (
  StepCounterModule
    ? StepCounterModule
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      )
) as Spec;

const StepEventEmitter = new NativeEventEmitter(RNStepCounter);
type StepCountUpdateCallback = (result: StepCountData) => void;
export const isSensorWorking = StepEventEmitter.listenerCount(eventName) > 0;

/**
 * Transform the step count data into a more readable format.
 * you can use it or directly use the `StepCountData` type.
 */
export function parseStepData(data: StepCountData): ParsedStepCountData {
  const { steps, startDate, endDate, distance } = data;
  const dailyGoal = 10000;
  const stepsString = steps + ' steps';
  const kCal = (steps * 0.045).toFixed(2) + 'kCal';
  const endDateTime = new Date(endDate).toLocaleTimeString('en-gb');
  const startDateTime = new Date(startDate).toLocaleTimeString('en-gb');
  const roundedDistance = distance.toFixed(1) + 'm';
  const stepGoalStatus = steps >= dailyGoal ? 'Goal Reached' : `${steps}/${dailyGoal} steps`;
  return {
    dailyGoal: stepGoalStatus,
    steps,
    stepsString,
    calories: kCal,
    startDate: startDateTime,
    endDate: endDateTime,
    distance: roundedDistance,
  };
}

/**
 * If you're using a method or property that's not available on the current platform, throw this error.
 * @param {string} moduleName The name of the module.
 * @param {string} propertyName The name of the property.
 * @returns {Error} The error.
 * @example
 * ```ts
 *  if (!RNStepCounter.startStepCounterUpdate) {
 *     throw new UnavailabilityError(NativeModuleName, eventName);
 *  }
 * ```
 */
class UnavailabilityError extends Error {
  code: string;
  constructor(moduleName: string, propertyName: string) {
    super(
      `The method or property ${moduleName}.${propertyName} is not available on ${Platform.OS}, ` +
        "are you sure you've linked all the native dependencies properly?"
    );
    this.code = 'ERR_UNAVAILABLE';
  }
}

/**
 * Returns whether the stepCounter is enabled on the device.
 * iOS 8.0+ only. Android is available since KitKat (4.4 / API 19).
 * @link https://developer.android.com/about/versions/android-4.4.html
 * @link https://developer.apple.com/documentation/coremotion/cmpedometer/1613963-isstepcountingavailable
 * @returns {Promise<Record<string, boolean>>} A promise that resolves with an object containing the stepCounter availability.
 * @property {boolean} supported - Whether the stepCounter is supported on device.
 * @property {boolean} granted - Whether user granted the permission.
 */
export function isStepCountingSupported(): Promise<Record<string, boolean>> {
  return RNStepCounter.isStepCountingSupported();
}

/**
 * Start to subscribe stepCounter updates.
 * @param {Date} start A date indicating the start of the range over which to measure steps.
 * @return Returns a [Subscription](Subscription) that enables you to call.
 *
 * when you would like to unsubscribe the listener, just use a method of subscriptions's `remove()`.
 * @example
 * ```ts
 * const startDate = new Date();
 * startStepCounterUpdate(startDate).then((response) => {
 *    const data = parseStepCountData(response);
 * })
 * ```
 * ### iOS
 * `CMStepCounter.startStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.startUpdates` instead.
 *
 * @link [`CMPedometer.stopUpdates`](https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates)
 * @link [`CMStepCounter.stopStepCountingUpdates`](https://developer.apple.com/documentation/coremotion/cmstepcounter/1616151-startstepcountingupdates)
 *
 * > Only the past seven days worth of data is stored and available for you to retrieve.
 * > Specifying a start date that is more than seven days in the past returns only the available data.
 */
export function startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback): Subscription {
  if (!RNStepCounter.startStepCounterUpdate) {
    throw new UnavailabilityError(NAME, eventName);
  }
  const from = start.getTime();
  RNStepCounter.startStepCounterUpdate(from);
  return StepEventEmitter.addListener(eventName, callBack);
}

/**
 * Stop the step counter updates.
 * @return `void`
 * ### iOS
 * `CMStepCounter.stopStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.stopUpdates` instead.
 *
 * @link [`CMPedometer.stopUpdates`](https://developer.apple.com/documentation/coremotion/cmpedometer/1613973-stopupdates)
 * @link [`CMStepCounter.stopStepCountingUpdates`](https://developer.apple.com/documentation/coremotion/cmstepcounter/1616157-stopstepcountingupdates)
 */
export function stopStepCounterUpdate(): void {
  StepEventEmitter.removeAllListeners(eventName);
  RNStepCounter.stopStepCounterUpdate();
}

export { NAME, VERSION };
export default RNStepCounter;
