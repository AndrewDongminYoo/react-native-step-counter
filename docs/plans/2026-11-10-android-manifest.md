# Android manifest implementation

Approved direction: explicit `$pr-loop #102` invocation and the issue's acceptance criteria.

1. Add an XML reader for the example consumer's real merged manifest; observe the existing background permission and required accelerometer fail.
2. Update `android/src/main/AndroidManifest.xml`, both README Android sections, and the unused declarations in `example/src/permission.ts`.
3. Run `:app:processDebugMainManifest`, check the generated XML, and prove the validator rejects missing activity permission, body-sensor permissions, and required or missing sensor declarations.
4. Add the same reader to `.github/workflows/native-android.yml` after the example build.
5. Run typecheck, Jest, package build, scoped Trunk checks, and the Android example build; review the complete candidate and hosted exact-head results before the authorized merge.

Owned paths are the files above, `tests/android/check-merged-manifest.py`, and these two contract documents.
README, AGENTS, and CLAUDE claims about Android setup and permission behavior are checked against the candidate; unrelated documentation stays outside scope.
No visual approval is needed for this declaration-only change.
