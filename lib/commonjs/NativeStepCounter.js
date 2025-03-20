"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventName = exports.default = exports.VERSION = exports.NAME = void 0;
var _reactNative = require("react-native");
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

const NAME = exports.NAME = 'StepCounter';
const VERSION = exports.VERSION = '0.2.3';
const eventName = exports.eventName = 'StepCounter.stepCounterUpdate';
/* Getting enforcing the module from the registry. */
var _default = exports.default = _reactNative.TurboModuleRegistry.getEnforcing('StepCounter');
//# sourceMappingURL=NativeStepCounter.js.map