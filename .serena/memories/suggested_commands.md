# Suggested Commands

## Setup

- `yarn install` (or `yarn`) - install dependencies for workspace packages
- `nvm use` - align Node version from `.nvmrc` when needed

## Library Development

- `yarn typecheck` - TypeScript check for library
- `yarn prepare` - build distributable artifacts into `lib/` via Bob
- `yarn clean` - remove generated build outputs

## Testing

- `yarn jest` - run unit tests
- `yarn jest --coverage` - run tests with coverage

## Lint/Format/Security

- `trunk check` - run configured lint/security checks
- `trunk fmt` - apply formatter fixes

## Example App / Manual Validation

- `yarn example start` - start Metro for example app
- `yarn example android` - run example on Android device/emulator
- `yarn example ios` - run example on iOS simulator/device

## Native Build Helpers (example workspace)

- `yarn workspace @dongminyu/react-native-step-counter-example build:android`
- `yarn workspace @dongminyu/react-native-step-counter-example build:ios`

## Common macOS Utility Commands

- `git status`, `git diff`, `git add`, `git commit`
- `ls`, `cd`, `pwd`, `find`, `grep`/`rg`
