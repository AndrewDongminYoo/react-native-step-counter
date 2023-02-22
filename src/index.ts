import { NativeModules, Platform } from 'react-native';
import type { StepCountData as Data, Spec } from './NativeStepCounter';

/* A way to check if the module is linked. */
export const LINKING_ERROR =
  "The package 'react-native-walking-tracker' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({
    ios: '- You have run `pod install` in the `ios` directory and then clean, rebuild and re-run the app. You may also need to re-open Xcode to get the new pods.\n',
    android: '- You have the Android development environment set up: `https://reactnative.dev/docs/environment-setup.`',
    default: '',
  }) +
  '- Use the "npx react-native clean" command to clean up the module\'s cache and select the "watchman", "yarn", "metro", "android", "npm" options with comma-separated. Re-Install packages and re-build the app again .' +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n' +
  'If none of these fix the issue, please open an issue on the Github repository: https://github.com/AndrewDongminYoo/react-native-step-counter`';

export const NAME = 'RNStepCounter';

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
export type StepCountData = Data;

// @ts-expect-error: global.__turboModuleProxy may not defined
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const StepCounterModule = isTurboModuleEnabled ? require('./NativeStepCounter').default : NativeModules.RNStepCounter;

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

export function parseStepData(data: StepCountData) {
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

export function isStepCountingSupported(): boolean {
  return RNStepCounter.isStepCountingSupported();
}

export function startStepCounterUpdate(from: number): boolean {
  return RNStepCounter.startStepCounterUpdate(from);
}

export function stopStepCounterUpdate(): void {
  RNStepCounter.stopStepCounterUpdate();
}

export default RNStepCounter;
