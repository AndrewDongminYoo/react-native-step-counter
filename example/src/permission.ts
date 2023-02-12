import {
  check,
  openSettings,
  Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from 'react-native-permissions';

export const requestRequiredPermissions = async () => {
  await requestMultiple([
    PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
    PERMISSIONS.ANDROID.BODY_SENSORS,
    PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
    PERMISSIONS.IOS.MOTION,
  ]);
};

export const checkPermission = async (permission: Permission) => {
  return check(permission)
    .then((result) => {
      if (result === RESULTS.UNAVAILABLE) {
        console.debug(`🚀 ${permission} is not available on this device`);
        return false;
      } else if (result === RESULTS.DENIED) {
        console.debug(`🚀 ${permission} is denied but request-able`);
        openSettings();
        return false;
      } else if (result === RESULTS.LIMITED) {
        console.debug(`🚀 ${permission} is limited: some actions are possible`);
        return true;
      } else if (result === RESULTS.GRANTED) {
        console.debug(`🚀 ${permission} is granted`);
        return true;
      } else {
        console.debug(`🚀 ${permission} is ${result}`);
        return false;
      }
    })
    .catch((error) => {
      console.debug(`🚀 Get ${error} while getting ${permission}`);
      openSettings();
      return false;
    });
};
