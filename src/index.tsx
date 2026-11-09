import type { EventSubscription } from "react-native";
import StepCounterModule, {
  eventName,
  NAME,
  VERSION,
  type CounterType,
  type Spec,
  type StepCountData,
} from "./NativeStepCounter";
import { NativeEventEmitter, Platform } from "react-native";

/* A way to check if the module is linked. */
const LINKING_ERROR =
  "The package 'react-native-step-counter-newarch' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({
    ios: "- You have run `pod install` in the `ios` directory and then clean, rebuild and re-run the app. You may also need to re-open Xcode to get the new pods.\n",
    android:
      "- You have the Android development environment set up: `https://reactnative.dev/docs/environment-setup.`",
    default: "",
  }) +
  '- Use the "npx react-native clean" command to clean up the module\'s cache and select the ' +
  '"watchman", "yarn", "metro", "android", "npm" options with comma-separated. ' +
  "Re-Install packages and re-build the app again ." +
  "- You rebuilt the app after installing the package\n" +
  "- You are not using Expo Go\n" +
  "If none of these fix the issue, please open an issue on the Github repository: " +
  "https://github.com/AndrewDongminYoo/react-native-step-counter`";

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
 * import { StepCounter } from 'react-native-step-counter-newarch';
 */
const StepCounter = (
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

const StepEventEmitter = new NativeEventEmitter(StepCounter);
type StepCountUpdateCallback = (data: StepCountData) => void;
export type StepCountFilter = (data: StepCountData) => StepCountData | null;

export interface StepCountFilterOptions {
  /**
   * Minimum elapsed measurement time expected per accepted step over the session.
   *
   * Cumulative totals that exceed this session cadence are treated as false positives.
   * Short intervals between reports alone do not demonstrate false steps.
   * 250ms allows up to 4 steps/second, which is already faster than typical walking.
   */
  minimumStepIntervalMs?: number;
}

const DEFAULT_MINIMUM_STEP_INTERVAL_MS = 250;

// Tracks the subscription created by the most recent startStepCounterUpdate call.
// Only this subscription is removed in stopStepCounterUpdate, so that external
// subscribers (e.g. debug log components) are not unintentionally removed.
let _activeSubscription: EventSubscription | null = null;

/**
 * Transform the step count data into a more readable format.
 * You can use it or directly use the `StepCountData` type.
 * @param {StepCountData} data - Step Counter Sensor Event Data.
 * @returns {ParsedStepCountData} - String Parsed Count Data.
 */
export function parseStepData(data: StepCountData): ParsedStepCountData {
  const { steps, startDate, endDate, distance } = data;
  const dailyGoal = 10000;
  const stepsString = steps + " steps";
  const kCal = (steps * 0.045).toFixed(2) + "kCal";
  const endDateTime = new Date(endDate).toLocaleTimeString("en-gb");
  const startDateTime = new Date(startDate).toLocaleTimeString("en-gb");
  const roundedDistance = distance.toFixed(1) + "m";
  const stepGoalStatus = steps >= dailyGoal ? "Goal Reached" : `${steps}/${dailyGoal} steps`;
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
 * Create a stateful filter for live step-count updates.
 *
 * Native pedometer APIs can already include device/OS false positives, and the
 * Android accelerometer fallback can also react to quick hand rotation. This
 * helper rejects totals that exceed the session's measurement-time cadence budget
 * and rebases later values so demonstrated impossible steps do not come back.
 * It cannot detect false steps hidden by idle time earlier in the session.
 * A newer startDate or backend change resets adjustments; stale events are ignored.
 * Create a fresh filter when restarting with the same startDate and backend.
 */
export function createStepCountFilter(options: StepCountFilterOptions = {}): StepCountFilter {
  const minimumStepIntervalMs =
    Number.isFinite(options.minimumStepIntervalMs) &&
    options.minimumStepIntervalMs !== undefined &&
    options.minimumStepIntervalMs > 0
      ? options.minimumStepIntervalMs
      : DEFAULT_MINIMUM_STEP_INTERVAL_MS;

  let previousRawData: StepCountData | null = null;
  let ignoredSteps = 0;
  let ignoredDistance = 0;
  const retiredBackends = new Set<CounterType>();

  return (data: StepCountData) => {
    // iOS serializes an unavailable distance as NSNull. Preserve step updates
    // and hold the last distance only within the same session/backend.
    if (data.distance === null && data.counterType === "CMPedometer") {
      data = {
        ...data,
        distance:
          previousRawData &&
          data.startDate === previousRawData.startDate &&
          data.counterType === previousRawData.counterType
            ? previousRawData.distance
            : 0,
      };
    }
    if (
      !Number.isSafeInteger(data.steps) ||
      data.steps < 0 ||
      !Number.isFinite(data.startDate) ||
      !Number.isFinite(data.endDate) ||
      !Number.isFinite(data.endDate - data.startDate) ||
      data.endDate < data.startDate ||
      !Number.isFinite(data.distance) ||
      data.distance < 0
    ) {
      return null;
    }

    if (previousRawData) {
      if (data.startDate < previousRawData.startDate) {
        return null;
      }
      if (data.startDate > previousRawData.startDate) {
        previousRawData = null;
        ignoredSteps = 0;
        ignoredDistance = 0;
        retiredBackends.clear();
      } else {
        if (data.endDate <= previousRawData.endDate) {
          return null;
        }
        if (data.counterType !== previousRawData.counterType) {
          if (retiredBackends.has(data.counterType)) {
            return null;
          }
          retiredBackends.add(previousRawData.counterType);
          previousRawData = null;
          ignoredSteps = 0;
          ignoredDistance = 0;
        } else if (data.steps < previousRawData.steps || data.distance < previousRawData.distance) {
          // A decrease alone cannot distinguish a reset from a stale report.
          return null;
        }
      }
    }

    const stepDelta = previousRawData ? data.steps - previousRawData.steps : data.steps;
    const distanceDelta = previousRawData
      ? data.distance - previousRawData.distance
      : data.distance;
    const elapsedMs = data.endDate - data.startDate;
    // Cumulative reports may arrive close together even when their steps were
    // measured over a longer window. Only the session total proves an excess.
    const isSuspiciousBurst =
      stepDelta > 0 && data.steps - ignoredSteps > elapsedMs / minimumStepIntervalMs;

    previousRawData = { ...data };

    if (isSuspiciousBurst) {
      ignoredSteps += stepDelta;
      if (distanceDelta > 0) {
        ignoredDistance += distanceDelta;
      }
      return null;
    }

    if (ignoredSteps === 0 && ignoredDistance === 0) {
      return data;
    }

    return {
      ...data,
      steps: Math.max(0, data.steps - ignoredSteps),
      distance: Math.max(0, data.distance - ignoredDistance),
    };
  };
}

/**
 * If you're using a method or property that's not available on the current platform, throw this error.
 * @param {string} moduleName The name of the module.
 * @param {string} propertyName The name of the property.
 * @returns {Error} The error.
 * @example
 *  if (!StepCounter.startStepCounterUpdate) {
 *     throw new UnavailabilityError(NativeModuleName, eventName);
 *  }
 */
class UnavailabilityError extends Error {
  code: string;
  constructor(moduleName: string, propertyName: string) {
    super(
      `The method or property ${moduleName}.${propertyName} is not available on ${Platform.OS}, ` +
        "are you sure you've linked all the native dependencies properly?"
    );
    this.code = "ERR_UNAVAILABLE";
  }
}

/**
 * Returns whether the stepCounter is enabled on the device.
 * iOS 8.0+ only. Android is available since KitKat (4.4 / API 19).
 * @see https://developer.android.com/about/versions/android-4.4.html
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613963-isstepcountingavailable
 * @returns {Promise<{ supported: boolean, granted: boolean }>} A promise that resolves with an object containing the stepCounter availability.
 * supported - Whether a counting sensor is present, including the Android accelerometer fallback.
 * granted - Whether permission is allowed, independently of sensor availability.
 * Android requires activity recognition for both backends on API 29+ under the package consent policy.
 * API 24–28 requires no activity runtime permission, so `granted` is true.
 * Check capabilities again after requesting permission; support does not guarantee registration.
 */
export function isStepCountingSupported(): Promise<{ supported: boolean; granted: boolean }> {
  return StepCounter.isStepCountingSupported();
}

/**
 * Start to subscribe stepCounter updates.
 * Only the past seven days worth of data is stored and available for you to retrieve.
 * Specifying a start date that is more than seven days in the past returns only the available data.
 * If native start throws synchronously, the new listener is removed and the error is rethrown.
 * ### iOS
 * `CMStepCounter.startStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.startUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates
 * @see https://developer.apple.com/documentation/coremotion/cmstepcounter/1616151-startstepcountingupdates
 * @param {Date} start A date indicating the start of the range over which to measure steps.
 * @param {StepCountUpdateCallback} callBack - This callback function makes it easy for app developers to receive sensor events.
 * @throws {RangeError} If start is an invalid Date, before replacing the current subscription.
 * @returns {EventSubscription} - Returns a Subscription that enables you to call.
 * When you would like to unsubscribe the listener, just use a method of subscriptions's `remove()`.
 * @example
 * const startDate = new Date();
 * subscriptionRef.current = startStepCounterUpdate(startDate, (response) => {
 *    const data = parseStepCountData(response);
 * })
 */
export function startStepCounterUpdate(
  start: Date,
  callBack: StepCountUpdateCallback
): EventSubscription {
  if (!StepCounter.startStepCounterUpdate) {
    throw new UnavailabilityError(NAME, eventName);
  }
  const from = start.getTime();
  if (!Number.isFinite(from)) {
    throw new RangeError("start must be a valid Date");
  }
  // Clean up any previous subscription registered by this library before creating a new one.
  _activeSubscription?.remove();
  _activeSubscription = null;
  const subscription = StepEventEmitter.addListener(eventName, (data) =>
    callBack(data as StepCountData)
  );
  _activeSubscription = subscription;
  try {
    StepCounter.startStepCounterUpdate(from);
  } catch (error) {
    subscription.remove();
    if (_activeSubscription === subscription) {
      _activeSubscription = null;
    }
    throw error;
  }
  return subscription;
}

/**
 * Stop the step counter updates.
 * ### iOS
 * `CMStepCounter.stopStepCountingUpdates` is deprecated since iOS 8.0. so used `CMPedometer.stopUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613973-stopupdates
 * @see https://developer.apple.com/documentation/coremotion/cmstepcounter/1616157-stopstepcountingupdates
 */
export function stopStepCounterUpdate(): void {
  // Remove only the subscription registered by this library, not all listeners.
  // Calling removeAllListeners would break external subscribers such as debug log components.
  _activeSubscription?.remove();
  _activeSubscription = null;
  StepCounter.stopStepCounterUpdate();
}

export { NAME, VERSION, type CounterType, type StepCountData };
