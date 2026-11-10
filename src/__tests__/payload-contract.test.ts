import StepCounter from "../NativeStepCounter";
import { startStepCounterUpdate, stopStepCounterUpdate } from "../index";
import fixtures from "../../tests/fixtures/ios-step-payloads.json";
import { createStepCountFilter, parseStepData, type StepCountData } from "../index";

// Checked against the native Foundation serializer by tests/ios/StepCounterPayloadTests.mm.
describe("native payload contract", () => {
  it("delivers nullable native metrics to raw callbacks unchanged", () => {
    const callback = jest.fn();
    startStepCounterUpdate(new Date(1700000000000), callback);
    const subscribe = StepCounter.onStepCounterUpdate as jest.Mock;
    const receive = subscribe.mock.calls.at(-1)?.[0] as (data: unknown) => void;
    receive(fixtures[0]);
    expect(callback).toHaveBeenCalledWith(fixtures[0]);
    stopStepCounterUpdate();
  });

  it("passes native iOS fixtures through filtering and formatting", () => {
    const filter = createStepCountFilter();
    for (const fixture of fixtures) {
      const data: StepCountData = { ...fixture, counterType: "CMPedometer" };
      expect(filter(data)).toEqual(data);
      expect(parseStepData(data).distance).toBe(data.distance === null ? "N/A" : "2.5m");
    }
  });
});

// Compile-only consumer check: null must be guarded, not cast to a fabricated measurement.
function numericDistance(data: StepCountData): string {
  // @ts-expect-error Unavailable distance is not safe for unconditional arithmetic.
  const unsafe: number = data.distance;
  expect(unsafe).toBe(data.distance);
  return data.distance === null ? "unavailable" : data.distance.toFixed(1);
}
it("supports consumer formatting after a null guard", () => {
  expect(numericDistance({ ...fixtures[0]!, counterType: "CMPedometer" })).toBe("unavailable");
  expect(numericDistance({ ...fixtures[1]!, counterType: "CMPedometer" })).toBe("2.5");
});
