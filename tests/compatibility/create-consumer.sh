#!/usr/bin/env bash
set -euo pipefail

# Use a fresh destination outside the monorepo so autolinking cannot see workspaces.
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
consumer_dir=${1:?Usage: create-consumer.sh /absolute/new-consumer-directory}
if [[ "$consumer_dir" != /* || -e "$consumer_dir" ]]; then
  echo "Consumer destination must be an absolute path that does not exist" >&2
  exit 1
fi
consumer_parent=$(cd "$(dirname "$consumer_dir")" && pwd -P)
case "$consumer_parent/" in
  "$repo_root/"*)
    echo "Consumer must be outside the repository" >&2
    exit 1
    ;;
esac
package_archive="$consumer_parent/step-counter-consumer.tgz"
if [[ -e "$package_archive" ]]; then
  echo "Package archive already exists: $package_archive" >&2
  exit 1
fi
cd "$repo_root"
yarn prepare
yarn pack --out "$package_archive"
cd "$(dirname "$consumer_dir")"
npm exec --yes --package=@react-native-community/cli@20.2.0 -- \
  rnc-cli init CompatibilityConsumer --version 0.88.0 \
  --directory "$consumer_dir" --skip-install --pm npm
cd "$consumer_dir"
npm install --save-exact "$package_archive" react@19.3.1
cat > App.tsx <<'APP'
import React from 'react';
import {Button, SafeAreaView} from 'react-native';
import {isStepCountingSupported} from 'react-native-step-counter-newarch';

export default function App() {
  return (
    <SafeAreaView>
      <Button title="Check sensor support" onPress={() => {
        void isStepCountingSupported();
      }} />
    </SafeAreaView>
  );
}
APP
# Fail before building if npm silently selects a different runtime.
node -e '
const assert = require("node:assert/strict");
assert.equal(require("react-native/package.json").version, "0.88.0");
assert.equal(require("react/package.json").version, "19.3.1");
assert.equal(require.resolve("react-native-step-counter-newarch/package.json").startsWith(process.cwd() + "/node_modules/"), true);
'
npx react-native config > autolinking.json
node -e '
const assert = require("node:assert/strict");
const dep = require("./autolinking.json").dependencies["react-native-step-counter-newarch"];
assert.ok(dep?.platforms.android, "Android autolinking missing");
assert.ok(dep?.platforms.ios, "iOS autolinking missing");
'
printf 'Clean consumer ready: %s\n' "$consumer_dir"
