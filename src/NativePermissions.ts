import StepCounterModule from './NativeStepCounter';

async function openSettings(): Promise<void> {
  await StepCounterModule.openSettings();
}

async function requestPermission(
  permission: Permission
): Promise<PermissionStatus> {
  return StepCounterModule.requestPermission(permission);
}

async function checkMultiple<P extends Permission[]>(
  permissions: P
): Promise<Record<P[number], PermissionStatus>> {
  type Output = Record<P[number], PermissionStatus>;
  const output: Partial<Output> = {};
  const deDupe = uniq(permissions);
  await Promise.all(
    deDupe.map(async (permission: P[number]) => {
      output[permission] = await checkPermission(permission);
    })
  );
  return output as Output;
}

async function requestMultiple<P extends Permission[]>(
  permissions: P
): Promise<Record<P[number], PermissionStatus>> {
  type Output = Record<P[number], PermissionStatus>;

  const output: Partial<Output> = {};
  const deDupe = uniq(permissions);

  for (let index = 0; index < deDupe.length; index++) {
    const permission: P[number] = deDupe[index] as Permission;
    output[permission] = await requestPermission(permission);
  }
  return output as Output;
}

async function checkPermission(
  permission: Permission
): Promise<PermissionStatus> {
  return StepCounterModule.checkPermission(permission);
}

const ANDROID = Object.freeze({
  ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION',
  BODY_SENSORS: 'android.permission.BODY_SENSORS',
  BODY_SENSORS_BACKGROUND: 'android.permission.BODY_SENSORS_BACKGROUND',
} as const);

const IOS = Object.freeze({
  LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
  rLOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
  rMOTION: 'ios.permission.MOTION',
} as const);

type IOSPermissionMap = typeof IOS;
type AndroidPermissionMap = typeof ANDROID;

const PERMISSIONS = Object.freeze({
  ANDROID,
  IOS,
} as const);
type Values<T extends object> = T[keyof T];
type AndroidPermission = Values<AndroidPermissionMap>;
type IOSPermission = Values<IOSPermissionMap>;
export type Permission = AndroidPermission | IOSPermission;
export type PermissionStatus = Values<ResultMap>;

const RESULTS = Object.freeze({
  UNAVAILABLE: 'unavailable',
  BLOCKED: 'blocked',
  DENIED: 'denied',
  GRANTED: 'granted',
  LIMITED: 'limited',
} as const);

type ResultMap = typeof RESULTS;

function uniq<T>(array: T[]): T[] {
  return array.filter(
    (item, index) => item != null && array.indexOf(item) === index
  );
}

export default {
  PERMISSIONS,
  RESULTS,

  checkPermission,
  checkMultiple,
  openSettings,
  requestPermission,
  requestMultiple,
};
