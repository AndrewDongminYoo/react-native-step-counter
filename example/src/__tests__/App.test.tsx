import { act, fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";
import { Clipboard } from "react-native";
import * as logging from "../logging";
import LogCat from "../LogCat";

// ─── mocks ──────────────────────────────────────────────────────────────────

jest.mock("react-native-step-counter-newarch", () => ({
  createStepCountFilter: jest.fn(() => (data: unknown) => data),
  isStepCountingSupported: jest.fn(),
  startStepCounterUpdate: jest.fn(),
  stopStepCounterUpdate: jest.fn(),
  parseStepData: jest.fn().mockReturnValue({
    dailyGoal: "0/10000 steps",
    steps: 0,
    stepsString: "0 steps",
    calories: "0.00kCal",
    startDate: "00:00:00",
    endDate: "00:00:00",
    distance: "0.0m",
  }),
}));

jest.mock("../permission", () => ({
  getStepCounterPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock("../LogCat", () => {
  const actual = jest.requireActual<typeof import("../LogCat")>("../LogCat");
  return { __esModule: true, ...actual, default: jest.fn(actual.default) };
});

// ─── helpers ─────────────────────────────────────────────────────────────────

import {
  createStepCountFilter,
  isStepCountingSupported,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from "react-native-step-counter-newarch";
import { getStepCounterPermission } from "../permission";

const mockSupported = isStepCountingSupported as jest.Mock;
const mockStart = startStepCounterUpdate as jest.Mock;
const mockStop = stopStepCounterUpdate as jest.Mock;
const mockPermission = getStepCounterPermission as jest.Mock;
let mockSubscriptionRemove: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (createStepCountFilter as jest.Mock).mockImplementation(() => (data: unknown) => data);
  mockSubscriptionRemove = jest.fn();
  mockStart.mockReturnValue({ remove: mockSubscriptionRemove });
  mockPermission.mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe("App", () => {
  it("skips log serialization and accumulation in logging-off measurements", async () => {
    jest.replaceProperty(logging, "EXAMPLE_LOGGING_ENABLED", false);
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    (createStepCountFilter as jest.Mock).mockReturnValue((data: { steps: number }) =>
      data.steps % 2 ? data : null
    );
    const stringify = jest.spyOn(JSON, "stringify");
    const isoDate = jest.spyOn(Date.prototype, "toISOString");
    await render(<App />);
    const callback = mockStart.mock.calls[0][1];
    await act(() => {
      for (let steps = 1; steps <= 2500; steps += 1) {
        callback({
          counterType: "STEP_COUNTER",
          steps,
          startDate: 1700000000000,
          endDate: 1700000000000 + steps * 1000,
          distance: steps,
        });
      }
    });
    expect(screen.getByText("2499")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
    await fireEvent.press(screen.getByRole("button", { name: "RESTART" }));
    expect(screen.queryByText("LogCat")).not.toBeOnTheScreen();
    for (const key of ["rawSteps", "supported", "ok", "hadSubscription", "at"]) {
      expect(stringify).not.toHaveBeenCalledWith(
        expect.objectContaining({ [key]: expect.anything() })
      );
    }
    expect(isoDate).not.toHaveBeenCalled();

    // Reveal the retained state through the real renderer rather than a mock.
    jest.replaceProperty(logging, "EXAMPLE_LOGGING_ENABLED", true);
    await screen.rerender(<App />);
    expect(jest.mocked(LogCat).mock.lastCall![0].logs).toEqual([]);
    expect(screen.getByRole("button", { name: "Copy logs" })).toBeDisabled();
  });

  it("skips permission diagnostics with logging disabled", async () => {
    jest.replaceProperty(logging, "EXAMPLE_LOGGING_ENABLED", false);
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    const stringify = jest.spyOn(JSON, "stringify");
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    expect(mockPermission).toHaveBeenCalledTimes(1);
    expect(stringify).not.toHaveBeenCalledWith(expect.objectContaining({ requested: true }));
    expect(screen.queryByText("LogCat")).not.toBeOnTheScreen();
  });
  it.each([false, true, "mixed"])(
    "bounds a long session (filtered=%s) to the newest 200 rows",
    async (filtered) => {
      mockSupported.mockResolvedValue({ supported: true, granted: true });
      if (filtered) {
        (createStepCountFilter as jest.Mock).mockReturnValue((data: { steps: number }) =>
          filtered === "mixed" && data.steps % 2 ? data : null
        );
      }
      const copy = jest.spyOn(Clipboard, "setString").mockImplementation(() => {});
      await render(<App />);
      const callback = mockStart.mock.calls[0][1];
      const stepRows = /\[stepCounterUpdate(?:Filtered)?\]/;

      for (let batch = 0; batch < 10; batch += 1) {
        await act(() => {
          for (let offset = 1; offset <= 250; offset += 1) {
            const steps = batch * 250 + offset;
            callback({
              counterType: "STEP_COUNTER",
              steps,
              startDate: 1700000000000,
              endDate: 1700000000000 + steps * 1000,
              distance: steps,
            });
          }
        });
        expect(screen.getAllByText(stepRows)).toHaveLength(200);
        expect(jest.mocked(LogCat).mock.lastCall![0].logs).toHaveLength(200);
        await fireEvent.press(screen.getByRole("button", { name: "Copy logs" }));
        const lines = (copy.mock.lastCall![0] as string).split("\n");
        expect(lines).toHaveLength(200);
        const rawSteps = lines.map((line) => JSON.parse(line.slice(line.indexOf("{"))).rawSteps);
        expect(rawSteps).toEqual(
          Array.from({ length: 200 }, (_, index) => batch * 250 + 51 + index)
        );
      }

      await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
      await fireEvent.press(screen.getByRole("button", { name: "Copy logs" }));
      const stoppedLines = (copy.mock.lastCall![0] as string).split("\n");
      expect(stoppedLines).toHaveLength(200);
      expect(stoppedLines[199]).toContain("[STOP]");
      await fireEvent.press(screen.getByRole("button", { name: "RESTART" }));
      expect(screen.queryAllByText(stepRows)).toHaveLength(0);
      await fireEvent.press(screen.getByRole("button", { name: "Copy logs" }));
      expect(copy.mock.lastCall![0]).toContain("[START]");
      expect(copy.mock.lastCall![0]).not.toContain("stepCounterUpdate");
      await act(() => {
        mockStart.mock.lastCall![1]({
          counterType: "STEP_COUNTER",
          steps: 3001,
          startDate: 1700003000000,
          endDate: 1700003001000,
          distance: 3001,
        });
      });
      expect(screen.getAllByText(stepRows)).toHaveLength(1);
      await fireEvent.press(screen.getByRole("button", { name: "Clear logs" }));
      expect(screen.queryAllByText(stepRows)).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Copy logs" })).toBeDisabled();
    }
  );

  it("applies the same 200-row cap to capability diagnostics when history is full", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    const copy = jest.spyOn(Clipboard, "setString").mockImplementation(() => {});
    await render(<App />);
    await act(() => {
      for (let steps = 1; steps <= 250; steps += 1) {
        mockStart.mock.lastCall![1]({
          counterType: "STEP_COUNTER",
          steps,
          startDate: 1700000000000,
          endDate: 1700000000000 + steps * 1000,
          distance: steps,
        });
      }
    });
    await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
    mockSupported.mockResolvedValue({ supported: false, granted: false });
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    expect(jest.mocked(LogCat).mock.lastCall![0].logs).toHaveLength(200);
    await fireEvent.press(screen.getByRole("button", { name: "Copy logs" }));
    const lines = (copy.mock.lastCall![0] as string).split("\n");
    expect(lines).toHaveLength(200);
    expect(lines[199]).toContain("[capabilities]");
  });
  it('shows "Stopped" when sensor is not supported', async () => {
    mockSupported.mockResolvedValue({ supported: false, granted: false });
    await render(<App />);
    expect(await screen.findByText("Stopped")).toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("auto-starts when sensor is supported and permission is already granted", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await render(<App />);
    await act(async () => {});
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("START button is disabled while the counter is active", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await render(<App />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "START" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "STOP" })).not.toBeDisabled();
  });

  it("pressing STOP calls stopStepCounterUpdate and re-enables START", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await render(<App />);
    await act(async () => {});

    await fireEvent.press(screen.getByRole("button", { name: "STOP" }));

    expect(mockStop).toHaveBeenCalled();
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "STOP" })).toBeDisabled();
  });

  it("pressing START does not start updates when the sensor is unsupported", async () => {
    mockSupported.mockResolvedValue({ supported: false, granted: false });
    await render(<App />);
    await act(async () => {});

    await fireEvent.press(screen.getByRole("button", { name: "START" }));

    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("pressing START requests permission before starting updates", async () => {
    mockSupported
      .mockResolvedValueOnce({ supported: true, granted: false })
      .mockResolvedValueOnce({ supported: true, granted: false })
      .mockResolvedValue({ supported: true, granted: true });
    mockPermission.mockResolvedValue(true);
    await render(<App />);
    await act(async () => {});

    await fireEvent.press(screen.getByRole("button", { name: "START" }));

    expect(mockPermission).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("does not start when native permission remains denied after the request", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    mockPermission.mockResolvedValue(true);
    await render(<App />);
    await act(async () => {});

    await fireEvent.press(screen.getByRole("button", { name: "START" }));

    expect(mockPermission).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
  });

  it("does not start when sensors become unavailable during the permission request", async () => {
    mockSupported
      .mockResolvedValueOnce({ supported: true, granted: false })
      .mockResolvedValueOnce({ supported: true, granted: false })
      .mockResolvedValue({ supported: false, granted: true });
    await render(<App />);
    await act(async () => {});

    await fireEvent.press(screen.getByRole("button", { name: "START" }));

    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
  });

  it("logs flattened raw and accepted step values for live device checks", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await render(<App />);
    await act(async () => {});

    await act(async () => {
      const callback = mockStart.mock.calls[0][1];
      callback({
        counterType: "STEP_COUNTER",
        steps: 7,
        startDate: 1700000000000,
        endDate: 1700000001000,
        distance: 5.334,
      });
    });

    expect(await screen.findByText(/"rawSteps":/)).toBeTruthy();
    expect(await screen.findByText(/"acceptedSteps":/)).toBeTruthy();
    expect(await screen.findByText(/"counterType":/)).toBeTruthy();
  });

  it("renders the accepted step count in the app overlay", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await render(<App />);
    await act(async () => {});

    await act(async () => {
      const callback = mockStart.mock.calls[0][1];
      callback({
        counterType: "STEP_COUNTER",
        steps: 28,
        startDate: 1700000000000,
        endDate: 1700000001000,
        distance: 21.336,
      });
    });

    expect(await screen.findByText("28")).toBeTruthy();
    expect(await screen.findByText("steps")).toBeTruthy();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("pending starts", () => {
  it("STOP cancels permission work even if permission later becomes granted", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    const pending = deferred<boolean>();
    mockPermission.mockReturnValue(pending.promise);
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    expect(screen.getByRole("button", { name: "STOP" })).toBeEnabled();
    await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await act(async () => {
      pending.resolve(true);
    });
    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByText("Stopped")).toBeOnTheScreen();
  });

  it("unmount cancels permission work", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    const pending = deferred<boolean>();
    mockPermission.mockReturnValue(pending.promise);
    const view = await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    await view.unmount();
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await act(async () => {
      pending.resolve(true);
    });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("a newer START cancels the older permission result", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    const older = deferred<boolean>();
    const newer = deferred<boolean>();
    mockPermission.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    await fireEvent.press(screen.getByRole("button", { name: "START" }));
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    await act(async () => {
      older.resolve(true);
    });
    expect(mockStart).not.toHaveBeenCalled();
    await act(async () => {
      newer.resolve(true);
    });
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("STOP cancels initial capability auto-start", async () => {
    const pending = deferred<{ supported: boolean; granted: boolean }>();
    mockSupported.mockReturnValue(pending.promise);
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
    await act(async () => {
      pending.resolve({ supported: true, granted: true });
    });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("handles initial capability rejection", async () => {
    mockSupported.mockRejectedValue(new Error("capability failed"));
    await render(<App />);
    expect(screen.getByText("Stopped")).toBeOnTheScreen();
    expect(mockStart).not.toHaveBeenCalled();
  });
});

it("STOP cancels the capability recheck after permission", async () => {
  const pending = deferred<{ supported: boolean; granted: boolean }>();
  mockSupported
    .mockResolvedValueOnce({ supported: true, granted: false })
    .mockResolvedValueOnce({ supported: true, granted: false })
    .mockReturnValueOnce(pending.promise);
  await render(<App />);
  await fireEvent.press(screen.getByRole("button", { name: "START" }));
  await fireEvent.press(screen.getByRole("button", { name: "STOP" }));
  await act(async () => {
    pending.resolve({ supported: true, granted: true });
  });
  expect(mockStart).not.toHaveBeenCalled();
});

it("permission rejection leaves a stopped, retryable state", async () => {
  mockSupported.mockResolvedValue({ supported: true, granted: false });
  mockPermission.mockRejectedValueOnce(new Error("permission failed"));
  await render(<App />);
  await fireEvent.press(screen.getByRole("button", { name: "START" }));
  expect(mockStart).not.toHaveBeenCalled();
  expect(screen.getByText("Stopped")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "STOP" })).toBeDisabled();
});

it("stops on fatal session errors and ignores callbacks from a replaced session", async () => {
  mockSupported.mockResolvedValue({ supported: true, granted: true });
  await render(<App />);
  const oldError = mockStart.mock.calls[0][2];
  expect(oldError).toEqual(expect.any(Function));
  await fireEvent.press(screen.getByRole("button", { name: "RESTART" }));
  await act(() => oldError({ fatal: true }));
  expect(screen.getByRole("button", { name: "START" })).toBeDisabled();
  await act(() => mockStart.mock.lastCall![2]({ fatal: false }));
  expect(screen.getByRole("button", { name: "START" })).toBeDisabled();
  await act(() => mockStart.mock.lastCall![2]({ fatal: true }));
  expect(screen.getByText("Stopped")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
});
