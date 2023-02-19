/* A way to import the module. */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * `StepCountData` is an object with four properties: `distance`, `steps`, `startDate`, and `endDate`.
 * @type {object} StepCountData - The Object that contains the step count data.
 * @property {number} distance - The distance in meters that the user has walked or run.
 * @property {number} steps - The number of steps taken during the time period.
 * @property {number} startDate - The start date of the data.
 * @property {number} endDate - The end date of the data.
 * ---
 * ** iOS Only Properties **
 * @property {number} floorsAscended - The number of floors ascended during the time period.
 * @property {number} floorsDescended - The number of floors descended during the time period.
 */
export type StepCountData = {
  distance?: number;
  steps: number;
  startDate?: number; // new Date()
  endDate?: number;
  floorsAscended?: number;
  floorsDescended?: number;
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
export default TurboModuleRegistry.getEnforcing<Spec>('StepCounter');
