import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
  type RationaleObject,
} from "react-native-permissions";
import { AppState, Platform } from "react-native";
import appInformation from "../package.json";

const activityRecognition = PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION;
const motion = PERMISSIONS.IOS.MOTION;
type Permission = typeof activityRecognition | typeof motion;

const permissionNames: Record<Permission, string> = {
  [activityRecognition]: "Activity Recognition",
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

/** Request motion access; only blocked access requires a Settings round trip. */
export const getStepCounterPermission = async (signal?: AbortSignal): Promise<boolean> => {
  if (signal?.aborted) return false;
  const permission = Platform.OS === "ios" ? motion : activityRecognition;
  const result = await request(permission, getRational(permission));
  if (signal?.aborted) return false;
  if (result === RESULTS.GRANTED) return true;
  if (result !== RESULTS.BLOCKED) return false;

  return new Promise<boolean>((resolve, reject) => {
    let leftApp = AppState.currentState !== "active";
    let settled = false;
    const cleanup = () => {
      subscription.remove();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        leftApp = true;
      } else if (leftApp && !settled) {
        settled = true;
        cleanup();
        check(permission).then(
          (status) => resolve(!signal?.aborted && status === RESULTS.GRANTED),
          reject
        );
      }
    });
    signal?.addEventListener("abort", cancel);
    // Register before opening Settings so a fast round trip cannot be missed.
    openSettings().catch((error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
  });
};
