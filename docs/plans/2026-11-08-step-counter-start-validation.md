# Step-counter start validation implementation

## Approved direction

Implement issue #99 under the operator's explicit pr-loop request.
Use the current workspace and preserve the unrelated .trunk/trunk.yaml changes.

## Owned paths

- `docs/plans/2026-11-08-step-counter-start-validation.md`
- `docs/specs/2026-11-08-step-counter-start-validation.md`
- `src/__tests__/index.test.ts`
- `src/index.tsx`

## Steps

1. Add failing regressions for invalid dates, preservation of an active subscription, failed-start cleanup, and later recovery.
2. Validate timestamps before subscription replacement and clean up only the failed start's listener.
3. Document synchronous exceptions in the public function's JSDoc; inspect README.md, README.kr.md, AGENTS.md, and CLAUDE.md for implementation-caused drift.
4. Run yarn test, yarn typecheck, yarn prepare, yarn pack --dry-run, and scoped Trunk checks.
5. Review the complete candidate, stage only owned paths, commit the coherent fix, and open its PR.
6. Observe current-head CI and hosted reviews, resolve verified findings, verify assignment, and merge only after all gates pass.
7. Preserve a visible completion receipt and retire only this PR's owned Git-local state.

## Risks and limits

A valid restart still consumes the prior subscription before attempting native start; this preserves the existing replacement policy rather than promising native rollback.
Native sensor cleanup after failure is outside this JavaScript-only contract.
There is no visual approval requirement because no rendered output changes.
