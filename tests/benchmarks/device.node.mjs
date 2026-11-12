import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixtureHash, generate } from "./generate.mjs";

test("trace generation is byte-reproducible", () => {
  const dir = mkdtempSync(join(tmpdir(), "step-traces-"));
  generate(join(dir, "a"));
  generate(join(dir, "b"));
  for (const file of [
    "stationary.csv",
    "walking.csv",
    "rapid_rotation.csv",
    "delayed_batches.csv",
    "long_teardown.csv",
    "fixtures.sha256",
  ]) {
    assert.deepEqual(readFileSync(join(dir, "a", file)), readFileSync(join(dir, "b", file)));
  }
  assert.equal(
    readFileSync(join(dir, "a", "walking.csv"), "utf8").split("\n")[60],
    "1200000000,0,0,30"
  );
});

test("device capture retains observations and rejects missing/truncated windows", () => {
  const dir = mkdtempSync(join(tmpdir(), "step-device-"));
  const meta = join(dir, "metadata.json"),
    capture = join(dir, "capture.log"),
    out = join(dir, "result.json");
  writeFileSync(
    meta,
    JSON.stringify({
      scenario: "walking",
      metadata: {
        commit: "a".repeat(40),
        dirty: false,
        fixtureHash,
        platform: "android 36",
        device: "fixture",
        runtime: "Hermes fixture",
        build: "Release",
        library: "0.5.0",
        reactNative: "0.88.0",
        clock: "JS performance.now",
        runId: "test",
        createdAt: "2026-11-11T00:00:00.000Z",
      },
    })
  );
  const rows = [
    { type: "start", warmupMs: 10000, durationMs: 60000, logging: false, rendering: true },
    { type: "observation", stage: "js_filter", durationNs: 100, accepted: true, coalesced: 0 },
    { type: "observation", stage: "example_commit", durationNs: 200, accepted: true, coalesced: 2 },
    { type: "end", count: 2, omitted: 0, windowComplete: true },
  ];
  const write = (values) =>
    writeFileSync(
      capture,
      values.map((row) => "log prefix STEP_BENCHMARK " + JSON.stringify(row)).join("\n")
    );
  const args = ["tests/benchmarks/device.mjs", capture, meta, out];
  write(rows);
  execFileSync(process.execPath, args);
  const result = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(result.records[1].coalesced, 2);
  assert.equal(result.observations.length, 2);
  write([rows[0], { ...rows.at(-1), count: 0 }]);
  execFileSync(process.execPath, args);
  const empty = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(empty.records, []);
  assert.deepEqual(empty.observations, []);
  assert.deepEqual(empty.capture, {
    scenario: "walking",
    windowComplete: true,
    count: 0,
    omitted: 0,
  });
  assert.ok(empty.unavailable.includes("js_filter"));
  assert.ok(empty.unavailable.includes("example_commit"));
  execFileSync(process.execPath, ["tests/benchmarks/results.mjs", out]);
  for (const broken of [
    rows.slice(0, -1),
    [...rows, ...rows],
    [...rows.slice(0, -1), { ...rows.at(-1), omitted: 1 }],
    [...rows.slice(0, -1), { ...rows.at(-1), windowComplete: false }],
    [...rows.slice(0, -1), { ...rows.at(-1), count: 3 }],
    [...rows.slice(0, -1), { ...rows.at(-1), windowComplete: "true" }],
    [{ ...rows[0], durationMs: -60000 }, ...rows.slice(1)],
  ]) {
    write(broken);
    assert.notEqual(spawnSync(process.execPath, args).status, 0);
  }
});
