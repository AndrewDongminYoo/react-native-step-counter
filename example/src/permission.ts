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
        console.debug(
          '🚀 This feature is not available on this device',
          permission
        );
        return false;
      } else if (result === RESULTS.DENIED) {
        console.debug(
          '🚀 The permission is denied but request-able',
          permission
        );
        openSettings();
        return false;
      } else if (result === RESULTS.LIMITED) {
        console.debug(
          '🚀 The permission is limited: some actions are possible',
          permission
        );
        return true;
      } else if (result === RESULTS.GRANTED) {
        console.debug('🚀 The permission is granted', permission);
        return true;
      } else {
        console.debug(`🚀 The permission is ${result}`, permission);
        return false;
      }
    })
    .catch((error) => {
      console.debug('🚀 Get Error while getting permission', error);
      console.error(error);
      openSettings();
      return false;
    });
};
