#!/usr/bin/env python3
"""
Build a SCORM 1.2 package (.zip) for the course, using the slug from
js/course.config.js to name the output file.

Bundles only the runtime files (course + manifest), never dev/tooling files.
The resulting zip has imsmanifest.xml at its ROOT, as SCORM requires, and can be
imported directly into an LMS or tested on https://cloud.scorm.com.

Usage:
    python3 scripts/build_scorm.py
    -> dist/<courseSlug>-scorm12.zip
"""
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "dist")
CONFIG_FILE = os.path.join(ROOT, "js", "course.config.js")


def get_course_slug():
    """Pull courseSlug out of js/course.config.js (plain regex, not a JS parser)."""
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r'courseSlug:\s*"([^"]+)"', content)
    if not m:
        raise SystemExit("ERROR: could not find courseSlug in js/course.config.js")
    return m.group(1)


# Files/dirs that make up the runtime package (relative to repo root).
INCLUDE_FILES = [
    "imsmanifest.xml",
    "index.html",
    "css/styles.css",
    "js/course.config.js",
    "js/core.js",
    "js/scorm.js",
    "js/analytics.js",
    "js/animations.js",
    "js/confetti.js",
    "js/interactions.js",
    "js/dashboard.js",
    "js/rise.js",
    "js/app.js",
    "assets/MONO_WHITE.png",
    "assets/MONO_BLACK.png",
    "assets/RGB.png",
    "assets/favicon.png",
    "assets/setu-symbol.png",
    "assets/fonts/dmsans-var.woff2",
    "assets/fonts/inter-var.woff2",
    "assets/fonts/inter-italic-var.woff2",
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    missing = [f for f in INCLUDE_FILES if not os.path.isfile(os.path.join(ROOT, f))]
    if missing:
        raise SystemExit("ERROR: missing files:\n  " + "\n  ".join(missing))

    out_zip = os.path.join(OUT_DIR, "%s-scorm12.zip" % get_course_slug())
    if os.path.exists(out_zip):
        os.remove(out_zip)

    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in INCLUDE_FILES:
            z.write(os.path.join(ROOT, rel), rel)   # arcname == rel => manifest at root

    size = os.path.getsize(out_zip)
    print("Built: %s" % os.path.relpath(out_zip, ROOT))
    print("Files: %d   Size: %.1f KB" % (len(INCLUDE_FILES), size / 1024.0))
    print("Upload this zip to your LMS or to https://cloud.scorm.com to test.")


if __name__ == "__main__":
    main()
