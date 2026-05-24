import { act, fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";

// ─── mocks ──────────────────────────────────────────────────────────────────

jest.mock("@dongminyu/react-native-step-counter", () => ({
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

// ─── helpers ─────────────────────────────────────────────────────────────────

import {
  isStepCountingSupported,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from "@dongminyu/react-native-step-counter";
import { getStepCounterPermission } from "../permission";

const mockSupported = isStepCountingSupported as jest.Mock;
const mockStart = startStepCounterUpdate as jest.Mock;
const mockStop = stopStepCounterUpdate as jest.Mock;
const mockPermission = getStepCounterPermission as jest.Mock;
let mockSubscriptionRemove: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscriptionRemove = jest.fn();
  mockStart.mockReturnValue({ remove: mockSubscriptionRemove });
  mockPermission.mockResolvedValue(true);
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe("App", () => {
  it('shows "Stopped" when sensor is not supported', async () => {
    mockSupported.mockResolvedValue({ supported: false, granted: false });
    render(<App />);
    expect(await screen.findByText("Stopped")).toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("auto-starts when sensor is supported and permission is already granted", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    render(<App />);
    await act(async () => {});
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("START button is disabled while the counter is active", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    render(<App />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "START" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "STOP" })).not.toBeDisabled();
  });

  it("pressing STOP calls stopStepCounterUpdate and re-enables START", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    render(<App />);
    await act(async () => {});

    fireEvent.press(screen.getByRole("button", { name: "STOP" }));

    expect(mockStop).toHaveBeenCalled();
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "STOP" })).toBeDisabled();
  });

  it("pressing START does not start updates when the sensor is unsupported", async () => {
    mockSupported.mockResolvedValue({ supported: false, granted: false });
    render(<App />);
    await act(async () => {});

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "START" }));
    });

    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("pressing START requests permission before starting updates", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: false });
    mockPermission.mockResolvedValue(true);
    render(<App />);
    await act(async () => {});

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "START" }));
    });

    expect(mockPermission).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("logs flattened raw and accepted step values for live device checks", async () => {
    mockSupported.mockResolvedValue({ supported: true, granted: true });
    render(<App />);
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
    render(<App />);
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
