/* ==========================================================================
   Course core (reusable across courses — see js/course.config.js for
   per-course identity)
   Foundation layer: config, state store, and a small event bus.

   Everything else (navigation, interactions, animations, SCORM, analytics)
   plugs into this. Interactions EMIT events here; SCORM and analytics
   SUBSCRIBE. Build once, instrument everywhere.

   Exposes a single global: window.Course
   Vanilla JS, no dependencies. Works from file:// or any static host.
   ========================================================================== */
window.Course = (function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Course model ---------- */
  var SECTIONS = [
    { id: 0, label: "Welcome & orientation",       mins: 1.5 },
    { id: 1, label: "What is a module descriptor", mins: 4.5 },
    { id: 2, label: "Learning outcomes",           mins: 7 },
    { id: 3, label: "NFQ levels",                  mins: 6.5 },
    { id: 4, label: "ECTS, EQF & workload",        mins: 7 },
    { id: 5, label: "Bringing it together",        mins: 2 },
    { id: 6, label: "Summary & reflection",        mins: 1.5 }
  ];

  var courseConfig = window.CourseConfig || {};
  var CONFIG = {
    storeKey: courseConfig.storeKey || "cpd-course-v1",
    // Empty = reflection-led course, no graded quiz (see js/course.config.js).
    finalQuiz: courseConfig.finalQuiz || [],
    passMark: (courseConfig.masteryScore != null ? courseConfig.masteryScore : 75) / 100,
    pitchLevel: courseConfig.pitchLevel || "",
    sectionCount: SECTIONS.length,
    programmeYear: courseConfig.programmeYear || "2026/27",
    courseTitle: courseConfig.courseTitle || document.title,
    courseSlug: courseConfig.courseSlug || "course",
    courseSubtitle: courseConfig.courseSubtitle || "",
    // Activity ids the results dashboard counts as "explored".
    activities: courseConfig.activities || [],
    tagline: courseConfig.showTagline === false ? "" : (courseConfig.tagline || ""),
    institution: courseConfig.institution || ""
  };
  // Apply the Lifelong Learning colour year to the page (drives CSS tokens).
  document.documentElement.setAttribute("data-year", CONFIG.programmeYear);

  /* ---------- State store (localStorage-backed) ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storeKey)) || {}; }
    catch (e) { return {}; }
  }
  var state = load();
  state.visited      = state.visited      || {};   // { sectionId: true }  (viewed)
  state.completedSec = state.completedSec || {};   // { sectionId: true }  (advanced past)
  state.answers      = state.answers      || {};   // { kcId: {chosen, correct} }
  state.reflections  = state.reflections  || {};   // { id: text }  (private, local only)
  state.interactions = state.interactions || {};   // { id: {...activity state} }
  state.theme        = state.theme        || "";
  if (!state.sessionStart) state.sessionStart = Date.now();

  var saveTimer = null;
  function save() {
    try { localStorage.setItem(CONFIG.storeKey, JSON.stringify(state)); } catch (e) {}
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 200); }

  /* ---------- Event bus ---------- */
  var listeners = {};
  var eventLog = [];
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { off(evt, fn); };
  }
  function off(evt, fn) {
    if (listeners[evt]) listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; });
  }
  function emit(evt, data) {
    data = data || {};
    data.event = evt;
    data.t = Date.now();
    eventLog.push(data);
    fireAll(listeners[evt], data);
    fireAll(listeners["*"], data);
    return data;
  }
  function fireAll(arr, data) {
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      try { arr[i](data); }
      catch (e) { if (window.console) console.error("[Course.track]", e); }
    }
  }

  /* ---------- Derived helpers ---------- */
  /* Final-quiz result. A course with no graded quiz (CONFIG.finalQuiz empty)
     reports hasQuiz:false and never "complete"/"passed" — callers use that to
     fall back to plain completion rather than a pass/fail score. */
  function quizResult() {
    var q = CONFIG.finalQuiz, answered = 0, correct = 0;
    q.forEach(function (id) {
      if (state.answers[id]) { answered++; if (state.answers[id].correct) correct++; }
    });
    if (!q.length) {
      return { hasQuiz: false, answered: 0, total: 0, correct: 0, complete: false, ratio: 0, passed: false };
    }
    return {
      hasQuiz: true,
      answered: answered,
      total: q.length,
      correct: correct,
      complete: answered === q.length,
      ratio: correct / q.length,
      passed: (correct / q.length) >= CONFIG.passMark
    };
  }

  /* Reflection prompts answered (non-empty), out of however many the page has.
     Used by the dashboard in place of a quiz score on reflection-led courses. */
  function reflectionResult() {
    var ids = $$("[data-reflect]").map(function (r) { return r.getAttribute("data-reflect"); });
    var written = ids.filter(function (id) { return (state.reflections[id] || "").trim().length > 0; }).length;
    return { written: written, total: ids.length };
  }
  function allSectionsVisited() {
    return SECTIONS.every(function (s) { return state.visited[s.id]; });
  }

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- UI helpers shared by every layer ---------- */
  /* Inline icon from the sprite in index.html: Course.icon("check") -> <svg class="icon"><use href="#i-check"/></svg>.
     Decorative by default (aria-hidden); pass a label to make it meaningful on its own. */
  function icon(name, label) {
    return '<svg class="icon" ' + (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"') +
      ' focusable="false"><use href="#i-' + name + '" xlink:href="#i-' + name + '"></use></svg>';
  }
  /* Screen-reader announcement via the polite live region (#a11yStatus). */
  var announceTimer = null;
  function announce(msg) {
    var el = document.getElementById("a11yStatus");
    if (!el) return;
    el.textContent = "";
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { el.textContent = msg; }, 60);
  }
  /* Display number for a 0-based section id (learners see 1..n). */
  function sectionNumber(id) { return Number(id) + 1; }
  /* Current vertical scroll offset (the window is the scroller; #scroll is a fallback). */
  function scrollOffset() {
    var sc = document.getElementById("scroll");
    return window.pageYOffset || document.documentElement.scrollTop || (sc ? sc.scrollTop : 0) || 0;
  }
  /* Jump to the top instantly — bypasses `scroll-behavior: smooth` so a page change never
     animates the scroll on top of the lesson transition. */
  function jumpToTop() {
    var de = document.documentElement, prev = de.style.scrollBehavior;
    de.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    var sc = document.getElementById("scroll"); if (sc) sc.scrollTop = 0;
    de.style.scrollBehavior = prev;
  }

  return {
    $: $, $$: $$,
    SECTIONS: SECTIONS,
    CONFIG: CONFIG,
    state: state,
    save: save, saveSoon: saveSoon,
    on: on, off: off, emit: emit, eventLog: eventLog,
    quizResult: quizResult,
    reflectionResult: reflectionResult,
    allSectionsVisited: allSectionsVisited,
    reduceMotion: reduceMotion,
    icon: icon,
    announce: announce,
    sectionNumber: sectionNumber,
    scrollOffset: scrollOffset,
    jumpToTop: jumpToTop
  };
})();
