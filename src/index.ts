import StepCounter, { LINKING_ERROR } from './NativeStepCounter';

if (StepCounter === null) {
  throw new Error(LINKING_ERROR);
}

export default StepCounter;
