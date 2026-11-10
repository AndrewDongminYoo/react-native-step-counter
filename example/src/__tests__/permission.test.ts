import { AppState, Platform, type AppStateStatus } from "react-native";
import { check, openSettings, PERMISSIONS, request, RESULTS } from "react-native-permissions";
import { getStepCounterPermission } from "../permission";

jest.mock("react-native", () => ({
  ...jest.requireActual("react-native"),
  AppState: { currentState: "active", addEventListener: jest.fn() },
}));

let change: (state: AppStateStatus) => void;
let remove: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    change = listener;
    return { remove };
  });

  jest.mocked(check).mockResolvedValue(RESULTS.GRANTED);
  jest.mocked(openSettings).mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

it.each([RESULTS.DENIED, RESULTS.UNAVAILABLE, RESULTS.LIMITED])(
  "does not open Settings for %s",
  async (result) => {
    jest.mocked(request).mockResolvedValue(result);
    expect(await getStepCounterPermission()).toBe(false);
    expect(openSettings).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
  }
);

it.each(["android", "ios"])("waits for Settings return on %s", async (os) => {
  jest.replaceProperty(Platform, "OS", os as typeof Platform.OS);
  jest.mocked(request).mockResolvedValue(RESULTS.BLOCKED);
  if (os === "ios") jest.mocked(check).mockResolvedValueOnce(RESULTS.BLOCKED);
  const pending = getStepCounterPermission();
  await Promise.resolve();
  await Promise.resolve();
  expect(openSettings).toHaveBeenCalledTimes(1);
  expect(check).toHaveBeenCalledTimes(os === "ios" ? 1 : 0);
  change("active");
  expect(check).toHaveBeenCalledTimes(os === "ios" ? 1 : 0);
  change("background");
  change("active");
  expect(await pending).toBe(true);
  expect(check).toHaveBeenCalledWith(
    os === "ios" ? PERMISSIONS.IOS.MOTION : PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION
  );
  expect(remove).toHaveBeenCalledTimes(1);
});

it("stays denied after returning without a grant", async () => {
  jest.mocked(request).mockResolvedValue(RESULTS.BLOCKED);
  jest.mocked(check).mockResolvedValue(RESULTS.DENIED);
  const pending = getStepCounterPermission();
  await Promise.resolve();
  change("inactive");
  change("active");
  expect(await pending).toBe(false);
});

it("removes its Settings listener on cancellation", async () => {
  jest.mocked(request).mockResolvedValue(RESULTS.BLOCKED);
  const operation = new AbortController();
  const pending = getStepCounterPermission(operation.signal);
  await Promise.resolve();
  operation.abort();
  expect(await pending).toBe(false);
  expect(remove).toHaveBeenCalledTimes(1);
  change("background");
  expect(check).not.toHaveBeenCalled();
  change("active");
  expect(check).not.toHaveBeenCalled();
});

it("does not open Settings after a cancelled permission request", async () => {
  const operation = new AbortController();
  jest.mocked(request).mockImplementationOnce(async () => {
    operation.abort();
    return RESULTS.BLOCKED;
  });
  expect(await getStepCounterPermission(operation.signal)).toBe(false);
  expect(openSettings).not.toHaveBeenCalled();
});

it("cleans up when Settings fails to open", async () => {
  jest.mocked(request).mockResolvedValue(RESULTS.BLOCKED);
  jest.mocked(openSettings).mockRejectedValueOnce(new Error("settings failed"));
  await expect(getStepCounterPermission()).rejects.toThrow("settings failed");
  expect(remove).toHaveBeenCalledTimes(1);
});

it("resolves false when cancelled during the post-Settings check", async () => {
  jest.mocked(request).mockResolvedValue(RESULTS.BLOCKED);
  let grant!: (status: typeof RESULTS.GRANTED) => void;
  jest.mocked(check).mockReturnValueOnce(
    new Promise((resolve) => {
      grant = resolve;
    })
  );
  const operation = new AbortController();
  const pending = getStepCounterPermission(operation.signal);
  await Promise.resolve();
  change("background");
  change("active");
  operation.abort();
  grant(RESULTS.GRANTED);
  expect(await pending).toBe(false);
  expect(remove).toHaveBeenCalledTimes(1);
});

it("keeps the first iOS denial in the app even when request returns blocked", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  jest.mocked(check).mockResolvedValueOnce(RESULTS.DENIED);
  jest.mocked(request).mockResolvedValueOnce(RESULTS.BLOCKED);
  const pending = getStepCounterPermission();
  await Promise.resolve();
  await Promise.resolve();
  expect(openSettings).not.toHaveBeenCalled();
  expect(await pending).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
});

it("does not request iOS access after cancellation during the precheck", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const operation = new AbortController();
  jest.mocked(check).mockImplementationOnce(async () => {
    operation.abort();
    return RESULTS.DENIED;
  });
  expect(await getStepCounterPermission(operation.signal)).toBe(false);
  expect(request).not.toHaveBeenCalled();
  expect(openSettings).not.toHaveBeenCalled();
});
