import {
  check,
  openSettings,
  type PermissionStatus,
  PERMISSIONS,
  request,
  RESULTS,
  type RationaleObject,
} from "react-native-permissions";
import { Platform } from "react-native";
import appInformation from "../package.json";

/**
 * Checks if the user has granted the body sensors permission
 * If the user has not granted the permission, it will request the permission
 * If the user has granted the permission, it will continue to the next step
 */
const bodySensor = PERMISSIONS.ANDROID.BODY_SENSORS_BACKGROUND;
const activityRecognition = PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION;
const motion = PERMISSIONS.IOS.MOTION;
type Permission = typeof bodySensor | typeof activityRecognition | typeof motion;

/**
 * @description This function checks the result and returns true if the permission is granted
 * It is used to check the result of the permission request
 * @param {PermissionStatus} result - Permission Request's Result.
 * @returns {boolean} - Returns if the permission is granted.
 */
const CHECK = <S = PermissionStatus>(result: S) => result === RESULTS.GRANTED;

/**
 * This is the name of the permission. It is used for the user interface
 * and must be a human readable string.
 */
const permissionNames: Record<Permission, string> = {
  [activityRecognition]: "Activity Recognition",
  [bodySensor]: "Body Sensor",
  [motion]: "Motion",
};

/**
 * @param {Permission} permission - The permission to get the rationale for.
 * @returns {RationaleObject} - Returns the rationale for the given permission.
 */
const getRational = (permission: Permission): RationaleObject => {
  const data = permissionNames[permission];
  const appName = appInformation.name;
  return {
    title: `"${data}" Permission`,
    message: `"${appName}" needs access to your ${data.toLowerCase()} data.`,
    buttonPositive: "ACCEPT",
    buttonNegative: "DENY",
  };
};

/**
 * @description This function requests permission to access the user's location.
 * If the user has already granted permission, it returns true.
 * If the user has not granted permission, it prompts the user to grant permission.
 * It uses the following parameters:
 * @param {Permission} permission - The permission to request.
 * @returns {boolean} - It returns a boolean value.
 */
const requestPermission = async (permission: Permission) => {
  const rationale = getRational(permission);
  return request(permission, rationale).then(CHECK);
};

/**
 * @description This code checks for the permission passed in as an argument
 * and returns a boolean that indicates whether or not the permission
 * is granted.
 * @param {Permission} permission - The Permission to check.
 * @returns {Promise<boolean>} - Boolean value whether permission is granted or not.
 */
const checkPermission = async (permission: Permission) => {
  return check(permission).then(CHECK);
};

/**
 * @description If permission has not been granted, the user is prompted to grant permission
 * If the user has denied permission, the user is redirected to the app's settings page
 * After that, check the permissions status and return.
 * @returns {Promise<boolean>} - A boolean indicating whether the user has granted permission to access the device's step counter.
 */
export const getStepCounterPermission = async () => {
  const permission = Platform.OS === "ios" ? motion : activityRecognition;
  if (await requestPermission(permission)) {
    return true;
  }
  openSettings();
  return checkPermission(permission);
};

/**
 * @description This function ask a permission for the app to access the device's body sensor data.
 * @returns {Promise<boolean>} - Returns true if the user has granted permission for the body sensor data. Otherwise false.
 */
export async function getBodySensorPermission() {
  await openSettings();
  return checkPermission(bodySensor);
}
