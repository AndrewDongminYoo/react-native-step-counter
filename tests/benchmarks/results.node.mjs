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
test("accepts complete no-event device evidence without inventing timing rows", () => {
  const empty = {
    ...device(),
    config: { ...device().config, rounds: 1 },
    records: [],
    observations: [],
    capture: { scenario: "stationary", windowComplete: true, count: 0, omitted: 0 },
    unavailable: [
      "native_processing",
      "payload_creation",
      "native_to_js",
      "js_filter",
      "example_commit",
    ],
  };
  assert.deepEqual(validateResult(empty), []);
  for (const patch of [
    { capture: undefined },
    { capture: { ...empty.capture, windowComplete: false } },
    { capture: { ...empty.capture, count: 1 } },
    { capture: { ...empty.capture, omitted: 1 } },
    { observations: undefined },
    { unavailable: empty.unavailable.filter((s) => s !== "js_filter") },
    { environment: "node" },
  ])
    assert.ok(validateResult({ ...empty, ...patch }).includes("Empty records"));
  assert.ok(
    validateResult({ ...empty, capture: { ...empty.capture, scenario: "unknown" } }).includes(
      "Invalid capture summary"
    )
  );
});
const expectedErrors = {
  "invalid device window": "Invalid device durationMs",
  "negative observation": "Invalid observation values",
  "negative coalescing": "Invalid coalesced count",
  "missing observations": "Missing observations",
  "inconsistent aggregates": "Observation aggregate mismatch",
  "Debug device claim": "Device measurements require Release/Hermes metadata",
  "missing metadata": "Invalid commit",
  "wrong revision": "Unsupported schemaVersion",
  "nonfinite timing": "Invalid durationNs",
  "negative timing": "Invalid durationNs",
  "count mismatch": "Count mismatch",
  "fabricated delivery": "Stage is unavailable in this environment",
  "empty records": "Empty records",
  "duplicate row": "Duplicate record",
  "missing unavailable": "Must declare native_processing unavailable",
  "unsupported scenario": "Unknown scenario",
  "non-array unavailable": "Invalid unavailable stages",
  "prototype environment": "Unknown environment",
};
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
  [
    "Debug device claim",
    (r) => {
      r.metadata.build = "Debug";
    },
  ],
])
  test(`rejects ${name}`, () => {
    const r = device();
    mutate(r);
    assert.ok(validateResult(r).includes(expectedErrors[name]));
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
]) {
  test(`rejects ${name}`, () => {
    const result = valid();
    mutate(result);
    assert.ok(validateResult(result).includes(expectedErrors[name]));
  });
}
