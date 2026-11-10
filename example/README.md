# Getting Started

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

> In this repository, `yarn start` runs `react-native start --reset-cache`.

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

### Additional scripts

The example workspace also includes helper scripts used in local development and CI:

```sh
# Clean Android/Metro/Watchman/Yarn caches
yarn clean

# Reinstall iOS pods after cleaning
yarn postclean

# Build commands used by CI
yarn build:android
yarn build:ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

## Example logging and measurements

With logging enabled, the example retains the newest **200 entries** across accepted steps, filtered steps and diagnostics, evicting the oldest entry on each subsequent append.
The existing ScrollView therefore renders at most 200 rows, and automatic scrolling continues when a row replaces the oldest entry.
The limit bounds entry count, not payload byte size.
Only entries from the active session are displayed and copied; Copy exports their serialized payloads verbatim in arrival order.
Clear removes retained history, and starting a new session resets it.

For repeatable measurements without example logs:

1. Set `EXAMPLE_LOGGING_ENABLED` to `false` in `src/logging.ts` before launching the example.
2. Perform a full app reload, then run the same START/STOP/RESTART and sensor-event sequence used for the logging-enabled comparison.
3. Record the logging setting, build mode, device and event sequence alongside results; keep those conditions fixed between comparisons.
4. Restore `EXAMPLE_LOGGING_ENABLED` to `true` and fully reload when diagnostic logs are needed again.

The disabled mode skips log payload creation/serialization, timestamp formatting, log state updates and LogCat rendering for every log path, including capability and permission diagnostics.
Step filtering, accepted-step display, calorie formatting and the progress indicator still run, so this mode is not a package-only benchmark.
The setting is a launch-time source configuration, not a runtime toggle or a persisted preference.
No runtime memory or frame-cost improvement is claimed from the entry cap alone.

From the repository root, `yarn test example/src/__tests__/App.test.tsx example/src/__tests__/LogCat.test.tsx` checks long synthetic sessions, capped rendering and clipboard output, session changes, clear and disabled logging.
Jest uses native boundary mocks; real device sensor delivery and native scrolling performance require separate measurements.

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
