import { TurboModuleRegistry } from 'react-native';

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

export const NAME = 'StepCounter';
export const VERSION = '0.2.3';
export const eventName = 'StepCounter.stepCounterUpdate';
/* Getting enforcing the module from the registry. */
export default TurboModuleRegistry.getEnforcing('StepCounter');
//# sourceMappingURL=NativeStepCounter.js.map