import {
  check,
  openSettings,
  Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from 'react-native-permissions';

export const askFor = async () => {
  await requestMultiple([
    PERMISSIONS.ANDROID.BODY_SENSORS,
    PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND,
    PERMISSIONS.IOS.MOTION,
  ]);
};

export const checkPermission = async (permission: Permission) => {
  return check(permission)
    .then((result) => {
      switch (result) {
        case RESULTS.UNAVAILABLE:
          console.debug(
            '🚀 This feature is not available (on this device / in this context)',
            permission
          );
          return false;
        case RESULTS.DENIED:
          console.debug(
            '🚀 The permission has not been requested / is denied but request-able',
            permission
          );
          return false;
        case RESULTS.LIMITED:
          console.debug(
            '🚀 The permission is limited: some actions are possible',
            permission
          );
          return true;
        case RESULTS.GRANTED:
          console.debug('🚀 The permission is granted', permission);
          return true;
        case RESULTS.BLOCKED:
          return false;
      }
    })
    .catch((error) => {
      console.error(error);
      openSettings().catch(() => console.warn('cannot open settings'));
      return false;
    });
};
