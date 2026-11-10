# Android sensor manifest contract

Issue #102 removes unrelated body-sensor consent and unnecessary installation filtering.
The library uses a hardware step counter or an accelerometer fallback and retains its existing activity-recognition consent policy.

## Acceptance

- The real example consumer's merged manifest retains `ACTIVITY_RECOGNITION`, includes no body-sensor permission, and explicitly marks both sensors optional.
- Both README installation examples agree with the library manifest and describe runtime capability checks.
- Remove the unused body-sensor example helper and its supporting declarations; preserve activity-recognition and iOS motion permission handling.
- Android CI checks the merged manifest after building the example.

## Constraints

No public API, runtime sensor selection, dependency, or version changes.
Optional hardware permits installation on unsupported devices; applications must check runtime capabilities.
The example has no independent body-sensor requirement, so its merged manifest is a suitable consumer fixture.
Applications with their own permissions or required hardware declarations retain control of those declarations.
