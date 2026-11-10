import { TurboModuleRegistry } from "react-native";

it("scopes error delivery to a unique session and removes owned error listeners", () => {
  const errors: ((error: object) => void)[] = [];
  const removals: jest.Mock[] = [];
  const native = {
    startStepCounterUpdate: jest.fn(),
    startStepCounterUpdateWithSession: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    onStepCounterUpdate: jest.fn(() => ({ remove: jest.fn() })),
    onErrorOccurred: jest.fn((callback) => {
      errors.push(callback);
      const remove = jest.fn();
      removals.push(remove);
      return { remove };
    }),
  };
  jest.isolateModules(() => {
    (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue(native);
    const api = require("../index");
    const first = jest.fn();
    const second = jest.fn();
    api.startStepCounterUpdate(new Date(1700000000000), jest.fn(), first);
    expect(native.startStepCounterUpdateWithSession).toHaveBeenCalledTimes(1);
    const firstId = native.startStepCounterUpdateWithSession.mock.calls[0]![1];
    const handle = api.startStepCounterUpdate(new Date(1700000000000), jest.fn(), second);
    const secondId = native.startStepCounterUpdateWithSession.mock.calls[1]![1];
    expect(firstId).not.toBe(secondId);
    const error = {
      code: "REGISTRATION_FAILED",
      message: "failed",
      platform: "android",
      sessionId: firstId,
      operation: "start",
      fatal: true,
    };
    errors.forEach((callback) => callback(error));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    errors.forEach((callback) => callback({ ...error, sessionId: secondId }));
    expect(second).toHaveBeenCalledTimes(1);
    handle.remove();
    expect(removals.every((remove) => remove.mock.calls.length === 1)).toBe(true);
  });
});

it("rolls back listeners when session error subscription throws", () => {
  const remove = jest.fn();
  const failure = new Error("subscription failed");
  const native = {
    startStepCounterUpdate: jest.fn(),
    startStepCounterUpdateWithSession: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    onStepCounterUpdate: jest.fn(() => ({ remove })),
    onErrorOccurred: jest.fn(() => {
      throw failure;
    }),
  };
  jest.isolateModules(() => {
    (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue(native);
    const api = require("../index");
    expect(() => api.startStepCounterUpdate(new Date(), jest.fn(), jest.fn())).toThrow(failure);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(native.startStepCounterUpdateWithSession).not.toHaveBeenCalled();
  });
});
