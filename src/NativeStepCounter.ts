/* A way to import the module. */
import { Platform, TurboModule, TurboModuleRegistry } from 'react-native';

/* A way to check if the module is linked. */
export const LINKING_ERROR =
  `The package 'react-native-walking-tracker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({
    ios: '- You have run `pod install` in the `ios` directory and then clean, rebuild and re-run the app. You may also need to re-open Xcode to get the new pods.\n',
    android:
      '- You have the Android development environment set up: `https://reactnative.dev/docs/environment-setup.`',
    default: '',
  }) +
  `- Use the "npx react-native clean" command to clean up the module's cache and select the "watchman", "yarn", "metro", "android", "npm" options with comma-separated. Re-Install packages and re-build the app again .` +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n' +
  'If none of these fix the issue, please open an issue on the Github repository: https://github.com/AndrewDongminYoo/react-native-step-counter`';

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * @type {Object} StepCountData - The Object that contains the step count data.
 * @property {number} distance - The distance in meters that the user has walked or run.
 * @property {number} steps - The number of steps taken during the time period.
 * @property {number} startDate - The start date of the data.
 * @property {number} endDate - The end date of the data.
 */
export type StepCountData = {
  distance?: number;
  steps: number;
  startDate?: number; // new Date()
  endDate?: number;
};

/* Defining the interface of the module. */
export interface Spec extends TurboModule {
  isStepCountingSupported(): boolean;
  startStepCounterUpdate(from: number): boolean;
  stopStepCounterUpdate(): void;

  /* Required Methods for NativeEventEmitter */
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/* Getting enforcing the module from the registry. */
const StepCounterModule =
  TurboModuleRegistry.getEnforcing<Spec>('RNStepCounter');

export default StepCounterModule;
