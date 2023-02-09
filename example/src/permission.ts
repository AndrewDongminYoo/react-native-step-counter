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
          console.log(
            'This feature is not available (on this device / in this context)'
          );
          return false;
        case RESULTS.DENIED:
          console.log(
            'The permission has not been requested / is denied but request-able'
          );
          return false;
        case RESULTS.LIMITED:
          console.log('The permission is limited: some actions are possible');
          return true;
        case RESULTS.GRANTED:
          console.log('The permission is granted');
          return true;
        case RESULTS.BLOCKED:
          console.log('The permission is denied and not request-able anymore');
          return false;
      }
    })
    .catch((error) => {
      console.error(error);
      openSettings().catch(() => console.warn('cannot open settings'));
      return false;
    });
};
