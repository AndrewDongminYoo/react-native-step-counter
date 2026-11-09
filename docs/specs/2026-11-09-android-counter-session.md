# Android hardware-counter session correctness

Contract: [issue #90](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/90).
The hardware sensor reports a cumulative count since reboot; each start establishes a fresh session baseline from its first reading.

## Behavior

- Treat zero as a valid first reading, separate from an uninitialized baseline.
- Reset the baseline and session count unconditionally on every start.
- Report only increases relative to that baseline; duplicate or decreasing readings do not request events or lower the count.
- Ignore decreasing readings within a session without rebasing; an explicit start permits a lower new baseline.

## Verification and limits

Linux-runnable JVM tests exercise the real service update and start/stop methods with hardware, logging and JNI map creation replaced.
Cover raw zero, repeated readings, decreases, and stop/start after a positive count with both higher and lower new baselines.
The Android native CI job must execute the library's `testDebugUnitTest` task before building the example.
No JS API, accelerometer algorithm, permissions or lifecycle ownership change is included.
Device sensor delivery is outside the JVM fixture; CI verifies compilation and example integration, not physical step accuracy.
