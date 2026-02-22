import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";

// ─── mocks ──────────────────────────────────────────────────────────────────

jest.mock("@dongminyu/react-native-step-counter", () => ({
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

const mockSupported = isStepCountingSupported as jest.Mock;
const mockStart = startStepCounterUpdate as jest.Mock;
const mockStop = stopStepCounterUpdate as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockStart.mockReturnValue({ remove: jest.fn() });
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
    expect(screen.getByRole("button", { name: "START" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "STOP" })).toBeDisabled();
  });
});
