/// <reference types="node" />
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { createStepCountFilter, startStepCounterUpdate } from "../../src";
import StepCounter from "../../src/NativeStepCounter";
import type { StepCountData } from "../../src/NativeStepCounter";
import traces from "./traces.json";

const output = process.env.STEP_BENCHMARK_JS_OUT;
const records: object[] = [];

for (const scenario of traces.scenarios) {
  test(`filter replay: ${scenario.name}`, () => {
    const events = Array.from({ length: scenario.events }, (_, i) => ({
      counterType: "STEP_COUNTER" as const,
      steps: (i + 1) * scenario.stepEvery,
      startDate: traces.epochMs,
      endDate: traces.epochMs + (i + 1) * 1000,
      distance: (i + 1) * scenario.stepEvery * 0.762,
    }));
    // Batch boundaries affect arrival offsets, never the measurement dates.
    const arrivalOffsets = events.map(
      (_, i) => Math.ceil((i + 1) / scenario.batchSize) * scenario.batchSize * 1000
    );
    const run = () => {
      const filter = createStepCountFilter();
      let accepted = 0;
      let lastSteps = 0;
      const begin = performance.now();
      for (const data of events) {
        const filtered = filter(data);
        if (filtered) {
          accepted++;
          lastSteps = filtered.steps;
        }
      }
      const durationNs = (performance.now() - begin) * 1e6;
      return { accepted, lastSteps, durationNs };
    };
    const warmup = output ? 10 : 1;
    for (let i = 0; i < warmup; i++) run();
    for (let round = 0; round < (output ? 5 : 1); round++) {
      const result = run();
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
      });
    }
    if (scenario.name === "delayed_batches") {
      expect(arrivalOffsets.slice(0, 20)).toEqual(Array(20).fill(20000));
      expect(events[19]!.endDate - events[0]!.endDate).toBe(19000);
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
