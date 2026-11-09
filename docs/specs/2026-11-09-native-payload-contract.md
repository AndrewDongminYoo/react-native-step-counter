# Native step payload contract

## Problem and sources

Issue [#94](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/94) is the next selected P1 task after #118.
The three primary sources are the issue, `src/NativeStepCounter.ts`, and the native payload producers in `ios/StepCounter.mm` and `android/src/main/java/com/stepcounter/services/`.
Android emits `Step Counter` and `Accelerometer`, although the public union declares `STEP_COUNTER` and `ACCELEROMETER`.
iOS emits null for unavailable metrics, although the public distance type requires a number and `parseStepData` calls `toFixed` directly.
The #118 filter compensates by substituting zero or the previous distance; that does not repair the raw contract or formatter.

## Proposed direction requiring approval

Represent unavailable measurements explicitly: `distance: number | null`, `floorsAscended?: number | null`, and `floorsDescended?: number | null`.
Keep field names, exports, callback signatures, and available numeric measurements unchanged.
Keep absent Android floor fields absent and preserve iOS null values.
Emit canonical Android discriminator values matching the existing public union.

Preserve unavailable distance through the filter instead of publishing zero or a carried measurement as the current distance.
Continue evaluating step cadence when distance is unavailable.
Validate a present distance as finite and nonnegative; missing or null optional floor fields remain valid.
Retain chronological and step monotonicity rules from #118.
Compare available distances against the last known raw distance within one identity; clear that state at the existing session/backend boundaries.
Subtract only observed positive distance increments associated with rejected bursts when both adjacent raw distances are available.
Do not infer a distance increment across an unavailable interval or attribute it to rejected steps; document that distance correction is incomplete across such gaps.
Known accumulated distance corrections may still apply when a numeric measurement returns.

Format unavailable distance as `N/A` while preserving the string return type and current formatting for numeric distances.
This is a formatter value change, with no proposed layout, style, animation, or image change.
If implementation changes rendered appearance beyond this text value, obtain visual approval before merge.

The nullable type widening can fail strict consumer builds that use distance without a guard.
Both READMEs must include migration examples using `distance === null` and explain filtered availability and correction limits.
Consumers comparing undocumented Android display labels must migrate to the declared canonical values.
No version bump or publication is included; release policy remains a separate decision.

## Scope and non-goals

Change TypeScript typing, filtering, formatting, Android discriminator literals, relevant tests, and both READMEs.
Use actual native payload producers in native contract checks; JavaScript mocks alone cannot prove native conformance.
Do not change iOS session interval semantics (#93), callback lifetime (#92), subscription ownership (#95), native event architecture (#101), thresholds, dependencies, versions, or generated documentation by hand.

## Acceptance criteria

- Actual Android hardware and fallback payloads emit the declared canonical discriminators.
- An actual iOS dictionary fixture covers available and null distance/floors; Android fixtures cover omitted floors.
- Raw callbacks, the filter, and the formatter accept unavailable iOS metrics without casts or crashes.
- The filter preserves steps and null distance across first, middle, rejected-burst, resumed-distance, and session/backend-boundary cases.
- Existing chronology and cumulative-batch regressions remain green, with only explicitly superseded numeric fallback assertions updated.
- Public declarations compile guarded consumer examples and reject unguarded numeric use of nullable distance.
- Both READMEs describe availability, migration, canonical discriminators, and distance correction limits accurately.
- Root tests, typecheck, distributable build, package inspection, scoped lint checks, and affected native checks pass before review readiness.

## Approval boundary

Status: approved by the operator ("네, 좋습니다. 진행해주세요.") for nullable public metrics and null-preserving filtered output.
The pr-loop invocation authorizes the lifecycle but does not resolve this compatibility choice.

## Retrieved precedent

Personal Oracle retrieval at source commit `dd6c39094cd04fe2af9cebcffff012147e9d9f17` confirms the declared canonical sensor strings in `wiki/concepts/counter-type-discriminator-for-multi-sensor-pedometer.md` and unavailable iOS floors in `raw/sources/react-native-step-counter/README.md`.
These support canonical strings and distinguishing unavailable metrics from measured zero.
The retrieved English README still describes distance as numeric, confirming that nullable distance needs an explicit migration decision.
`[no precedent found]` No retrieved source directly decides nullable iOS distance versus numeric fallback.
`[PARTIAL]` Only four of eight linked original sources were returned, and freshness against the current wiki head is unverified.
