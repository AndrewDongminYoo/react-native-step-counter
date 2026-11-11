import { readFileSync, writeFileSync } from "node:fs";
import { validateResult } from "./results.mjs";

const [captureFile, metadataFile, output] = process.argv.slice(2);
if (!output)
  throw new Error("Usage: node tests/benchmarks/device.mjs capture.log metadata.json result.json");
const capture = readFileSync(captureFile, "utf8")
  .split("\n")
  .filter((line) => line.includes("STEP_BENCHMARK "))
  .map((line) => JSON.parse(line.slice(line.indexOf("STEP_BENCHMARK ") + 15)));
const first = capture[0];
const last = capture.at(-1);
const observations = capture.slice(1, -1);
if (
  first?.type !== "start" ||
  last?.type !== "end" ||
  observations.some((o) => o.type !== "observation") ||
  last.count !== observations.length ||
  last.omitted !== 0 ||
  last.windowComplete !== true
)
  throw new Error("Incomplete, truncated or multiple capture windows");
const { scenario, metadata } = JSON.parse(readFileSync(metadataFile, "utf8"));
const records = [];
for (const stage of ["js_filter", "example_commit"]) {
  const rows = observations.filter((o) => o.stage === stage);
  if (!rows.length) continue;
  if (
    rows.some(
      (o) =>
        !Number.isFinite(o.durationNs) ||
        o.durationNs < 0 ||
        typeof o.accepted !== "boolean" ||
        !Number.isSafeInteger(o.coalesced) ||
        o.coalesced < 0
    )
  )
    throw new Error("Invalid observation");
  records.push({
    scenario,
    stage,
    round: 0,
    operations: rows.length,
    accepted: rows.filter((o) => o.accepted).length,
    rejected: rows.filter((o) => !o.accepted).length,
    durationNs: rows.reduce((sum, o) => sum + o.durationNs, 0),
    coalesced: rows.reduce((sum, o) => sum + o.coalesced, 0),
  });
}
if (observations.some((o) => !["js_filter", "example_commit"].includes(o.stage)))
  throw new Error("Unknown observation stage");
const result = {
  schemaVersion: 1,
  environment: "device",
  capture: {
    scenario,
    windowComplete: last.windowComplete,
    count: last.count,
    omitted: last.omitted,
  },
  metadata,
  config: {
    warmup: first.warmupMs,
    durationMs: first.durationMs,
    rounds: 1,
    logging: first.logging,
    rendering: first.rendering,
  },
  unavailable: [
    "native_processing",
    "payload_creation",
    "native_to_js",
    ...(!observations.some((o) => o.stage === "js_filter") ? ["js_filter"] : []),
    ...(!first.rendering || !observations.some((o) => o.stage === "example_commit")
      ? ["example_commit"]
      : []),
  ],
  records,
  observations: observations.map((item) => ({ ...item, scenario, round: 0 })),
};
const errors = validateResult(result);
if (errors.length) throw new Error(errors.join("; "));
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(`Validated ${output}`);
