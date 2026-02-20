import TurboModuleRegistry from "react-native/Libraries/TurboModule/TurboModuleRegistry";

// Add this to the top of your test file
jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => ({
  getEnforcing: jest.fn(),
}));

beforeEach(() => {
  (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue({
    isSupported: jest.fn(),
    startObserving: jest.fn(),
    stopObserving: jest.fn(),
    isStepCountingSupported: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    addListener: jest.fn((_eventName: string) => console.debug),
    removeListeners: jest.fn((_count: number) => console.debug),
  });
});
