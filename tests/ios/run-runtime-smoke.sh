#!/bin/bash
# Run only against a disposable CompatibilityConsumer; no physical device is used.
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
consumer="${1:?Usage: run-runtime-smoke.sh /absolute/disposable/consumer}"
cd "$consumer"
if curl --silent --max-time 2 http://localhost:8081/status | grep -q packager-status:running; then
  echo 'Port 8081 already serves Metro; stop that independent server before this fixture.' >&2
  exit 1
fi
bundle exec ruby "$repo_root/tests/ios/prepare-runtime-smoke.rb" "$consumer"
xcodebuild -workspace ios/CompatibilityConsumer.xcworkspace -scheme CompatibilityConsumer \
  -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build

app="$consumer/build/Build/Products/Debug-iphonesimulator/CompatibilityConsumer.app"
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app/Info.plist")"
log_dir="$consumer/runtime-evidence"
mkdir -p "$log_dir"
simulator=""
metro_pid=""
cleanup() {
  if [[ -n "$metro_pid" ]]; then kill "$metro_pid" 2>/dev/null || true; fi
  if [[ -n "$simulator" ]]; then
    xcrun simctl shutdown "$simulator" || true
    xcrun simctl delete "$simulator" || true
  fi
}
trap cleanup EXIT

runtime="$(xcrun simctl list runtimes -j | python3 -c 'import json,sys; items=[r for r in json.load(sys.stdin)["runtimes"] if r.get("isAvailable") and r["identifier"].startswith("com.apple.CoreSimulator.SimRuntime.iOS-")]; assert items, "No available iOS runtime"; print(sorted(items,key=lambda r:tuple(map(int,r["version"].split("."))))[-1]["identifier"])')"
simulator="$(xcrun simctl create "StepCounterTypedEvents-${GITHUB_RUN_ID:-$$}" com.apple.CoreSimulator.SimDeviceType.iPhone-17 "$runtime")"
xcrun simctl boot "$simulator"
xcrun simctl bootstatus "$simulator" -b
node node_modules/react-native/cli.js start --no-interactive --max-workers 2 --client-logs > "$log_dir/metro.log" 2>&1 &
metro_pid=$!
for _ in {1..60}; do
  if curl --silent --fail http://localhost:8081/status | grep -q packager-status:running; then break; fi
  if ! kill -0 "$metro_pid" 2>/dev/null; then cat "$log_dir/metro.log"; exit 1; fi
  sleep 1
done
curl --silent --fail http://localhost:8081/status | grep -q packager-status:running
xcrun simctl install "$simulator" "$app"
xcrun simctl launch "$simulator" "$bundle_id"
for _ in {1..90}; do
  if grep -q 'STEP_COUNTER_RUNTIME_\(PASS\|FAIL\)' "$log_dir/metro.log"; then break; fi
  sleep 1
done
cat "$log_dir/metro.log"
python3 - "$log_dir/metro.log" <<'PY'
from pathlib import Path
import re
import sys
log = re.sub(r"\x1b\[[0-9;]*m", "", Path(sys.argv[1]).read_text())
assert 'STEP_COUNTER_RUNTIME_FAIL' not in log, 'Bridgeless runtime fixture failed'
receipts = re.findall(r'(?m)^\s*LOG\s+STEP_COUNTER_RUNTIME_PASS\s+\{.*\}\s*$', log)
assert len(receipts) == 1, 'Expected exactly one bridgeless runtime completion log'
print('Verified generated events in the bridgeless packed-package consumer')
PY
