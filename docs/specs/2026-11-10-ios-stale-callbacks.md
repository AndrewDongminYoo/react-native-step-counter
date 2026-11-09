# iOS callback session ownership

Issue: [#92](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/92).

A delayed baseline or live callback can mutate a replacement session or emit after stop.
Use a unique session generation, captured dates, and serialized lifecycle, mutation and event delivery.
Invalidate before stopping the previous producer and during module invalidation.
Use weak callback ownership so Core Motion handlers do not retain the module.
Independent historical queries remain valid across live stop/restart and are cancelled by module invalidation.
Keep public APIs, date filtering, baseline fallback and monotonic counting behavior.

Acceptance requires XCTest against the actual module with controllable hardware and event transport boundaries: restart before old query completion, stop before completion, identical dates, early live data, stale errors, teardown, and emission/stop serialization.
CI must run the callback tests as well as existing payload tests and the native example build.
The separate accelerometer detection API is outside this pedometer callback change.
No UI changes or device sensor accuracy claims are included.
