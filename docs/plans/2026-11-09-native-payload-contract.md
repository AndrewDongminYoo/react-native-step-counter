# Native payload contract implementation plan

## Entry and completion

Implement [the proposed contract](../specs/2026-11-09-native-payload-contract.md) after its compatibility decision is approved.
Use the current workspace, based on `4eaa364434edde5dba79d48d198134be5dd18ef8`, and proposed branch `fix/94-native-payload-contract`.
No additional worktree is necessary.
The root agent owns all edits, staging, commits, and final verification.

## Ordered steps

1. Record the operator's decision and scoped Oracle result, refresh the clean workspace and base, then create the task branch.
2. Add failing TypeScript regressions in `src/__tests__/index.test.ts` for raw null metrics, formatter output, filter availability transitions, rejected bursts across gaps, and unchanged chronology.
   Observe failures against the current implementation before changing behavior.
   Add a compile fixture for guarded nullable metric use and canonical CounterType values.
3. Update `src/NativeStepCounter.ts` and `src/index.tsx` with the approved nullable contract and minimal internal distance bookkeeping.
   Keep step cadence independent of metric availability and preserve all public exports.
4. Update only discriminator literals and matching comments in `android/src/main/java/com/stepcounter/services/StepCounterService.kt` and `AccelerometerService.kt`.
   Extend `android/src/test/java/com/stepcounter/services/StepCounterServiceTest.kt` or add a focused fallback payload fixture to exercise actual payload creation.
   Observe a discriminator failure before updating the producers.
5. Add a native iOS dictionary fixture for the existing producer in `ios/StepCounter.mm`, through the internal Foundation serializer used by the Core Motion adapter.
   The example has no test target; compile the focused Objective-C++ fixture with Foundation and run it in `.github/workflows/native-ios.yml`, avoiding an unrelated application test-target setup.
   Extract the existing mapping into a private inline helper without changing its output.
   Do not report a source-text assertion as execution of the native producer.
6. Update `README.md` and `README.kr.md` with guarded consumer examples, nullable floor availability, canonical values, formatter output, and filter correction limits.
   Inspect `example/src/App.tsx` consumers and adjust only code that fails under nullable typing.
   Inspect governing instructions and existing generated-document tooling before choosing whether source regeneration is required.
7. Run `yarn test`, `yarn typecheck`, `yarn prepare`, and `yarn pack --dry-run`.
   Run scoped Trunk checks with explicit changed paths.
   Run Android native tests using the command declared in `.github/workflows/native-android.yml`; run the new iOS fixture and require Android/iOS example CI builds on the PR head.
   Check machine load before local native jobs and run only one heavy mobile job at a time.
8. Perform structured local review of the full candidate, contract omissions, null transitions, generated declarations, native fixtures, and README claims.
   Calibrate review depth from the actual diff; use independent review only where required and permitted.
   Record test results and limitations, then continue the authorized commit, push, hosted-review, assignment, gated merge, and state-retirement stages.

## Limits

Implementation is authorized by the operator; record actual gate evidence in the loop state.
The native serializer fixture covers mapping and JSON serialization; it does not measure Core Motion delivery on a device.
No physical-device installation, release, version change, memory write, or branch deletion is requested.
Record hosted review deadline and round budget before the first trigger; do not inherit #118 review signals.

## Generated documentation

The existing `jsdoc-config.json` reads the built `lib/` JavaScript and English README.
Regenerate with JSDoc 3.6.11, tsd-jsdoc 2.5.0, and postman-jsdoc-theme 0.0.3 installed in a temporary tooling directory; these are not new package dependencies.
Use the existing configuration with absolute temporary plugin/template paths and a temporary destination, copy only the five generated HTML pages, then format those explicit paths with the existing Prettier.
Leave theme scripts and styles untouched.
The generated HTML remains API reference material; it does not add a new product interface.
