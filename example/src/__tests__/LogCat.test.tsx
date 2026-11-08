import { render, fireEvent, screen } from "@testing-library/react-native";
import { Clipboard } from "react-native";
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
    beforeEach(async () => {
      await render(<LogCat sessionId="session-1" logs={[]} onClear={jest.fn()} />);
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

    beforeEach(async () => {
      await render(<LogCat sessionId="session-1" logs={logs} onClear={jest.fn()} />);
    });

    it("enables the Clear button", () => {
      expect(screen.getByLabelText("Clear logs")).not.toBeDisabled();
    });

    it("enables the Copy button", () => {
      expect(screen.getByLabelText("Copy logs")).not.toBeDisabled();
    });
  });

  it("filters out logs that belong to a different session", async () => {
    const logs = [makeLog({ sessionId: "other-session" })];
    await render(<LogCat sessionId="session-1" logs={logs} onClear={jest.fn()} />);
    // No matching logs → buttons remain disabled
    expect(screen.getByLabelText("Clear logs")).toBeDisabled();
    expect(screen.getByLabelText("Copy logs")).toBeDisabled();
  });

  it("calls onClear when the Clear button is pressed", async () => {
    const onClear = jest.fn();
    await render(<LogCat sessionId="session-1" logs={[makeLog()]} onClear={onClear} />);
    await fireEvent.press(screen.getByLabelText("Clear logs"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  describe("clipboard export", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      '{"steps":100,"walking":true,"missing":null,"metadata":{"tags":["walk","run"]}}',
      '[1,"walking",false,null,{"nested":true}]',
      '"walking \\"now\\""',
      "false",
      "null",
      "9007199254740993",
      '{"steps":',
      "",
      '{ "steps": 1.25, "message": "[object Object]" }',
    ])("copies the serialized payload verbatim: %s", async (payload) => {
      const setString = jest.spyOn(Clipboard, "setString").mockImplementation(() => {});
      await render(
        <LogCat sessionId="session-1" logs={[makeLog({ payload })]} onClear={jest.fn()} />
      );

      await fireEvent.press(screen.getByLabelText("Copy logs"));

      expect(setString).toHaveBeenCalledTimes(1);
      expect(setString).toHaveBeenCalledWith(`22:13:20 [TEST] ${payload}`);
      expect(screen.getByText("Copied")).toBeTruthy();
    });

    it("copies only active-session logs in their original order", async () => {
      const setString = jest.spyOn(Clipboard, "setString").mockImplementation(() => {});
      const logs = [
        makeLog({ tag: "FIRST", payload: '{"steps":1}' }),
        makeLog({ sessionId: "other-session", tag: "HIDDEN", payload: "excluded" }),
        makeLog({ ts: 1700000001000, tag: "SECOND", payload: "not JSON" }),
      ];
      await render(<LogCat sessionId="session-1" logs={logs} onClear={jest.fn()} />);

      await fireEvent.press(screen.getByLabelText("Copy logs"));

      expect(setString).toHaveBeenCalledTimes(1);
      expect(setString).toHaveBeenCalledWith(
        '22:13:20 [FIRST] {"steps":1}\n22:13:21 [SECOND] not JSON'
      );
    });
  });
});
