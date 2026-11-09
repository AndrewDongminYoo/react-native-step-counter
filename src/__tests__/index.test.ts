import { TurboModuleRegistry } from "react-native";

// Static imports work for pure functions — the native module is not invoked at call time.
import { createStepCountFilter, parseStepData, NAME, VERSION, type StepCountData } from "../index";
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

  it('VERSION is "0.5.0"', () => {
    expect(VERSION).toBe("0.5.0");
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

// ─── createStepCountFilter ───────────────────────────────────────────────────

describe("createStepCountFilter", () => {
  const startDate = 1700000000000;

  function stepData(steps: number, endOffsetMs: number): StepCountData {
    return {
      counterType: "STEP_COUNTER",
      steps,
      startDate,
      endDate: startDate + endOffsetMs,
      distance: steps * 0.762,
    };
  }

  it("drops rotation-like bursts that exceed the configured cadence", () => {
    const filter = createStepCountFilter({ minimumStepIntervalMs: 250 });

    expect(filter(stepData(1, 100))).toBeNull();
    expect(filter(stepData(2, 180))).toBeNull();

    const next = filter(stepData(3, 1000));

    expect(next?.steps).toBe(1);
    expect(next?.distance).toBeCloseTo(0.762);
  });

  it("keeps normal walking cadence unchanged", () => {
    const filter = createStepCountFilter({ minimumStepIntervalMs: 250 });

    expect(filter(stepData(1, 300))?.steps).toBe(1);
    expect(filter(stepData(2, 650))?.steps).toBe(2);
    expect(filter(stepData(3, 1000))?.steps).toBe(3);
  });

  it("preserves delayed cumulative batches instead of permanently subtracting them", () => {
    const filter = createStepCountFilter();
    expect(filter(stepData(10, 10000))?.steps).toBe(10);
    expect(filter(stepData(20, 10010))?.steps).toBe(20);
    expect(filter(stepData(21, 11000))?.steps).toBe(21);
  });

  it("does not charge idle reports against a later cumulative batch", () => {
    const filter = createStepCountFilter();
    expect(filter(stepData(0, 9990))?.steps).toBe(0);
    expect(filter(stepData(20, 10000))?.steps).toBe(20);
  });

  it.each([
    { steps: NaN },
    { steps: Infinity },
    { steps: -1 },
    { steps: 1.5 },
    { startDate: NaN },
    { startDate: Infinity },
    { endDate: NaN },
    { endDate: Infinity },
    { endDate: startDate - 1 },
    { distance: NaN },
    { distance: Infinity },
    { distance: -1 },
  ])("rejects malformed input without poisoning subsequent totals: %p", (invalid) => {
    const filter = createStepCountFilter();
    expect(filter({ ...stepData(1, 1000), ...invalid })).toBeNull();
    expect(filter(stepData(2, 2000))?.steps).toBe(2);
  });

  it("ignores duplicates, backwards dates, and same-session counter resets", () => {
    const filter = createStepCountFilter();
    expect(filter(stepData(10, 10000))?.steps).toBe(10);
    expect(filter(stepData(10, 10000))).toBeNull();
    expect(filter(stepData(11, 9000))).toBeNull();
    expect(filter(stepData(1, 11000))).toBeNull();
    expect(filter(stepData(11, 12000))?.steps).toBe(11);
  });

  it("rejects decreasing distances without corrupting the next event", () => {
    const filter = createStepCountFilter();
    filter(stepData(10, 10000));
    expect(filter({ ...stepData(11, 11000), distance: 0 })).toBeNull();
    expect(filter(stepData(12, 12000))?.distance).toBeCloseTo(9.144);
  });

  it("clears burst adjustments at a newer explicit session and ignores old sessions", () => {
    const filter = createStepCountFilter();
    expect(filter(stepData(1, 100))).toBeNull();
    const nextSession = { ...stepData(1, 2000), startDate: startDate + 1000 };
    expect(filter(nextSession)?.steps).toBe(1);
    expect(filter(stepData(10, 3000))).toBeNull();
    expect(
      filter({ ...nextSession, steps: 2, distance: 1.524, endDate: startDate + 3000 })?.steps
    ).toBe(2);
  });

  it("accepts a backend boundary and rejects delayed events from its retired backend", () => {
    const filter = createStepCountFilter();
    filter(stepData(10, 10000));
    const fallback = { ...stepData(1, 11000), counterType: "ACCELEROMETER" as const };
    expect(filter(fallback)?.steps).toBe(1);
    expect(filter(stepData(11, 12000))).toBeNull();
    expect(
      filter({ ...fallback, steps: 2, distance: 1.524, endDate: startDate + 13000 })?.steps
    ).toBe(2);
  });

  it("does not let a stale backend switch replace the active stream", () => {
    const filter = createStepCountFilter();
    filter(stepData(10, 10000));
    expect(filter({ ...stepData(1, 9000), counterType: "ACCELEROMETER" })).toBeNull();
    expect(filter(stepData(11, 11000))?.steps).toBe(11);
  });

  it("allows an explicit new session to restart a smaller counter", () => {
    const filter = createStepCountFilter();
    filter(stepData(10, 10000));
    expect(filter({ ...stepData(1, 12000), startDate: startDate + 11000 })?.steps).toBe(1);
  });

  it("keeps internal snapshots independent of input and output mutations", () => {
    const filter = createStepCountFilter();
    const first = stepData(1, 1000);
    const result = filter(first);
    first.steps = 100;
    if (result) result.endDate = startDate + 100000;
    expect(filter(stepData(2, 2000))?.steps).toBe(2);
  });

  it.each([NaN, Infinity, 0, -1])(
    "uses the default cadence for invalid interval %s",
    (interval) => {
      const filter = createStepCountFilter({ minimumStepIntervalMs: interval });
      expect(filter(stepData(1, 100))).toBeNull();
      expect(filter(stepData(2, 1000))?.steps).toBe(1);
    }
  );
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

  it("rejects an invalid date without registering a listener or starting native updates", () => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate } = loadModule(nativeMock);

    expect(() => startStepCounterUpdate(new Date(NaN), jest.fn())).toThrow(RangeError);

    expect(nativeMock.addListener).not.toHaveBeenCalled();
    expect(nativeMock.startStepCounterUpdate).not.toHaveBeenCalled();
  });

  it("preserves the active subscription when a replacement date is invalid", () => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate, stopStepCounterUpdate } = loadModule(nativeMock);
    startStepCounterUpdate(new Date(), jest.fn());

    expect(() => startStepCounterUpdate(new Date(NaN), jest.fn())).toThrow(RangeError);

    expect(nativeMock.removeListeners).not.toHaveBeenCalled();
    expect(nativeMock.addListener).toHaveBeenCalledTimes(1);
    expect(nativeMock.startStepCounterUpdate).toHaveBeenCalledTimes(1);
    stopStepCounterUpdate();
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);
  });

  it("removes a failed start's listener and recovers on a later start", () => {
    const failure = new Error("Native start failed");
    const nativeMock = makeNativeMock({
      startStepCounterUpdate: jest.fn().mockImplementationOnce(() => {
        throw failure;
      }),
    });
    const { startStepCounterUpdate, stopStepCounterUpdate } = loadModule(nativeMock);

    let thrown: unknown;
    try {
      startStepCounterUpdate(new Date(), jest.fn());
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(failure);
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);

    stopStepCounterUpdate();
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);
    const subscription = startStepCounterUpdate(new Date(), jest.fn());
    expect(typeof subscription.remove).toBe("function");
    stopStepCounterUpdate();
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(2);
    expect(nativeMock.addListener).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, 8640000000000000])("forwards the finite timestamp %s unchanged", (from) => {
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate, stopStepCounterUpdate } = loadModule(nativeMock);

    startStepCounterUpdate(new Date(from), jest.fn());

    expect(nativeMock.startStepCounterUpdate).toHaveBeenCalledWith(from);
    stopStepCounterUpdate();
  });

  it("does not remove a newer subscription when an older start fails reentrantly", () => {
    const failure = new Error("Outer native start failed");
    const nativeMock = makeNativeMock();
    const { startStepCounterUpdate, stopStepCounterUpdate } = loadModule(nativeMock);
    nativeMock.startStepCounterUpdate?.mockImplementationOnce(() => {
      startStepCounterUpdate(new Date(), jest.fn());
      throw failure;
    });

    expect(() => startStepCounterUpdate(new Date(), jest.fn())).toThrow(failure);
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(1);
    stopStepCounterUpdate();
    expect(nativeMock.removeListeners).toHaveBeenCalledTimes(2);
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
