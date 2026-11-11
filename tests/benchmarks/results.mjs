import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const stages = [
  "native_processing",
  "payload_creation",
  "native_to_js",
  "js_filter",
  "example_commit",
];
const scenarios = ["stationary", "walking", "rapid_rotation", "delayed_batches", "long_teardown"];
const integer = (n) => Number.isSafeInteger(n) && n >= 0;

export function validateResult(result) {
  const errors = [];
  const require = (condition, message) => {
    if (!condition) errors.push(message);
  };
  if (!result || typeof result !== "object") return ["Expected result object"];
  require(result.schemaVersion === 1, "Unsupported schemaVersion");
  const environments = {
    node: ["js_filter"],
    jvm: ["native_processing", "payload_creation"],
    device: stages,
  };
  const allowed = Object.hasOwn(environments, result.environment)
    ? environments[result.environment]
    : [];
  require(allowed.length > 0, "Unknown environment");
  const meta = result.metadata ?? {};
  require(/^[a-f0-9]{40}$/.test(meta.commit ?? ""), "Invalid commit");
  require(/^[a-f0-9]{64}$/.test(meta.fixtureHash ?? ""), "Invalid fixtureHash");
  require(typeof meta.dirty === "boolean", "Missing dirty flag");
  for (const key of [
    "platform",
    "runtime",
    "library",
    "reactNative",
    "clock",
    "runId",
    "createdAt",
  ]) {
    require(typeof meta[key] === "string" &&
      meta[key].trim().length > 0, `Missing metadata.${key}`);
  }
  require(Number.isFinite(Date.parse(meta.createdAt)), "Invalid createdAt");
  if (result.environment === "device") {
    require(meta.build === "Release" &&
      typeof meta.runtime === "string" &&
      meta.runtime.startsWith("Hermes "), "Device measurements require Release/Hermes metadata");
    require(typeof meta.device === "string" && meta.device.length > 0, "Missing device model");
  }
  const config = result.config ?? {};
  require(integer(config.warmup) && config.warmup > 0, "Invalid warmup");
  require(integer(config.rounds) && config.rounds > 0, "Invalid rounds");
  if (result.environment === "device")
    require(integer(config.durationMs) && config.durationMs > 0, "Invalid device durationMs");
  require(typeof config.logging === "boolean" &&
    typeof config.rendering === "boolean", "Missing controls");
  const unavailable = Array.isArray(result.unavailable) ? result.unavailable : [];
  require(Array.isArray(result.unavailable) &&
    unavailable.every((s) => stages.includes(s)) &&
    new Set(unavailable).size === unavailable.length, "Invalid unavailable stages");
  for (const stage of stages.filter((s) => !allowed?.includes(s))) {
    require(unavailable?.includes(stage), `Must declare ${stage} unavailable`);
  }
  const capture = result.capture;
  if (capture !== undefined) {
    require(result.environment === "device" &&
      config.rounds === 1 &&
      capture?.windowComplete === true &&
      scenarios.includes(capture.scenario) &&
      integer(capture.count) &&
      capture.omitted === 0 &&
      Array.isArray(result.observations) &&
      capture.count === result.observations.length, "Invalid capture summary");
    require(!Array.isArray(result.records) ||
      result.records.every(
        (row) => row?.scenario === capture?.scenario
      ), "Capture scenario mismatch");
  }
  if (!Array.isArray(result.records) || result.records.length === 0) {
    const completeEmptyCapture =
      result.environment === "device" &&
      config.rounds === 1 &&
      Array.isArray(result.records) &&
      capture?.windowComplete === true &&
      capture.count === 0 &&
      capture.omitted === 0 &&
      Array.isArray(result.observations) &&
      result.observations.length === 0 &&
      stages.every((stage) => unavailable.includes(stage));
    return completeEmptyCapture ? errors : [...errors, "Empty records"];
  }
  const seen = new Set();
  for (const row of result.records) {
    if (!row || typeof row !== "object") {
      errors.push("Invalid record");
      continue;
    }
    require(scenarios.includes(row.scenario), "Unknown scenario");
    require(allowed?.includes(row.stage) &&
      !unavailable?.includes(row.stage), "Stage is unavailable in this environment");
    require(integer(row.round) && row.round < config.rounds, "Invalid round");
    require(integer(row.operations) && row.operations > 0, "Invalid operations");
    require(integer(row.accepted) &&
      integer(row.rejected) &&
      row.accepted + row.rejected === row.operations, "Count mismatch");
    require(Number.isFinite(row.durationNs) && row.durationNs >= 0, "Invalid durationNs");
    if (row.stage === "example_commit" || row.coalesced !== undefined)
      require(integer(row.coalesced), "Invalid coalesced count");
    const key = `${row.scenario}/${row.stage}/${row.round}`;
    require(!seen.has(key), "Duplicate record");
    seen.add(key);
  }
  const observationStages = ["js_filter", "example_commit"];
  const deviceRows =
    result.environment === "device"
      ? result.records.filter((row) => row && observationStages.includes(row.stage))
      : [];
  if (deviceRows.length || result.observations !== undefined) {
    if (!Array.isArray(result.observations)) return [...errors, "Missing observations"];
    const summaries = new Map();
    for (const item of result.observations) {
      if (!item || typeof item !== "object") {
        errors.push("Invalid observation");
        continue;
      }
      require(observationStages.includes(item.stage) &&
        scenarios.includes(item.scenario) &&
        integer(item.round), "Invalid observation identity");
      require(integer(item.durationNs) &&
        typeof item.accepted === "boolean" &&
        integer(item.coalesced), "Invalid observation values");
      require(item.stage !== "js_filter" ||
        item.coalesced === 0, "Filter observation cannot coalesce");
      const key = `${item.scenario}/${item.stage}/${item.round}`;
      require(seen.has(key), "Observation without aggregate");
      const total = summaries.get(key) ?? {
        operations: 0,
        accepted: 0,
        durationNs: 0,
        coalesced: 0,
      };
      total.operations++;
      if (item.accepted) total.accepted++;
      total.durationNs += item.durationNs;
      total.coalesced += item.coalesced;
      summaries.set(key, total);
    }
    for (const row of deviceRows) {
      const total = summaries.get(`${row.scenario}/${row.stage}/${row.round}`);
      require(!!total &&
        total.operations === row.operations &&
        total.accepted === row.accepted &&
        total.durationNs === row.durationNs &&
        total.coalesced === (row.coalesced ?? 0), "Observation aggregate mismatch");
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length < 3)
    throw new Error("Usage: node tests/benchmarks/results.mjs result.json [...]");
  for (const file of process.argv.slice(2)) {
    const errors = validateResult(JSON.parse(readFileSync(file, "utf8")));
    if (errors.length) throw new Error(`${file}: ${errors.join("; ")}`);
    console.log(`${file}: valid schema v1`);
  }
}
