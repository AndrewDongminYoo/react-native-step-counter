import { deliverBatches } from "./deliver";
import { createStepCountFilter } from "../../src";
import type { StepCountData } from "../../src/NativeStepCounter";

test("queued batches preserve delayed measurement dates through the real filter", async () => {
  const events: StepCountData[] = [1, 2, 3].map((steps) => ({
    counterType: "STEP_COUNTER",
    steps,
    distance: steps,
    startDate: 1700000000000,
    endDate: 1700000000000 + steps * 1000,
  }));
  const filter = createStepCountFilter();
  const deliveries: number[][] = [];
  const accepted: number[] = [];
  const replay = deliverBatches(events, 2, (batch) => {
    deliveries.push(batch.map((data) => data.endDate));
    for (const data of batch) {
      const result = filter(data);
      if (result) accepted.push(result.steps);
    }
  });
  expect(deliveries).toEqual([]);
  await replay;
  expect(deliveries).toEqual([[1700000001000, 1700000002000], [1700000003000]]);
  expect(accepted).toEqual([1, 2, 3]);
});
