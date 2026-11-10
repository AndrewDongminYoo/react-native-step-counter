# Bounded example logs

Issue: <https://github.com/AndrewDongminYoo/react-native-step-counter/issues/104>.

## Contract

The example retains the newest 200 log entries in arrival order across accepted, filtered and diagnostic paths.
The existing ScrollView renders at most those 200 rows; session filtering, raw clipboard payloads, clear and session resets remain intact.
Auto-scroll must continue when a new row replaces the oldest row at the cap.

A documented launch-time constant disables example logging before the session begins.
In that mode, log payload serialization, log state updates and LogCat formatting/rendering are skipped, while step filtering and accepted-step UI updates continue.
This removes example diagnostic overhead for repeatable comparisons; it is not a package-only benchmark or a measured performance improvement.

## Acceptance

- Jest delivers thousands of accepted and filtered events plus repeated diagnostic actions; retained clipboard entries and rendered row counts never exceed 200.
- Newest rows survive in order; previous-session rows do not reappear after restart or clear.
- Session filtering and verbatim copy remain covered by LogCat tests.
- Logging-off tests exercise accepted, filtered, capability, stop and restart paths and prove no diagnostic serialization or rows accumulate.
- Root Jest, TypeScript, package build and scoped Trunk checks pass.

## Scope and limits

Only example sources, their tests and directly related documentation change.
No dependency, native module or public library API changes are required.
The cap bounds entry count rather than payload byte size.
Jest verifies logical retention and React output, not native memory use, scrolling frame cost or sensor delivery.
