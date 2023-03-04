import {
  check,
  openSettings,
  type Permission,
  type PermissionStatus,
  PERMISSIONS,
  request,
  RESULTS,
} from 'react-native-permissions';
import { Platform, type Rationale } from 'react-native';
import appInformation from '../package.json';

const bodySensor = PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND;
const activityRecognition = PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION;
const motion = PERMISSIONS.IOS.MOTION;

const CHECK = <S = PermissionStatus>(result: S) => result === RESULTS.GRANTED;

const getRational = (permission: Permission): Rationale => {
  let data = '';
  if (permission === activityRecognition) {
    data = 'Step Counter';
  } else if (permission === bodySensor) {
    data = 'Accelerometer';
  } else if (permission === motion) {
    data = 'Core Motion Pedometer';
  }
  const appName = appInformation.name;
  return {
    title: `"${data}" Permission`,
    message: `"${appName}" needs access to your ${data.toLowerCase()} data.`,
    buttonPositive: 'ACCEPT',
    buttonNegative: 'DENY',
  };
};

const requestPermission = async (permission: Permission) => {
  const rationale = getRational(permission);
  return request(permission, rationale).then(CHECK);
};

const checkPermission = async (permission: Permission) => {
  return check(permission).then(CHECK);
};

export const getStepCounterPermission = async () => {
  const permission: Permission = Platform.OS === 'ios' ? motion : activityRecognition;
  if (await requestPermission(permission)) {
    return true;
  }
  openSettings();
  return checkPermission(permission);
};

export const getBodySensorPermission = async () => {
  await openSettings();
  return checkPermission(bodySensor);
};
