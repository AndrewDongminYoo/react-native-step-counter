import { BenchmarkSession } from "../benchmark";

test("discards warm-up, expired and post-stop observations and bounds raw storage", () => {
  const session = new BenchmarkSession(100, 10, 20, 2);
  session.observe("js_filter", 109, 111);
  session.observe("js_filter", 110, 111, false);
  session.observe("example_commit", 112, 115, true, 3);
  session.observe("js_filter", 116, 117);
  session.observe("js_filter", 129, 131);
  session.observe("js_filter", NaN, 120);
  session.observe("js_filter", 120, 119);
  expect(session.finish(130)).toEqual({
    records: [
      { stage: "js_filter", durationNs: 1_000_000, accepted: false, coalesced: 0 },
      { stage: "example_commit", durationNs: 3_000_000, accepted: true, coalesced: 3 },
    ],
    omitted: 1,
    windowComplete: true,
  });
  session.observe("js_filter", 118, 119);
  expect(session.finish().records).toHaveLength(2);
});
