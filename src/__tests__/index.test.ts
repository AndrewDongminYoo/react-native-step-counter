import TurboModuleRegistry from "react-native/Libraries/TurboModule/TurboModuleRegistry";

// Static imports work for pure functions — the native module is not invoked at call time.
import { parseStepData, NAME, VERSION, type StepCountData } from "../index";
import { eventName } from "../NativeStepCounter";

// ─── helpers ────────────────────────────────────────────────────────────────

type NativeMock = {
  isStepCountingSupported: jest.Mock;
  startStepCounterUpdate: jest.Mock | undefined;
  stopStepCounterUpdate: jest.Mock;
  addListener: jest.Mock;
  removeListeners: jest.Mock;
};

/** Build a complete native module mock with sensible defaults. */
function makeNativeMock(overrides: Partial<NativeMock> = {}): NativeMock {
  return {
    isStepCountingSupported: jest.fn().mockResolvedValue({ supported: true, granted: true }),
    startStepCounterUpdate: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    ...overrides,
  };
}

/**
 * Load a fresh copy of src/index via jest.isolateModules so that
 * TurboModuleRegistry.getEnforcing returns `nativeMock` when the module
 * initialises its StepCounter reference.
 */
function loadModule(nativeMock: NativeMock): typeof import("../index") {
  let mod: typeof import("../index") | undefined;
  jest.isolateModules(() => {
    (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue(nativeMock);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("../index") as typeof import("../index");
  });
  if (!mod) throw new Error("isolateModules did not load the module");
  return mod;
}

// ─── constants ───────────────────────────────────────────────────────────────

describe("exported constants", () => {
  it('NAME is "StepCounter"', () => {
    expect(NAME).toBe("StepCounter");
  });

  it('VERSION is "0.3.0"', () => {
    expect(VERSION).toBe("0.3.0");
  });

  it('eventName is "StepCounter.stepCounterUpdate"', () => {
    expect(eventName).toBe("StepCounter.stepCounterUpdate");
  });
});

// ─── parseStepData ───────────────────────────────────────────────────────────

describe("parseStepData", () => {
  // 1700000000000 ms = 2023-11-14T22:13:20.000Z
  // 1700003600000 ms = 2023-11-14T23:13:20.000Z  (process.env.TZ = "UTC" in jest.config.js)
  const base: StepCountData = {
    counterType: "STEP_COUNTER",
    steps: 5000,
    startDate: 1700000000000,
    endDate: 1700003600000,
    distance: 3750.5,
  };

  it("exposes raw step count and stepsString", () => {
    const result = parseStepData(base);
    expect(result.steps).toBe(5000);
    expect(result.stepsString).toBe("5000 steps");
  });

  it("calculates calories as steps × 0.045 kCal", () => {
    expect(parseStepData(base).calories).toBe("225.00kCal");
  });

  it("formats distance with one decimal place", () => {
    expect(parseStepData(base).distance).toBe("3750.5m");
    expect(parseStepData({ ...base, distance: 1234 }).distance).toBe("1234.0m");
  });

  it('shows "Goal Reached" when steps >= 10 000', () => {
    expect(parseStepData({ ...base, steps: 10000 }).dailyGoal).toBe("Goal Reached");
    expect(parseStepData({ ...base, steps: 15000 }).dailyGoal).toBe("Goal Reached");
  });

  it("shows X/10000 progress when steps < 10 000", () => {
    expect(parseStepData(base).dailyGoal).toBe("5000/10000 steps");
  });

  it("formats timestamps as HH:MM:SS strings (en-gb locale, UTC)", () => {
    const result = parseStepData(base);
    expect(result.startDate).toBe("22:13:20");
    expect(result.endDate).toBe("23:13:20");
  });
});

// ─── isStepCountingSupported ─────────────────────────────────────────────────

describe("isStepCountingSupported", () => {
  it("resolves with the native module's supported/granted result", async () => {
    const mockResult = { supported: true, granted: true };
    const nativeMock = makeNativeMock({
      isStepCountingSupported: jest.fn().mockResolvedValue(mockResult),
    });
    const { isStepCountingSupported } = loadModule(nativeMock);

    await expect(isStepCountingSupported()).resolves.toEqual(mockResult);
  });

  it("forwards an unsupported/not-granted result without modification", async () => {
    const nativeMock = makeNativeMock({
      isStepCountingSupported: jest.fn().mockResolvedValue({ supported: false, granted: false }),
    });
    const { isStepCountingSupported } = loadModule(nativeMock);

    const result = await isStepCountingSupported();
    expect(result.supported).toBe(false);
    expect(result.granted).toBe(false);
  });
});

// ─── startStepCounterUpdate ──────────────────────────────────────────────────

describe("startStepCounterUpdate", () => {
  it("registers an event listener and triggers native updates", () => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate } = loadModule(nativeMock);
    const startDate = new Date(1700000000000);

    const subscription = startStepCounterUpdate(startDate, jest.fn());

    expect(typeof subscription.remove).toBe("function");
    expect(nativeMock.addListener).toHaveBeenCalledWith(eventName);
    expect(nativeMock.startStepCounterUpdate).toHaveBeenCalledWith(startDate.getTime());
  });

  it("removes the previous subscription before creating a new one", () => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate } = loadModule(nativeMock);

    startStepCounterUpdate(new Date(), jest.fn());
    startStepCounterUpdate(new Date(), jest.fn());

    // Two starts → two addListener calls
    expect(nativeMock.addListener).toHaveBeenCalledTimes(2);
    // First subscription's remove() triggers removeListeners(1) inside NativeEventEmitter
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);
  });

  it("throws an UnavailabilityError when the native method is absent", () => {
    const nativeMock = makeNativeMock({ startStepCounterUpdate: undefined });
    const { startStepCounterUpdate } = loadModule(nativeMock);

    expect(() => startStepCounterUpdate(new Date(), jest.fn())).toThrow(
      expect.objectContaining({ code: "ERR_UNAVAILABLE" })
    );
  });
});

// ─── stopStepCounterUpdate ───────────────────────────────────────────────────

describe("stopStepCounterUpdate", () => {
  it("removes the active subscription and calls native stop", () => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate, stopStepCounterUpdate } = loadModule(nativeMock);

    startStepCounterUpdate(new Date(), jest.fn());
    stopStepCounterUpdate();

    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);
    expect(nativeMock.stopStepCounterUpdate).toHaveBeenCalled();
  });

  it("is safe to call when no subscription is active", () => {
    const nativeMock = makeNativeMock();
    const { stopStepCounterUpdate } = loadModule(nativeMock);

    expect(() => stopStepCounterUpdate()).not.toThrow();
    expect(nativeMock.stopStepCounterUpdate).toHaveBeenCalled();
  });
});
