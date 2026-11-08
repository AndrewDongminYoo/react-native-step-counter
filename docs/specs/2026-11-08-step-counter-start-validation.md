# Validate step-counter starts

## Problem and scope

Issue #99 covers two JavaScript startup defects: an invalid Date can remove a working subscription before passing NaN to native, and a synchronous native start error leaves the newly registered listener active.
Keep the public Date, callback, and EventSubscription API unchanged.

## Acceptance criteria

- Reject a nonfinite Date timestamp with RangeError before removing the active subscription or registering another listener.
- Preserve all currently accepted finite timestamps and pass milliseconds to native unchanged.
- Keep valid restarts consistent with existing behavior: replace the previous library-owned subscription.
- Remove the new subscription when native start throws and rethrow the original error.
- Leave a newer subscription intact if cleanup follows a reentrant start.
- Allow subsequent valid starts and stops after failure.

## Constraints

Native sensor selection, teardown, asynchronous errors, and timestamp normalization remain separate issues.
This change does not alter UI, dependencies, permissions, or platform code.
Jest verifies JavaScript listener behavior with the native boundary mocked; it does not establish sensor behavior on a device.

## Verification

Observe the focused regressions failing before implementation, then run the complete Jest suite, TypeScript checks, package build, package-content inspection, and scoped Trunk checks.
Verify the committed candidate and required hosted checks before the delegated merge.
