#!/usr/bin/env python3
"""
Interactive setup for reusing this repo as a template for a new course.

Prompts for the course identity fields and rewrites:
  - js/course.config.js  (single source of truth, read at runtime)
  - imsmanifest.xml       (static SCORM manifest, kept in sync separately)

Safe to re-run — each run overwrites both files from your answers.
Section copy in index.html, quiz content, and interactive widgets are NOT
touched; edit those by hand (see README.md).

Usage:
    python3 scripts/init_course.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_FILE = os.path.join(ROOT, "js", "course.config.js")
MANIFEST_FILE = os.path.join(ROOT, "imsmanifest.xml")


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "course"


def prompt(label, default):
    raw = input("%s [%s]: " % (label, default)).strip()
    return raw or default


def write_config(course_title, course_slug, institution, store_key, mastery_score):
    content = '''/* ==========================================================================
   Course config -- single source of truth for per-course/per-institution
   identity. Edit this file (or re-run `python3 scripts/init_course.py`)
   when reusing this repo as a template for a new course.

   Consumed by:
     - js/core.js         (storeKey, masteryScore)
     - imsmanifest.xml     (kept in sync by scripts/init_course.py, not read
                            at runtime -- SCORM manifests are static XML)
     - scripts/build_scorm.py (courseSlug -> dist/<slug>-scorm12.zip)

   Must load BEFORE js/core.js in index.html.
   ========================================================================== */
window.CourseConfig = {{
  courseTitle: "{title}",
  courseSlug: "{slug}",
  institution: "{institution}",

  // localStorage key for learner progress/state. Change this if you reuse
  // this repo for a new course served from the same origin/path as an old
  // one, so learners don't inherit stale progress.
  storeKey: "{store_key}",

  // Final-quiz pass mark, as a percentage (0-100). Mirrors
  // <adlcp:masteryscore> in imsmanifest.xml -- keep both in sync.
  masteryScore: {mastery_score}
}};
'''.format(
        title=course_title.replace('"', '\\"'),
        slug=course_slug,
        institution=institution.replace('"', '\\"'),
        store_key=store_key,
        mastery_score=mastery_score,
    )
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        f.write(content)


def update_manifest(course_title, course_slug, mastery_score):
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        xml = f.read()

    identifier = re.sub(r"[^A-Za-z0-9_]+", "_", course_slug.upper())
    xml = re.sub(r'(<manifest identifier=")[^"]*(")', r"\g<1>%s\g<2>" % identifier, xml, count=1)
    xml = re.sub(r"(<title>)[^<]*(</title>)", lambda m: m.group(1) + course_title + m.group(2), xml)
    xml = re.sub(
        r"(<adlcp:masteryscore>)[^<]*(</adlcp:masteryscore>)",
        r"\g<1>%s\g<2>" % mastery_score,
        xml,
    )

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        f.write(xml)


def main():
    print("Set up this repo as a new course template.")
    print("(Section copy, quiz content and widgets still need manual edits in index.html.)\n")

    course_title = prompt("Course title", "My New Course")
    default_slug = slugify(course_title)
    course_slug = slugify(prompt("Course slug (used for the SCORM zip filename)", default_slug))
    institution = prompt("Institution name", "Your Institution")
    store_key = prompt("localStorage key", "%s-course-v1" % course_slug)
    mastery_score = prompt("Pass mark, 0-100", "75")
    try:
        mastery_score = int(mastery_score)
    except ValueError:
        raise SystemExit("ERROR: pass mark must be a whole number")

    write_config(course_title, course_slug, institution, store_key, mastery_score)
    update_manifest(course_title, course_slug, mastery_score)

    print("\nUpdated:")
    print("  %s" % os.path.relpath(CONFIG_FILE, ROOT))
    print("  %s" % os.path.relpath(MANIFEST_FILE, ROOT))
    print("\nNext: edit index.html for section copy/branding, then run")
    print("  python3 scripts/build_scorm.py")


if __name__ == "__main__":
    main()
