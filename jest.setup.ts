import TurboModuleRegistry from "react-native/Libraries/TurboModule/TurboModuleRegistry";

// Add this to the top of your test file
jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => ({
  // Return a complete stub immediately so that modules importing at the top level
  // (e.g. src/index.tsx constructing NativeEventEmitter) do not hit the Proxy fallback.
  getEnforcing: jest.fn().mockReturnValue({
    isSupported: jest.fn(),
    startObserving: jest.fn(),
    stopObserving: jest.fn(),
    isStepCountingSupported: jest.fn(),
    startStepCounterUpdate: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    addListener: jest.fn((_eventName: string) => console.debug),
    removeListeners: jest.fn((_count: number) => console.debug),
  }),
}));

beforeEach(() => {
  (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue({
    isSupported: jest.fn(),
    startObserving: jest.fn(),
    stopObserving: jest.fn(),
    isStepCountingSupported: jest.fn(),
    startStepCounterUpdate: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    addListener: jest.fn((_eventName: string) => console.debug),
    removeListeners: jest.fn((_count: number) => console.debug),
  });
});
