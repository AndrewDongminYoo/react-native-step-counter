# Implementation plan

1. Add failing lifecycle regressions to `example/src/__tests__/App.test.tsx` and permission regressions to `example/src/__tests__/permission.test.ts`.
2. Update `example/src/App.tsx` to cancel superseded operations and remove state-driven implicit starts; make STOP available during requests.
3. Update `example/src/permission.ts` to distinguish denied/blocked and clean up settings-return listeners on cancellation and failure.
4. Run focused and complete Jest, `yarn typecheck`, `yarn prepare`, and scoped Trunk checks; audit affected documentation and review the complete diff.
5. Commit the cohesive fix, push, open a PR referencing #106, and observe current-head reviews and CI.
6. Keep #106 open until Android/iOS manual acceptance is demonstrated; merge only after all required gates pass.
