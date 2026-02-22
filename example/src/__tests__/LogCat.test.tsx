import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import LogCat, { type LogLine } from "../LogCat";

function makeLog(overrides: Partial<LogLine> = {}): LogLine {
  return {
    sessionId: "session-1",
    ts: 1700000000000,
    tag: "TEST",
    payload: JSON.stringify({ steps: 100 }),
    ...overrides,
  };
}

describe("LogCat", () => {
  describe("empty state", () => {
    beforeEach(() => {
      render(<LogCat sessionId="session-1" logs={[]} onClear={jest.fn()} />);
    });

    it("disables the Clear button when there are no logs", () => {
      expect(screen.getByLabelText("Clear logs")).toBeDisabled();
    });

    it("disables the Copy button when there are no logs", () => {
      expect(screen.getByLabelText("Copy logs")).toBeDisabled();
    });
  });

  describe("with matching logs", () => {
    const logs = [makeLog(), makeLog({ ts: 1700000001000, tag: "INFO" })];

    beforeEach(() => {
      render(<LogCat sessionId="session-1" logs={logs} onClear={jest.fn()} />);
    });

    it("enables the Clear button", () => {
      expect(screen.getByLabelText("Clear logs")).not.toBeDisabled();
    });

    it("enables the Copy button", () => {
      expect(screen.getByLabelText("Copy logs")).not.toBeDisabled();
    });
  });

  it("filters out logs that belong to a different session", () => {
    const logs = [makeLog({ sessionId: "other-session" })];
    render(<LogCat sessionId="session-1" logs={logs} onClear={jest.fn()} />);
    // No matching logs → buttons remain disabled
    expect(screen.getByLabelText("Clear logs")).toBeDisabled();
    expect(screen.getByLabelText("Copy logs")).toBeDisabled();
  });

  it("calls onClear when the Clear button is pressed", () => {
    const onClear = jest.fn();
    render(<LogCat sessionId="session-1" logs={[makeLog()]} onClear={onClear} />);
    fireEvent.press(screen.getByLabelText("Clear logs"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
