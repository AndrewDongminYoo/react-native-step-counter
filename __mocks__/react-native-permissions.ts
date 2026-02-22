export const RESULTS = {
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
  DENIED: "denied",
  GRANTED: "granted",
  LIMITED: "limited",
} as const;

export const PERMISSIONS = {
  ANDROID: {
    BODY_SENSORS_BACKGROUND: "android.permission.BODY_SENSORS_BACKGROUND",
    ACTIVITY_RECOGNITION: "android.permission.ACTIVITY_RECOGNITION",
  },
  IOS: {
    MOTION: "ios.permission.MOTION",
  },
};

export const check = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const request = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const openSettings = jest.fn().mockResolvedValue(undefined);
