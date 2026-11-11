/// <reference types="node" />
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { createStepCountFilter, startStepCounterUpdate } from "../../src";
import StepCounter from "../../src/NativeStepCounter";
import type { StepCountData } from "../../src/NativeStepCounter";
import traces from "./traces.json";
import { deliverBatches } from "./deliver";

const output = process.env.STEP_BENCHMARK_JS_OUT;
const records: object[] = [];

for (const scenario of traces.scenarios) {
  test(`filter replay: ${scenario.name}`, async () => {
    const events = Array.from({ length: scenario.events }, (_, i) => ({
      counterType: "STEP_COUNTER" as const,
      steps: (i + 1) * scenario.stepEvery,
      startDate: traces.epochMs,
      endDate: traces.epochMs + (i + 1) * 1000,
      distance: (i + 1) * scenario.stepEvery * 0.762,
    }));
    const run = async () => {
      const filter = createStepCountFilter();
      let accepted = 0;
      let lastSteps = 0;
      let durationNs = 0;
      let deliveryBatches = 0;
      let largestBatch = 0;
      await deliverBatches(events, scenario.batchSize, (batch) => {
        deliveryBatches++;
        largestBatch = Math.max(largestBatch, batch.length);
        const begin = performance.now();
        for (const data of batch) {
          const filtered = filter(data);
          if (filtered) {
            accepted++;
            lastSteps = filtered.steps;
          }
        }
        durationNs += (performance.now() - begin) * 1e6;
      });
      return { accepted, lastSteps, durationNs, deliveryBatches, largestBatch };
    };
    const warmup = output ? 10 : 1;
    for (let i = 0; i < warmup; i++) await run();
    for (let round = 0; round < (output ? 5 : 1); round++) {
      const result = await run();
      // The filter rebases proven bursts; four later plateaus fit elapsed time.
      expect(result.accepted).toBe(scenario.name === "rapid_rotation" ? 4 : scenario.events);
      expect(result.lastSteps).toBe(
        scenario.name === "rapid_rotation" ? 400 : scenario.events * scenario.stepEvery
      );
      records.push({
        scenario: scenario.name,
        stage: "js_filter",
        round,
        operations: events.length,
        accepted: result.accepted,
        rejected: events.length - result.accepted,
        durationNs: result.durationNs,
        deliveryBatches: result.deliveryBatches,
        largestBatch: result.largestBatch,
      });
      if (scenario.name === "delayed_batches") {
        expect(result.deliveryBatches).toBe(6);
        expect(result.largestBatch).toBe(20);
      }
      if (scenario.name === "walking") {
        expect(result.deliveryBatches).toBe(120);
        expect(result.largestBatch).toBe(1);
      }
    }
  });
}

test("long teardown trace detaches the owned event source", () => {
  const listeners = new Set<(data: StepCountData) => void>();
  jest.mocked(StepCounter.onStepCounterUpdate).mockImplementation((listener) => {
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
      },
    };
  });
  let delivered = 0;
  const handle = startStepCounterUpdate(new Date(traces.epochMs), () => delivered++);
  const data: StepCountData = {
    counterType: "STEP_COUNTER",
    steps: 1,
    startDate: traces.epochMs,
    endDate: traces.epochMs + 1000,
    distance: 1,
  };
  for (let i = 0; i < 10000; i++) listeners.forEach((listener) => listener(data));
  expect(delivered).toBe(10000);
  handle.remove();
  for (let i = 0; i < 10000; i++) listeners.forEach((listener) => listener(data));
  expect(delivered).toBe(10000);
});

afterAll(() => {
  if (output) writeFileSync(output, JSON.stringify(records, null, 2) + "\n");
});
