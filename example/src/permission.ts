import { check, openSettings, type PermissionStatus, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { Platform, type Rationale } from 'react-native';
import appInformation from '../package.json';

const bodySensor = PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND;
const activityRecognition = PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION;
const motion = PERMISSIONS.IOS.MOTION;
type Permission = typeof bodySensor | typeof activityRecognition | typeof motion;

const CHECK = <S = PermissionStatus>(result: S) => result === RESULTS.GRANTED;

const permissionNames: Record<Permission, string> = {
  [activityRecognition]: 'Activity Recognition',
  [bodySensor]: 'Body Sensor',
  [motion]: 'Motion',
};

const getRational = (permission: Permission): Rationale => {
  const data = permissionNames[permission];
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
  const permission = Platform.OS === 'ios' ? motion : activityRecognition;
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
