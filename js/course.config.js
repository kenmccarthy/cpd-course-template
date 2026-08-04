/* ==========================================================================
   Course config — single source of truth for per-course/per-institution
   identity. Edit this file (or run `python3 scripts/init_course.py`) when
   reusing this repo as a template for a new course.

   Consumed by:
     - js/core.js         (storeKey, masteryScore)
     - imsmanifest.xml     (kept in sync by scripts/init_course.py, not read
                            at runtime — SCORM manifests are static XML)
     - scripts/build_scorm.py (courseSlug -> dist/<slug>-scorm12.zip)

   Must load BEFORE js/core.js in index.html.
   ========================================================================== */
window.CourseConfig = {
  courseTitle: "Understanding Module Descriptors",
  courseSlug: "understanding-module-descriptors",
  institution: "South East Technological University (SETU)",

  // localStorage key for learner progress/state. Change this if you reuse
  // this repo for a new course served from the same origin/path as an old
  // one, so learners don't inherit stale progress.
  storeKey: "umd-course-v2",

  // Final-quiz pass mark, as a percentage (0-100). Mirrors
  // <adlcp:masteryscore> in imsmanifest.xml — keep both in sync.
  masteryScore: 75
};
