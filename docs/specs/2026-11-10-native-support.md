# Native compatibility contract

Issue: [#100](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/100).
Primary sources: the issue, `package.json`, and the native CI workflows.

## Scope

Replace the unverified RN `>=0.71.0` promise with RN `~0.88.0` and React `~19.3.0` on the New Architecture.
The existing native package imports `BaseReactPackage` and generated TurboModule interfaces; supporting RN 0.71 would require a separate compatibility implementation.
The minimum and current validation point coincide at RN 0.88.0 / React 19.3.1.
Patch versions within those minor lines are accepted; other minors and the legacy architecture have no support promise.

## Acceptance

- Package peers and both installation guides agree, with migration guidance and explicit toolchain evidence limits.
- Android and iOS CI generate clean standalone CLI consumers, install the packed package, run autolinking/codegen, and compile native applications.
- Consumer builds do not reuse example Pods, node_modules, generated code, or a source workspace link.
- Existing example builds, JS tests, typecheck, and package build continue to pass.
- Correct the JSDoc example to call the exported `parseStepData` function.

## Constraints

No dependency upgrades, compiler relaxation, release, package version change, or sensor behavior change.
Build compatibility does not establish physical-device sensor behavior or background delivery.
