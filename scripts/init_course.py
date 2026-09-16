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


def write_config(course_title, course_slug, institution, store_key, mastery_score,
                 programme_year="2026/27", course_subtitle="", pitch_level="",
                 final_quiz=None):
    # final_quiz: list of knowledge-check ids making up a graded final quiz.
    # Empty/None = reflection-led course -> SCORM reports "completed", no score.
    final_quiz = final_quiz or []
    quiz_js = "[" + ", ".join('"%s"' % q for q in final_quiz) + "]"
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

  // Lifelong Learning at SETU annual colour year. Drives the accent trio,
  // gradients and hero panels. One of: "2026/27", "2027/28", "2028/29".
  programmeYear: "{programme_year}",

  // Shown under the course title on the overview page.
  courseSubtitle: "{course_subtitle}",

  // Level this course is pitched at, e.g. "NFQ Level 8". Free text; shown in
  // exported reflection notes. Leave empty to omit.
  pitchLevel: "{pitch_level}",

  // Lifelong Learning at SETU campaign tagline. Set showTagline: false to hide.
  tagline: "LEARN MORE. GO FURTHER.",
  showTagline: true,

  // Final-quiz question ids, in order (the data-kc values of the knowledge
  // checks that make up the graded quiz).
  //
  // LEAVE THIS EMPTY for a reflection-led course. With no final quiz the course
  // reports SCORM "completed" rather than "passed"/"failed", sends no score, and
  // <adlcp:masteryscore> is omitted from imsmanifest.xml.
  //
  // To add a graded quiz: list the ids here, mark each of those knowledge checks
  // with data-final in index.html, and restore <adlcp:masteryscore>.
  finalQuiz: {final_quiz},

  // Final-quiz pass mark, as a percentage (0-100). Only used when finalQuiz is
  // non-empty. Mirrors <adlcp:masteryscore> in imsmanifest.xml -- keep in sync.
  masteryScore: {mastery_score}
}};
'''.format(
        title=course_title.replace('"', '\\"'),
        slug=course_slug,
        institution=institution.replace('"', '\\"'),
        store_key=store_key,
        mastery_score=mastery_score,
        programme_year=programme_year,
        course_subtitle=course_subtitle.replace('"', '\\"'),
        pitch_level=pitch_level.replace('"', '\\"'),
        final_quiz=quiz_js,
    )
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        f.write(content)


GRADED_BLOCK = """        <!-- Pass mark: keep in sync with masteryScore in js/course.config.js -->
        <adlcp:masteryscore>%s</adlcp:masteryscore>
"""

UNGRADED_BLOCK = """        <!-- No <adlcp:masteryscore>: this course is reflection-led and reports
             completion, not a score (finalQuiz is empty in js/course.config.js).
             If you add a graded final quiz, restore it here and keep it in sync
             with masteryScore in js/course.config.js:
             <adlcp:masteryscore>75</adlcp:masteryscore> -->
"""


def update_manifest(course_title, course_slug, mastery_score, graded=True):
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        xml = f.read()

    identifier = re.sub(r"[^A-Za-z0-9_]+", "_", course_slug.upper())
    xml = re.sub(r'(<manifest identifier=")[^"]*(")', r"\g<1>%s\g<2>" % identifier, xml, count=1)
    xml = re.sub(r"(<title>)[^<]*(</title>)", lambda m: m.group(1) + course_title + m.group(2), xml)

    # Replace everything between the item <title> and </item> with the right
    # mastery-score block, so re-running the script can switch either way.
    block = (GRADED_BLOCK % mastery_score) if graded else UNGRADED_BLOCK
    xml = re.sub(
        r"(<item\b[^>]*>\s*<title>[^<]*</title>\n).*?(\s*</item>)",
        lambda m: m.group(1) + block + m.group(2).lstrip("\n"),
        xml,
        flags=re.S,
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
    course_subtitle = prompt("Course subtitle (overview page)", "")
    pitch_level = prompt("Pitch level (e.g. NFQ Level 8; blank to omit)", "")
    programme_year = prompt("Programme colour year (2026/27, 2027/28, 2028/29)", "2026/27")

    graded = prompt("Graded final quiz? y = pass/fail score, n = reflection-led", "n").lower().startswith("y")
    final_quiz = []
    mastery_score = 75
    if graded:
        ids = prompt("Final-quiz knowledge-check ids, comma separated", "f1,f2,f3,f4")
        final_quiz = [q.strip() for q in ids.split(",") if q.strip()]
        mastery_score = prompt("Pass mark, 0-100", "75")
        try:
            mastery_score = int(mastery_score)
        except ValueError:
            raise SystemExit("ERROR: pass mark must be a whole number")

    write_config(course_title, course_slug, institution, store_key, mastery_score,
                 programme_year, course_subtitle, pitch_level, final_quiz)
    update_manifest(course_title, course_slug, mastery_score, graded)

    print("\nUpdated:")
    print("  %s" % os.path.relpath(CONFIG_FILE, ROOT))
    print("  %s" % os.path.relpath(MANIFEST_FILE, ROOT))
    if graded:
        print("\nGraded course: mark each of %s with data-final in index.html."
              % ", ".join(final_quiz))
    else:
        print("\nReflection-led course: SCORM will report \"completed\" with no score.")
    print("\nNext: edit index.html for section copy/branding, then run")
    print("  python3 scripts/build_scorm.py")


if __name__ == "__main__":
    main()
