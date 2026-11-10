# Session error implementation

1. Add failing JS, Android and iOS regressions for session errors.
2. Extend the Codegen contract and public wrapper, preserving existing start callbacks.
3. Map Android registration outcomes and iOS query/update errors to serializable payloads.
4. Connect the example fatal-error callback and verify stopped/stale behavior.
5. Update README and architecture guidance; run Jest, typecheck, Bob build, iOS XCTest and Android JVM tests sequentially with scoped lint.
6. Review the candidate, commit, push and complete hosted CI/review gates before merge.

Owned paths: src, android native module/service and tests, ios/StepCounter.mm, tests/ios, example/src/App.tsx and its tests, README.md, CLAUDE.md, these documents.
