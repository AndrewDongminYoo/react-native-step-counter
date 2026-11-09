# Live filter chronology implementation

## Approved direction

Implement issue #98 after #96 on `main` at `84a3a7d` in the existing workspace.
The user explicitly requested implementation through `pr-loop`.

## Steps and ownership

1. Add focused tests in `src/__tests__/index.test.ts` and observe the intended failures for lost batches, invalid input, stale events, and session transitions.
2. Update only the filter and its comments in `src/index.tsx`: validate before mutation, enforce identity/chronology, and use a session measurement-time cadence budget.
3. Update the affected filter claims in `README.md` and `CLAUDE.md`; retain the public API and generated-output policy.
4. Run the focused tests, complete Jest suite, typecheck, package build/pack, and scoped Trunk checks.
5. Review the full candidate against the spec, commit one cohesive fix with its regressions/docs, push, and complete the hosted-review and merge gates.

## Verification

The Jest fixtures call the real TypeScript filter and inspect returned counts, distances, and recovery after rejected inputs.
The native bridge mock only permits module loading; these tests do not verify native implementations.
The expected red reproduction is 11 returned instead of 21 for the issue fixture.
Typecheck verifies public types, Bob verifies distributable generation, and pack verifies package contents.
No visual approval is applicable because this change only affects data filtering.
