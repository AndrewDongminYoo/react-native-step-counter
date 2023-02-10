import StepCounter from 'react-native-step-counter';

export const checkAvailable = async () => {
  const supported = StepCounter.isStepCountingSupported();
  if (supported) {
    console.log('Sensor TYPE_STEP_COUNTER is supported on this device');
    return true;
  } else {
    console.log('Sensor TYPE_STEP_COUNTER is not supported on this device');
    return false;
  }
};
