#!/bin/bash
# Compile real module logic with hardware/transport doubles, then run XCTest.
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/step-counter-xctest.XXXXXX")"
trap 'find "$build_dir" -type f -delete; find "$build_dir" -depth -type d -empty -delete' EXIT
frameworks="$(xcode-select -p)/Platforms/MacOSX.platform/Developer/Library/Frameworks"
bundle="$build_dir/StepCounterSessionTests.xctest"
mkdir -p "$bundle/Contents/MacOS"
xcrun clang++ -fobjc-arc -fblocks -bundle -framework Foundation -framework XCTest \
  -F "$frameworks" -Wl,-rpath,"$frameworks" \
  -I "$repo_root/tests/ios/stubs" \
  "$repo_root/ios/StepCounter.mm" "$repo_root/ios/SOMotionDetecter.m" \
  "$repo_root/tests/ios/StepCounterSessionTests.mm" "$repo_root/tests/ios/SOMotionDetecterTests.mm" \
  -o "$bundle/Contents/MacOS/StepCounterSessionTests"
cat > "$bundle/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>StepCounterSessionTests</string>
<key>CFBundleIdentifier</key><string>com.stepcounter.session-tests</string>
<key>CFBundlePackageType</key><string>BNDL</string>
</dict></plist>
PLIST
xcrun xctest "$bundle"
