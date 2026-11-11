# Release device measurement plan

Contract: [Release device baselines](../specs/2026-11-11-release-device-baselines.md).
Primary procedure: [benchmarking](../benchmarking.md).
Root owns measurement configuration, evidence, documentation, Git operations and final verification in the current workspace.

## Preparation and prerequisites

1. Verify the personal repository/account, clean tree, current base and existing #108 harness. Reuse its commands and schema.
2. Run `node --test tests/benchmarks/*.node.mjs` to check reproducibility, complete-window conversion and malformed-result rejection. This validates capture tooling, not physical performance.
3. Inventory physical devices without installing or launching. Obtain Android hardware-counter and fallback coverage plus an iOS device; record missing backends as blockers. Obtain per-action daily-iPhone authorization only after the exact build/action is reviewable.
4. Freeze a comparison manifest with baseline/candidate SHAs, exact processor/configuration patches, toolchain versions and expected backend evidence. Review instrumentation equivalence and counting behavior before building. Record unchanged hardware-counter/iOS controls separately.

## Capture and analysis

1. Follow the existing Release/Hermes build and capture commands. Run one heavy mobile job at a time after checking load against core count. Verify the installed build, runtime and backend before accepting a capture.
2. Create a visible evidence directory outside the checkout: `../pr-loop-reviews/react-native-step-counter/issue-109-<run-id>/`. Give each backend/scenario/configuration/variant/repetition its own directory; retain metadata, build logs, raw capture, platform traces, patch and validated result together.
3. Execute all five scenarios with `(logging, rendering)` set to `(false, false)`, `(false, true)` and `(true, true)`. Use five fresh-process runs per cell and variant, 10 seconds warm-up and 60 seconds observation, alternating AB/BA. Keep physical movement and ground truth comparable; record actual counts rather than assigning synthetic expected counts to a walk.
4. Validate every export with `node tests/benchmarks/device.mjs capture.log metadata.json device-result.json` and `node tests/benchmarks/results.mjs device-result.json`. Preserve invalid captures and rerun them with a recorded reason. Capture native processing/delivery separately with same-clock trace correlation; leave unavailable measurements explicit.
5. Trace 10 seconds after stop and verify restart ownership. Run separate long-duration memory/energy scenarios; record their duration, sampling and thermal conditions. Measure clean build time with identical declared cache boundaries and binary size for the same packaging/ABI/signing conditions.
6. Produce a report linking all raw runs, metric denominators, p50/p95/p99, per-run variability, accuracy, exclusions and `[UNKNOWN]` fields. Make no causal performance claim from incomparable or unmeasured cells.

## Verification and PR gates

Review the entire evidence matrix against the contract, including missing results, unchanged controls and clock-correlation limits.
For documentation-only changes, check explicit paths with project Markdown/format checks and `git diff --check`; do not add tests that mirror prose.
If instrumentation code changes become necessary, add focused failing coverage, run affected Jest/TypeScript/native checks, and inspect applicable README/instruction claims in the same PR.
Complete local review, scoped commits, PR, current-head CI/hosted review and operator assignment before delegated merge.
Do not publish a preparation-only PR as completed device measurement or use a closing keyword for #109 without its raw evidence.

## Initial availability, 2026-11-11

- Base: `4c0ef0feeb1b06eef17ad20a296c258962f0a081`, matching fetched `origin/main` during preparation.
- `adb devices -l`: no attached Android devices.
- `xcrun devicectl list devices`: paired physical daily iPhone 16 Pro and a simulated iPhone 17. No device write performed.
- Capture/validator checks: 22 passed, zero failed. These include negative fixtures; no real device capture or performance result exists yet.
- Measurement is waiting for physical-device availability and any applicable per-action device authorization. No production instrumentation, build, installation or architecture change has been made.

## Operator correction after initial iOS captures

The first complete window retained 21 JS filter observations; the operator reported 22 physical steps, phone in hand and screen on.
The second fresh-process window completed with zero observations despite operator-confirmed walking; retain this result without assigning a cause.
Pause further wired walking runs at the operator's request.
Restore logging/rendering defaults and keep the progress display, buttons and log panel.
Add focused failing UI tests before changing session status: active before any event, explicit benchmark START, warm-up/countdown, no-event completion, early stop and visible fatal errors.
Implement the countdown in its own component so its ticks do not rerender the entire example or enter the filter timing interval.
Run full Jest, TypeScript, package build and scoped format/lint checks, then inspect rendered evidence and prepare the replacement build before requesting the distinct daily-iPhone installation action.
Retain source/patch identities so the earlier UI-off captures are not compared directly with this UI-on status build.
