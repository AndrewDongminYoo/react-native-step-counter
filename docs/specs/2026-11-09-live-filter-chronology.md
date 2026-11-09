# Live filter chronology

## Contract

Issue [#98](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/98) requires valid cumulative batches to survive filtering while stale events cannot corrupt totals.
The primary sources are the issue, `src/index.tsx`, and the measurement-time contract in `2026-11-09-android-sensor-timestamps.md`.

Evaluate cadence against elapsed measurement time since `startDate`, using the cumulative total after previously demonstrated impossible steps have been removed.
A short interval between cumulative reports alone does not demonstrate false steps.
Keep rejection and distance rebasing for totals that exceed the session's configured cadence budget.
This conservative test cannot distinguish false steps hidden by earlier idle time from legitimate batches.

Reject nonfinite, negative, or fractional step totals, nonfinite or reversed dates, and nonfinite or negative distances before state mutation.
Within one session/backend, ignore duplicate or backwards end dates and decreasing steps or distances without resetting the baseline.
Use a snapshot so caller mutations cannot change internal state.

A newer `startDate` starts a new session and clears adjustments.
An older `startDate` is stale.
A backend change at the same start date requires a newer end date, clears adjustments, and retires the preceding backend until the next session.
Do not reinterpret a same-session counter decrease as an implicit reset: callers must create a fresh filter for a restart with indistinguishable identity, including a repeated start date/backend.
Explicit boundaries may start a smaller total; accepted totals within one identity cannot regress.

## Acceptance and limits

- The raw 10 at +10000 ms, 20 at +10010 ms, 21 at +11000 ms fixture retains all 21 steps.
- Initial impossible rotation-like bursts remain rejected and rebased.
- Tests cover batched and immediate measurements, duplicates/reordering, invalid dates/distances, session/backend transitions, counter resets, and caller mutation.
- `yarn test`, `yarn typecheck`, `yarn prepare`, `yarn pack --dry-run`, and scoped Trunk checks pass.
- Public signatures, native code, thresholds, dependencies, and versions stay unchanged.
- No UI appearance changes or device accuracy claims; native device verification is outside this TypeScript-only change.
