# Benchmark fixture implementation

## Steps and ownership

1. Root owns all edits in this workspace: add frozen trace recipes and focused failing tests for result validation, replay outcomes and example controls.
2. Add `tests/benchmarks/` generation, host runners, versioned raw-result validation and JavaScript filter replay.
3. Add a benchmark-only Android JVM test for the real processor and payload getter, keeping production native code unchanged.
4. Add `example/src/benchmark.ts` and minimal `App.tsx` integration for filter timing, React commit observations and logging/render controls.
5. Document Linux commands, raw schema, measurement boundaries and fixed-duration Release/Hermes Android/iOS procedures; link the guide from both READMEs and the existing Android benchmark note.
6. Run relevant regressions, full Jest, `yarn typecheck`, `yarn prepare`, native JVM replay and scoped Trunk checks. Review benchmark/validator and example integration independently if review depth requires it.
7. Commit explicit paths, push, open a PR closing #108, complete current-head CI and hosted reviews, verify final body and operator assignment, then merge under the invoked loop authority.

## Regression and completion checks

Observe the render-off regression against the existing example first.
Exercise the validator with deliberately broken raw files before relying on a valid result.
Verify generated traces are byte-identical across two runs, require exact replay outcomes, and never enforce machine-dependent timing thresholds.
Run `node --test tests/benchmarks/*.node.mjs`, `yarn test`, `yarn typecheck`, `yarn prepare`, and the guide's native benchmark command.
CI must validate and upload both native and JavaScript raw output.
Only one heavy mobile job runs locally at a time, below the machine load gate.
