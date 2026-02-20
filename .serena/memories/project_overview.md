# Project Overview

- Name: `@dongminyu/react-native-step-counter`
- Purpose: React Native native module for step counting on Android/iOS, exposing a TypeScript API. Android uses StepCounter sensor with accelerometer fallback, iOS uses Core Motion (`CMPedometer`).
- Architecture: React Native New Architecture (TurboModule/Fabric) is required from `v0.3.0`; compatibility considerations for native platforms are documented in `README.md`.
- Repo shape: Yarn workspace monorepo with library at root and integration example app in `example/`.

## Tech Stack

- TypeScript for JS bridge/public API (`src/`)
- React Native 0.83 / React 19
- Native Android module under `android/src/main/`
- Native iOS module under `ios/` (`StepCounter.mm`, `SOMotionDetecter.*`)
- Build packaging via `react-native-builder-bob` -> output in `lib/`
- Tests via Jest (`react-native` preset)
- Quality/linting/formatting/security checks via Trunk

## High-Level Structure

- `src/`: public JS/TS API and native bridge bindings
- `android/src/main/`: Android native implementation + manifest permissions/features
- `ios/`: iOS native implementation
- `example/`: runnable RN app for manual platform validation
- `lib/`: generated build artifacts (do not hand-edit)
- `.github/`: CI and PR/issue templates
- `docs/`: generated API docs

## Environment Notes

- Development uses Yarn workspaces (Yarn 4)
- `.nvmrc` indicates Node channel `lts/jod`
- OS context in this environment is Darwin (macOS)
