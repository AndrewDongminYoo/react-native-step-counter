import StepCounter, { LINKING_ERROR } from './NativeStepCounter';

/* Checking if the native module is available. */
if (StepCounter === null) {
  throw new Error(LINKING_ERROR);
}

export default StepCounter;
