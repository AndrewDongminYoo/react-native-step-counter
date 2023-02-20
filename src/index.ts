import { NativeModules, Platform } from 'react-native';
import type { StepCountData as Data } from './NativeStepCounter';

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
export type StepCountData = Data;

// @ts-expect-error: global.__turboModuleProxy may not defined
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const StepCounterModule = isTurboModuleEnabled ? require('./NativeStepCounter').default : NativeModules.RNStepCounter;

const RNStepCounter = StepCounterModule
  ? StepCounterModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

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
