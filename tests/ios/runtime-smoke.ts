// Entry point for the disposable CompatibilityConsumer, not the normal example.
import { AppRegistry } from "react-native";
import {
  isStepCountingSupported,
  onErrorOccurred,
  onStepCounterUpdate,
  onStepsSensorInfo,
  startStepCounterUpdate,
  stopStepCounterUpdate,
  type StepCountData,
  type StepsSensorInfo,
  type StepCounterError,
} from "react-native-step-counter-newarch";

AppRegistry.registerComponent("CompatibilityConsumer", () => () => null);

const raw: StepCountData[] = [];
const info: StepsSensorInfo[] = [];
let sensorInfoReceived: (() => void) | undefined;
const errors: StepCounterError[] = [];
const subscriptions = [
  onStepCounterUpdate((data) => {
    raw.push(data);
  }),
  onStepsSensorInfo((data) => {
    info.push(data);
    if (info.length === 2) sensorInfoReceived?.();
  }),
  onErrorOccurred((error) => {
    errors.push(error);
  }),
];
let firstCount = 0;
let replacementCount = 0;
let completed = false;
let failed = false;
const fail = (message: string) => {
  failed = true;
  if (!completed) console.error("STEP_COUNTER_RUNTIME_FAIL", message);
};

setTimeout(async () => {
  try {
    const runtimeGlobal = globalThis as typeof globalThis & { RN$Bridgeless?: boolean };
    if (runtimeGlobal.RN$Bridgeless !== true) {
      throw new Error("Expected bridgeless React Native runtime");
    }
    const capabilities = await isStepCountingSupported();
    if (!capabilities.supported || !capabilities.granted)
      throw new Error("Replay sensor unavailable");
    const first = startStepCounterUpdate(new Date(), (data) => {
      firstCount++;
      if (data.steps !== 5 || data.counterType !== "CMPedometer" || data.distance !== 3) {
        fail("Unexpected native payload: " + JSON.stringify(data));
        return;
      }
      setTimeout(() => {
        first.remove();
        startStepCounterUpdate(new Date(), () => {
          replacementCount++;
          stopStepCounterUpdate();
          setTimeout(async () => {
            const observedSensorInfo = new Promise<void>((resolve) => {
              sensorInfoReceived = resolve;
            });
            await isStepCountingSupported();
            await observedSensorInfo;
            subscriptions.forEach((subscription) => subscription.remove());
            if (failed) return;
            if (
              firstCount !== 1 ||
              replacementCount !== 1 ||
              raw.length !== 2 ||
              raw.some(
                (sample) =>
                  sample.steps !== 5 ||
                  sample.distance !== 3 ||
                  sample.counterType !== "CMPedometer" ||
                  sample.endDate <= sample.startDate ||
                  sample.startDate < 1e12
              ) ||
              info.length !== 2 ||
              errors.length !== 0
            ) {
              fail(JSON.stringify({ firstCount, replacementCount, raw, info, errors }));
              return;
            }
            completed = true;
            console.log(
              "STEP_COUNTER_RUNTIME_PASS",
              JSON.stringify({ firstCount, replacementCount, raw, info, errors })
            );
          }, 900);
        });
        // A retired handle must not stop the replacement.
        first.remove();
      }, 0);
    });
  } catch (error) {
    fail(String(error));
  }
}, 2000);
setTimeout(() => {
  if (!completed) fail("Timed out waiting for generated callbacks");
}, 15000);
