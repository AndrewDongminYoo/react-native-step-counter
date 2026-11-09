# iOS Live Session Intervals

## Problem and scope

Issue #93 reports live steps with a historical baseline removed while distance, floors, and dates still describe the original cumulative range.
Preserve the catch-up protection documented in CHANGELOG.md and the generation/queue ownership from #92.
Keep public signatures, Android behavior, and historical-query mapping unchanged.

## Contract

- Normalize the requested origin as before, clamping future dates to the call time.
- Query cumulative values from that origin to the call time and subtract every available baseline from subsequent live values.
- Emit the baseline cutoff as `startDate`, with the sample measurement `endDate`; discard windows ending before the cutoff.
- Missing baseline or current distance/floor metrics produce `null`, including a metric that becomes available after an unknown baseline.
- On query error or missing data, establish all baselines from the first valid live sample, use its end date as the cutoff, and emit nothing for that sample.
- Ignore early updates until the baseline query completes, duplicate or zero-step deltas, older end dates, and downward corrections without rebasing cumulative counters.
- Require all available deltas to be nonnegative and no smaller than their last emitted values, so correction recovery cannot create a catch-up jump.
- Historical queries continue to return the original interval and cumulative metrics without live-session adjustment.

## Acceptance and limits

Native tests exercise real StepCounter logic with controlled Core Motion callbacks: past/current origins, nonzero distance and floor baselines, measured zero and missing values, query failure/nil, early/zero updates, date guards, monotonic corrections, and restart isolation.
Run existing session, payload, Jest, typecheck, package build, and scoped Trunk checks.
Hosted CI builds the iOS example against real Core Motion and React Native; hardware delivery and sensor accuracy remain outside the fixture.
No visual approval is required for this numeric payload change.
