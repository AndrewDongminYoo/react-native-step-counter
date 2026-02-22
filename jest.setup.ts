import TurboModuleRegistry from "react-native/Libraries/TurboModule/TurboModuleRegistry";

// jest.mock factories are hoisted and cannot reference out-of-scope variables,
// so all helpers and objects are defined inside the factory.
jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => {
  /**
   * A Proxy that responds to any property access with jest.fn().
   * Used for TurboModuleRegistry.get() so internal RN subsystems
   * (Keyboard, NativeAnimated, AppState, …) don't throw when they
   * call methods that aren't explicitly mocked.
   *
   * The Dimensions constant is pre-seeded because StyleSheet.create()
   * calls NativeDeviceInfo.getConstants() at module evaluation time.
   */
  const makeAnyMock = () =>
    new Proxy(
      {
        getConstants: jest.fn().mockReturnValue({
          Dimensions: {
            screen: { width: 375, height: 667, scale: 1, fontScale: 1 },
            window: { width: 375, height: 667, scale: 1, fontScale: 1 },
          },
        }),
      },
      {
        get(target, prop: string | symbol) {
          if (prop in target) return target[prop as keyof typeof target];
          if (typeof prop === "string") return jest.fn();
          return undefined;
        },
      }
    );

  return {
    // get() feeds internal RN modules (Keyboard, NativeAnimated, DeviceInfo, …).
    get: jest.fn().mockImplementation(() => makeAnyMock()),

    // getEnforcing() is used by our StepCounter library and NativeDeviceInfo.
    // The stub includes getConstants (for DeviceInfo) plus all StepCounter methods.
    getEnforcing: jest.fn().mockReturnValue({
      getConstants: jest.fn().mockReturnValue({
        Dimensions: {
          screen: { width: 375, height: 667, scale: 1, fontScale: 1 },
          window: { width: 375, height: 667, scale: 1, fontScale: 1 },
        },
      }),
      addListener: jest.fn((_eventName: string) => undefined),
      removeListeners: jest.fn((_count: number) => undefined),
      isStepCountingSupported: jest.fn(),
      startStepCounterUpdate: jest.fn(),
      stopStepCounterUpdate: jest.fn(),
      isSupported: jest.fn(),
      startObserving: jest.fn(),
      stopObserving: jest.fn(),
    }),
  };
});

beforeEach(() => {
  // Reset to a fresh stub before every test so call counts start at zero.
  (TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue({
    getConstants: jest.fn().mockReturnValue({
      Dimensions: {
        screen: { width: 375, height: 667, scale: 1, fontScale: 1 },
        window: { width: 375, height: 667, scale: 1, fontScale: 1 },
      },
    }),
    addListener: jest.fn((_eventName: string) => undefined),
    removeListeners: jest.fn((_count: number) => undefined),
    isStepCountingSupported: jest.fn(),
    startStepCounterUpdate: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
    isSupported: jest.fn(),
    startObserving: jest.fn(),
    stopObserving: jest.fn(),
  });
});
