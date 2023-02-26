import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { EmitterSubscription as Subscription, PermissionStatus } from 'react-native';
import type { StepCountData as Data, Spec } from './NativeStepCounter';
import { eventName, NAME as NativeModuleName } from './NativeStepCounter';
import { PERMISSIONS, requestMultiple, RESULTS } from 'react-native-permissions';
/* A way to check if the module is linked. */
const LINKING_ERROR =
  "The package 'react-native-walking-tracker' doesn't seem to be linked. Make sure: \n\n" +
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

export const NAME = NativeModuleName;

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * @type {object} StepCountData - The Object that contains the step count data.
 * @property {string} counterType - The type of counter used to count the steps. (Android only)
 * @property {number} dailyGoal - The daily goal set by the user. default: 10000
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
type StepCountData = Data;

type ParsedStepCountData = {
  dailyGoal: string;
  steps: number;
  stepsString: string;
  calories: string;
  startDate: string;
  endDate: string;
  distance: string;
};

type PermissionExpiration = 'never' | number;

/**
 * @type {Object} `PermissionResponse` - The Object that contains the permission response.
 * @property {PermissionStatus} status - The status of the permission.
 * @property {PermissionExpiration} expires - The time when the permission expires.
 * @property {boolean} granted - A convenience boolean that indicates if the permission is granted.
 * @property {boolean} canAskAgain - Indicates if user can be asked again for specific permission.
 * If not, one should be directed to the Settings app in order to enable/disable the permission.
 * @example
 * ```ts
 * const { status, expires, granted } = await requestPermissions();
 * ```
 */
interface PermissionResponse {
  status: PermissionStatus;
  expires: PermissionExpiration;
  granted: boolean;
  canAskAgain: boolean;
}

// @ts-expect-error: global.__turboModuleProxy may not defined
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const StepCounterModule = isTurboModuleEnabled ? require('./NativeStepCounter').default : NativeModules.RNStepCounter;

/**
 * A module that allows you to get the step count data.
 * @module StepCounter
 * @example
 * ```ts
 * import { StepCounter } from 'react-native-step-counter';
 * ```
 * ---
 * ** iOS Only Properties **
 * @property {number} floorsAscended - The number of floors ascended during the time period.
 * @property {number} floorsDescended - The number of floors descended during the time period.
 * ---
 * ** Android Only Properties **
 * @property {string} counterType - The type of counter used to count the steps.
 * ---
 * @link see below for more information.
 * ### iOS
 * [CMStepCounter](https://developer.apple.com/documentation/coremotion/cmstepcounter) is deprecated since iOS 8.0.
 * so used this feature [CMPedometer](https://developer.apple.com/documentation/coremotion/cmpedometer) instead.
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

const StepCounterEventEmitter = new NativeEventEmitter(RNStepCounter);
type StepCountUpdateCallback = (result: StepCountData) => void;

/**
 * Transform the step count data into a more readable format.
 * you can use it or directly use the `StepCountData` type.
 * @param {StepCountData} data The step count data.
 * @returns {ParsedStepCountData} The parsed step count data.
 */
export function parseStepData(data: StepCountData): ParsedStepCountData {
  const { dailyGoal, steps, calories, startDate, endDate, distance } = data;
  const stepsString = steps + ' steps';
  const kCal = calories.toFixed(2) + 'kCal';
  const endDateTime = new Date(endDate).toLocaleTimeString('en-gb');
  const startDateTime = new Date(startDate).toLocaleTimeString('en-gb');
  const roundedDistance = Math.round(distance) + 'm';
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
 * permissions that are required for the step counter.
 * platform specific permissions are added to this array.
 */
const requiredPermissions = Platform.select({
  ios: [PERMISSIONS.IOS.MOTION],
  android: [
    PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
    PERMISSIONS.ANDROID.BODY_SENSORS,
    PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
  ],
  default: [],
});

/**
 * request the permissions that are required for the step counter.
 * @returns {Promise<PermissionResponse>} A promise that resolves to an object containing the permission status.
 */
export async function requestPermissions(): Promise<PermissionResponse> {
  return await requestMultiple(requiredPermissions)
    .then((permissions) => {
      const result = defaultResponse;
      Object.entries(permissions).forEach(([_, value]) => {
        console.debug(_, value);
        switch (value) {
          case RESULTS.UNAVAILABLE:
          case RESULTS.BLOCKED:
            result.granted = false;
            result.canAskAgain = false;
            result.status = 'never_ask_again';
            break;
          case RESULTS.DENIED:
          case RESULTS.LIMITED:
            result.granted = false;
            result.canAskAgain = true;
            result.status = 'denied';
            break;
          default:
            break;
        }
      });
      return result;
    })
    .catch((error) => {
      console.error('requestPermission', error);
      return defaultResponse;
    });
}

/**
 * A default response for the permission request.
 */
const defaultResponse: PermissionResponse = {
  granted: true,
  expires: 'never',
  canAskAgain: true,
  status: RESULTS.GRANTED,
};

/**
 * Returns whether the stepCounter is enabled on the device.
 * iOS 8.0+ only. Android is available since KitKat (4.4 / API 19).
 * @link https://developer.android.com/about/versions/android-4.4.html
 * @link https://developer.apple.com/documentation/coremotion/cmpedometer/1613963-isstepcountingavailable
 * @return `boolean`, indicating whether the stepCounter is available on this device.
 */
export function isStepCountingSupported(): boolean {
  return RNStepCounter.isStepCountingSupported();
}

/**
 * Subscribe to stepCounter updates.
 * @param start A date indicating the start of the range over which to measure steps.
 * @param callBack is provided with a single argument that is [StepCountData](StepCountData).
 * @return Returns a [Subscription](Subscription) that enables you to call.
 * when you would like to unsubscribe the listener, just use a method of subscriptions's `remove()`.
 *
 * @link see below for more information.
 * ### iOS
 * [startStepCountingUpdates](https://developer.apple.com/documentation/coremotion/cmstepcounter/1616151-startstepcountingupdates) is deprecated since iOS 8.0.
 * so used this feature [startUpdates](https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates) instead.
 *
 * > Only the past seven days worth of data is stored and available for you to retrieve. Specifying
 * > a start date that is more than seven days in the past returns only the available data.
 */
export function startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback): Subscription {
  if (!RNStepCounter.startStepCounterUpdate) {
    throw new UnavailabilityError(NativeModuleName, 'startStepCounterUpdate');
  }
  RNStepCounter.startStepCounterUpdate(start.getTime());
  return StepCounterEventEmitter.addListener(eventName, callBack);
}

/**
 * Stop the step counter updates.
 * @return Returns a promise that fulfills with a [StepCountData](StepCountData).
 * @link see below for more information.
 * ### iOS
 * [stopStepCountingUpdates](https://developer.apple.com/documentation/coremotion/cmstepcounter/1616157-stopstepcountingupdates) is deprecated since iOS 8.0.
 * so used this feature [stopUpdates](https://developer.apple.com/documentation/coremotion/cmpedometer/1613973-stopupdates) instead.
 */
export function stopStepCounterUpdate(): void {
  RNStepCounter.stopStepCounterUpdate();
}

export default RNStepCounter;
