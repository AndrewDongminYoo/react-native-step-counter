"""Check the example consumer's merged Android sensor declarations."""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID = "{http://schemas.android.com/apk/res/android}"


def check_manifest(manifest: Path) -> None:
    root = ET.parse(manifest).getroot()
    permissions = {
        node.get(f"{ANDROID}name")
        for tag in ("uses-permission", "uses-permission-sdk-23")
        for node in root.findall(tag)
    }
    errors = []
    if "android.permission.ACTIVITY_RECOGNITION" not in permissions:
        errors.append("Missing ACTIVITY_RECOGNITION permission")
    for permission in ("BODY_SENSORS", "BODY_SENSORS_BACKGROUND"):
        if f"android.permission.{permission}" in permissions:
            errors.append(f"Unexpected {permission} permission")
    for sensor in ("stepcounter", "accelerometer"):
        declarations = [
            node
            for node in root.findall("uses-feature")
            if node.get(f"{ANDROID}name") == f"android.hardware.sensor.{sensor}"
        ]
        if not declarations or any(
            node.get(f"{ANDROID}required") != "false" for node in declarations
        ):
            errors.append(f"Sensor {sensor} must be explicitly optional")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Merged sensor manifest passed: {manifest}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(f"Usage: {sys.argv[0]} <merged AndroidManifest.xml>")
    check_manifest(Path(sys.argv[1]))
