# Native sensor session teardown

## Problem

Issue #95 identifies a returned JS subscription that removes only its event listener, Android emitter hooks without teardown, and motion callbacks that can survive stop or runtime replacement.
iOS already implements pedometer invalidation; this change extends its remaining lifecycle paths.

## Contract

- The most recent successful start attempt owns the current sensor session and its returned handle.
- Removing the current handle stops native producers even while independent debug listeners remain subscribed.
- Replacement retires the previous handle; removing a retired handle cannot stop the replacement.
- Explicit stop, final native listener removal, host destruction on Android, and runtime invalidation release registrations and retained callbacks.
- Repeated remove/stop/invalidate and stop before start are safe; invalidated modules cannot restart.
- Queued callbacks from stopped or replaced producers cannot emit into a newer session or runtime.
- Independent debug listeners remain registered across session stop and replacement.

## Constraints and non-goals

Preserve public signatures and existing platform algorithms.
Do not add dependencies, a foreground service, background execution guarantees, or app-killed tracking.
Activity pause does not itself stop the session; OS background delivery limits still apply.
Physical sensor accuracy and energy impact remain unmeasured.
No visual approval is needed because no rendered behavior changes.

## Acceptance

Jest exercises current/stale/repeated handles, replacement ordering, failure cleanup, explicit stop and external listeners using the real wrapper and emitter.
Android JVM tests exercise the real module and services with sensor registration and lifecycle inventories.
iOS XCTest exercises real module and motion helper with scheduled hardware callbacks, weak references and active-producer inventories.
Run the root Jest suite, TypeScript checks, package build, scoped Trunk, native regressions and both example builds.
Validate example lifecycle integration on available Android and iOS runtimes; report hardware limits separately.
