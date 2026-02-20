# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@dongminyu/react-native-step-counter` is a React Native **TurboModule library** that tracks step counts using native device sensors. It uses the **New Architecture** (Fabric/TurboModules) and is built with `react-native-builder-bob`.

- iOS: Uses `CMPedometer` (CoreMotion) and `SOMotionDetecter`
- Android: Uses the step counter/accelerometer sensor via `NativeStepCounterSpec`

## Monorepo Structure

This is a Yarn workspace monorepo (Yarn 4.x):

- **Root** — library source, native modules, build configuration
- **`example/`** — standalone React Native app that demonstrates and tests the library

The example app uses the local library via workspace resolution. Native code changes require a full rebuild of the example app.

## Commands

All commands are run from the root directory.

### Development

```sh
yarn                        # Install dependencies for all workspaces
yarn prepare                # Build the library (runs bob build → outputs to lib/)
yarn typecheck              # TypeScript type check (tsc --noEmit)
yarn lint                   # Lint with Trunk (prettier, ktlint, swiftformat, etc.)
yarn lint --fix             # Auto-fix lint issues
yarn test                   # Run unit tests with Jest
```

### Example App

```sh
yarn example start          # Start Metro bundler
yarn example android        # Run on Android device/emulator
yarn example ios            # Run on iOS simulator
```

### Clean Build Artifacts

```sh
yarn clean                  # Remove android/build, example/android/build, example/ios/build, lib/
```

### iOS Setup (after native changes)

```sh
cd example && bundle exec pod install --project-directory=ios
```

## Architecture

### JavaScript Layer (`src/`)

- **`src/NativeStepCounter.ts`** — TurboModule spec definition. Defines the `Spec` interface registered as `"StepCounter"` via `TurboModuleRegistry.getEnforcing`. Exports `StepCountData` type and constants (`NAME`, `VERSION`, `eventName`).
- **`src/index.tsx`** — Public API. Wraps the native module with a `NativeEventEmitter`, exposes:
  - `isStepCountingSupported()` → Promise with `{ supported, granted }`
  - `startStepCounterUpdate(start, callback)` → returns `EventSubscription`
  - `stopStepCounterUpdate()` → removes all listeners and stops native updates
  - `parseStepData(data)` → transforms raw `StepCountData` into human-readable `ParsedStepCountData`
  - `isSensorWorking` — boolean based on active listener count

### Native Layer

**iOS (`ios/`)**:

- `StepCounter.h / .mm` — Main Objective-C module. Implements `isStepCountingSupported`, `startStepCounterUpdate`, `stopStepCounterUpdate`. Uses `CMPedometer` for step data and `SOMotionDetecter` for motion detection. Emits `StepCounter.stepCounterUpdate` events.
- `SOMotionDetecter.h / .m` — Motion detection helper used by the iOS module.
- New Architecture support via `#ifdef RCT_NEW_ARCH_ENABLED` guard with `NativeStepCounterSpecJSI`.

**Android (`android/src/main/java/com/stepcounter/`)**:

- `StepCounterModule.kt` — Extends `NativeStepCounterSpec`. The codegen spec (`StepCounterSpec`) is generated from `src/NativeStepCounter.ts`.
- `StepCounterPackage.kt` — Standard RN package registration.
- Min SDK: 24, Target/Compile SDK: 36, Kotlin 2.0.21.

### Build System

- **`react-native-builder-bob`** — Builds library to `lib/` in two targets: ESM module (`lib/module/`) and TypeScript declarations (`lib/typescript/`).
- **Codegen** — Configured via `codegenConfig` in `package.json` (name: `StepCounterSpec`, type: `modules`).
- **Trunk** — Manages linting (prettier, ktlint, swiftformat, shellcheck, markdownlint, yamllint, actionlint).

## Key Conventions

- **Node version**: v22.20.0 (see `.nvmrc`)
- **Package manager**: Yarn 4.x only — do not use npm or pnpm.
- TypeScript strict mode is enabled with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`.
- Event name constant: `"StepCounter.stepCounterUpdate"` (defined in `NativeStepCounter.ts`).
- Dates passed to native are Unix timestamps in seconds (divided by 1000 before passing from JS).
- The `startStepCounterUpdate` timestamp flows: `Date` → `getTime() / 1000` → native.

## Editing Native Code

- **Xcode**: Open `example/ios/StepCounterExample.xcworkspace`. Library files are under `Pods > Development Pods > @dongminyu/react-native-step-counter`.
- **Android Studio**: Open `example/android`. Library files appear under `dongminyu-react-native-step-counter`.
- After any native change, rebuild the example app (`yarn example android` or `yarn example ios`).
