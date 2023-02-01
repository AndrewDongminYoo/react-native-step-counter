export type IDate = Date | number;
export const RESULTS = Object.freeze({
  UNAVAILABLE: 'unavailable',
  BLOCKED: 'blocked', // never_ask_again in Android
  DENIED: 'denied',
  GRANTED: 'granted',
  LIMITED: 'limited',
} as const);
type Values<T extends object> = T[keyof T];
export type PermissionStatus = Values<typeof RESULTS>;
