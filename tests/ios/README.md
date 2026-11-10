# Native event verification

`bash tests/ios/run-session-tests.sh` compiles the production module and motion helper with hardware doubles.
It generates the installed RN emitter implementation, extracts its unmodified Spec-base implementation and compiles it against the fixture callback interface.
This verifies actual generated emitter routing, serializable errors, session intervals and callback ownership, without pretending that the callback sink is a full RN runtime.
The separate payload fixture verifies serialization.

## Bridgeless consumer replay

`RuntimePedometer.mm` is test-only Core Motion replay and must never be included in the library or normal example target.
The helper adds it only to a standalone `CompatibilityConsumer` outside this repository and replaces that disposable app's JS entry point with `runtime-smoke.ts`; the template's existing SceneDelegate starts RN.
The fixture reports authorized capabilities and injects known baseline/live data, deliberately delivering a late callback after stop.
The library, Codegen and RN bridgeless runtime remain real.

```bash
bash tests/compatibility/create-consumer.sh /tmp/step-counter-runtime
cd /tmp/step-counter-runtime
bundle install
bundle exec ruby /absolute/repository/tests/ios/prepare-runtime-smoke.rb /tmp/step-counter-runtime
RCT_USE_RN_DEP=1 RCT_USE_PREBUILT_RNCORE=1 bundle exec pod install --project-directory=ios
xcodebuild -workspace ios/CompatibilityConsumer.xcworkspace -scheme CompatibilityConsumer -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

`bash /absolute/repository/tests/ios/run-runtime-smoke.sh /tmp/step-counter-runtime` builds the replay target, creates its own iOS simulator, starts Metro with the pinned CLI’s client-log stream, installs and launches the app, checks completion and removes its simulator on exit.
Run it only when simulator creation, installation and launch are authorized.
The iOS workflow runs it on its disposable runner after the unmodified clean-consumer build.
Capture JS logs from that app's Metro inspector.
`STEP_COUNTER_RUNTIME_PASS` requires both owned sessions to receive five steps, an independent listener to receive both payloads, the stale handle and late callbacks to leave the replacement intact, and independent sensor-info subscriptions to survive stop.
`STEP_COUNTER_RUNTIME_FAIL` or missing completion is a failure, not a pass.
This test does not measure physical walking, sensor accuracy, background delivery or energy.
