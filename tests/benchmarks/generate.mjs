import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const recipeBytes = readFileSync(new URL("./traces.json", import.meta.url));
export const recipe = JSON.parse(recipeBytes);
export const fixtureHash = createHash("sha256")
  .update(recipeBytes)
  .update(readFileSync(fileURLToPath(import.meta.url)))
  .digest("hex");

export function generate(directory) {
  mkdirSync(directory, { recursive: true });
  for (const scenario of recipe.scenarios) {
    const lines = [];
    for (let i = 0; i < scenario.samples; i++) {
      const rotation = scenario.pattern === "rotation";
      const x = rotation ? Math.fround(9.8 * Math.sin(i * 0.2)) : 0;
      const z = rotation
        ? Math.fround(9.8 * Math.cos(i * 0.2))
        : Math.fround(scenario.pattern === "walking" && i >= 60 && i % 30 === 0 ? 30 : 9.8);
      lines.push(`${i * recipe.samplePeriodNs},${x},0,${z}`);
    }
    writeFileSync(resolve(directory, `${scenario.name}.csv`), lines.join("\n") + "\n");
  }
  writeFileSync(resolve(directory, "fixtures.sha256"), fixtureHash + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3)
    throw new Error("Usage: node tests/benchmarks/generate.mjs output-directory");
  generate(resolve(process.argv[2]));
}
