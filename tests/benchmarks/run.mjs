import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureHash, generate } from "./generate.mjs";
import { validateResult } from "./results.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [environment, destination] = process.argv.slice(2);
if (!["node", "jvm"].includes(environment) || !destination)
  throw new Error("Usage: node tests/benchmarks/run.mjs node|jvm output-directory");
const out = resolve(destination);
mkdirSync(out, { recursive: true });
const raw = resolve(out, `${environment}-records.json`);
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const metadata = {
  commit: git("rev-parse", "HEAD"),
  dirty: git("status", "--porcelain").length > 0,
  fixtureHash,
  platform: `${platform()}-${arch()} ${release()}`,
  runtime: environment === "node" ? process.version : "pending JVM result",
  library: JSON.parse(readFileSync(resolve(root, "package.json"))).version,
  reactNative: JSON.parse(readFileSync(resolve(root, "node_modules/react-native/package.json")))
    .version,
  clock: environment === "node" ? "node:perf_hooks performance.now" : "System.nanoTime",
  runId: `${environment}-${Date.now()}`,
  createdAt: new Date().toISOString(),
};
if (environment === "jvm") {
  generate(resolve(out, "traces"));
  execFileSync(
    "./gradlew",
    [
      ":react-native-step-counter-newarch:testDebugUnitTest",
      "--tests",
      "com.stepcounter.services.BenchmarkFixtureTest",
      "--rerun-tasks",
      "--no-daemon",
      "--console=plain",
      "-PreactNativeArchitectures=arm64-v8a",
    ],
    {
      cwd: resolve(root, "example/android"),
      stdio: "inherit",
      env: {
        ...process.env,
        STEP_BENCHMARK_FIXTURES: resolve(out, "traces"),
        STEP_BENCHMARK_NATIVE_OUT: raw,
      },
    }
  );
  metadata.runtime = readFileSync(`${raw}.runtime.txt`, "utf8").trim();
} else {
  execFileSync("yarn", ["test", "--runTestsByPath", "tests/benchmarks/replay.test.ts"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, STEP_BENCHMARK_JS_OUT: raw },
  });
}
const result = {
  schemaVersion: 1,
  environment,
  metadata,
  config: { warmup: 10, rounds: 5, logging: false, rendering: false },
  unavailable:
    environment === "node"
      ? ["native_processing", "payload_creation", "native_to_js", "example_commit"]
      : ["native_to_js", "js_filter", "example_commit"],
  records: JSON.parse(readFileSync(raw, "utf8")),
};
const errors = validateResult(result);
if (errors.length) throw new Error(errors.join("; "));
if (result.records.length !== (environment === "node" ? 25 : 50))
  throw new Error("Incomplete replay rounds");
const file = resolve(out, `${environment}-result.json`);
writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
console.log(`Validated ${file}`);
