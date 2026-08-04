#!/usr/bin/env python3
"""
Build a SCORM 1.2 package (.zip) for the Understanding Module Descriptors course.

Bundles only the runtime files (course + manifest), never dev/tooling files.
The resulting zip has imsmanifest.xml at its ROOT, as SCORM requires, and can be
imported directly into an LMS or tested on https://cloud.scorm.com.

Usage:
    python3 scripts/build_scorm.py
    -> dist/understanding-module-descriptors-scorm12.zip
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "dist")
OUT_ZIP = os.path.join(OUT_DIR, "understanding-module-descriptors-scorm12.zip")

# Files/dirs that make up the runtime package (relative to repo root).
INCLUDE_FILES = [
    "imsmanifest.xml",
    "index.html",
    "css/styles.css",
    "js/core.js",
    "js/scorm.js",
    "js/analytics.js",
    "js/animations.js",
    "js/confetti.js",
    "js/interactions.js",
    "js/dashboard.js",
    "js/app.js",
    "assets/MONO_WHITE.png",
    "assets/MONO_BLACK.png",
    "assets/RGB.png",
    "assets/fonts/dmsans-var.woff2",
    "assets/fonts/inter-var.woff2",
    "assets/fonts/inter-italic-var.woff2",
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    missing = [f for f in INCLUDE_FILES if not os.path.isfile(os.path.join(ROOT, f))]
    if missing:
        raise SystemExit("ERROR: missing files:\n  " + "\n  ".join(missing))

    if os.path.exists(OUT_ZIP):
        os.remove(OUT_ZIP)

    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in INCLUDE_FILES:
            z.write(os.path.join(ROOT, rel), rel)   # arcname == rel => manifest at root

    size = os.path.getsize(OUT_ZIP)
    print("Built: %s" % os.path.relpath(OUT_ZIP, ROOT))
    print("Files: %d   Size: %.1f KB" % (len(INCLUDE_FILES), size / 1024.0))
    print("Upload this zip to your LMS or to https://cloud.scorm.com to test.")


if __name__ == "__main__":
    main()
