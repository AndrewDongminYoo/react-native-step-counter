import assert from "node:assert/strict";
import { test } from "node:test";
import { validateResult } from "./results.mjs";

const valid = () => ({
  schemaVersion: 1,
  environment: "node",
  metadata: {
    commit: "a".repeat(40),
    dirty: false,
    fixtureHash: "b".repeat(64),
    platform: "linux-x64",
    runtime: "Node 22",
    library: "0.5.0",
    reactNative: "0.88.0",
    clock: "performance.now",
    runId: "test",
    createdAt: "2026-11-11T00:00:00.000Z",
  },
  config: { warmup: 2, rounds: 3, logging: false, rendering: false },
  unavailable: ["native_processing", "payload_creation", "native_to_js", "example_commit"],
  records: [
    {
      scenario: "walking",
      stage: "js_filter",
      round: 0,
      operations: 10,
      accepted: 8,
      rejected: 2,
      durationNs: 1000,
    },
  ],
});

test("accepts host microbenchmark results with explicit unavailable stages", () => {
  assert.deepEqual(validateResult(valid()), []);
});

const device = () => ({
  ...valid(),
  environment: "device",
  metadata: { ...valid().metadata, build: "Release", runtime: "Hermes fixture", device: "test" },
  config: { ...valid().config, durationMs: 60000 },
  unavailable: ["native_processing", "payload_creation", "native_to_js"],
  records: [
    {
      scenario: "walking",
      stage: "example_commit",
      round: 0,
      operations: 1,
      accepted: 1,
      rejected: 0,
      coalesced: 2,
      durationNs: 1000,
    },
  ],
  observations: [
    {
      scenario: "walking",
      stage: "example_commit",
      round: 0,
      durationNs: 1000,
      accepted: true,
      coalesced: 2,
    },
  ],
});
test("accepts consistent device aggregates and observations", () =>
  assert.deepEqual(validateResult(device()), []));
for (const [name, mutate] of [
  [
    "invalid device window",
    (r) => {
      r.config.durationMs = -1;
    },
  ],
  [
    "negative observation",
    (r) => {
      r.observations[0].durationNs = -1;
    },
  ],
  [
    "negative coalescing",
    (r) => {
      r.records[0].coalesced = -1;
    },
  ],
  [
    "missing observations",
    (r) => {
      delete r.observations;
    },
  ],
  [
    "inconsistent aggregates",
    (r) => {
      r.records[0].durationNs = 999;
    },
  ],
])
  test(`rejects ${name}`, () => {
    const r = device();
    mutate(r);
    assert.notDeepEqual(validateResult(r), []);
  });

for (const [name, mutate] of [
  [
    "missing metadata",
    (r) => {
      delete r.metadata.commit;
    },
  ],
  [
    "wrong revision",
    (r) => {
      r.schemaVersion = 2;
    },
  ],
  [
    "nonfinite timing",
    (r) => {
      r.records[0].durationNs = Infinity;
    },
  ],
  [
    "negative timing",
    (r) => {
      r.records[0].durationNs = -1;
    },
  ],
  [
    "count mismatch",
    (r) => {
      r.records[0].accepted = 9;
    },
  ],
  [
    "fabricated delivery",
    (r) => {
      r.records[0].stage = "native_to_js";
    },
  ],
  [
    "empty records",
    (r) => {
      r.records = [];
    },
  ],
  [
    "duplicate row",
    (r) => {
      r.records.push({ ...r.records[0] });
    },
  ],
  [
    "missing unavailable",
    (r) => {
      r.unavailable = [];
    },
  ],
  [
    "unsupported scenario",
    (r) => {
      r.records[0].scenario = "unknown";
    },
  ],
  [
    "non-array unavailable",
    (r) => {
      r.unavailable = {};
    },
  ],
  [
    "prototype environment",
    (r) => {
      r.environment = "constructor";
    },
  ],
  [
    "Debug device claim",
    (r) => {
      r.environment = "device";
      r.metadata.build = "Debug";
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const result = valid();
    mutate(result);
    assert.notDeepEqual(validateResult(result), []);
  });
}
