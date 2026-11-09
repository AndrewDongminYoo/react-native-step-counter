# iOS callback ownership implementation

1. Add a macOS XCTest harness compiling the actual `ios/StepCounter.mm`, substituting only Core Motion and React Native boundaries.
   Observe regression failures with delayed callbacks before changing production code.
2. Serialize lifecycle transitions and callback effects on the state queue; capture generation and immutable dates, invalidate before stop/restart/teardown, and use weak callback ownership.
3. Run XCTest scheduling regressions, Foundation payload fixtures, `yarn test`, `yarn typecheck`, `yarn prepare`, and scoped Trunk checks.
   Add the XCTest command to native iOS CI; the existing example build checks real iOS SDK and React Native integration.
4. Review complete changes and affected documentation, commit one cohesive fix, then run hosted review and CI through the parent PR loop.

Owned paths: `ios/StepCounter.mm`, `tests/ios/`, `.github/workflows/native-ios.yml`, these spec/plan files, and the native testing section of `CLAUDE.md`.
Hardware, React Native transport and macOS test boundary declarations are mocked; counting, lifecycle and callback logic are production code.
