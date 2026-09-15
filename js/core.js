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
    { id: 0, label: "Welcome & orientation",      mins: 1.5 },
    { id: 1, label: "What is a module descriptor", mins: 5 },
    { id: 2, label: "Learning outcomes",           mins: 7 },
    { id: 3, label: "NFQ levels",                  mins: 7 },
    { id: 4, label: "ECTS credits & workload",     mins: 6.5 },
    { id: 5, label: "Bringing it together",        mins: 2 },
    { id: 6, label: "Summary & final quiz",        mins: 3 }
  ];

  var courseConfig = window.CourseConfig || {};
  var CONFIG = {
    storeKey: courseConfig.storeKey || "umd-course-v2",
    finalQuiz: ["f1", "f2", "f3", "f4"],
    passMark: (courseConfig.masteryScore != null ? courseConfig.masteryScore : 75) / 100,
    sectionCount: SECTIONS.length,
    programmeYear: courseConfig.programmeYear || "2026/27",
    courseTitle: courseConfig.courseTitle || document.title,
    courseSubtitle: courseConfig.courseSubtitle || "",
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
  function quizResult() {
    var q = CONFIG.finalQuiz, answered = 0, correct = 0;
    q.forEach(function (id) {
      if (state.answers[id]) { answered++; if (state.answers[id].correct) correct++; }
    });
    return {
      answered: answered,
      total: q.length,
      correct: correct,
      complete: answered === q.length,
      ratio: correct / q.length,
      passed: (correct / q.length) >= CONFIG.passMark
    };
  }
  function allSectionsVisited() {
    return SECTIONS.every(function (s) { return state.visited[s.id]; });
  }

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  return {
    $: $, $$: $$,
    SECTIONS: SECTIONS,
    CONFIG: CONFIG,
    state: state,
    save: save, saveSoon: saveSoon,
    on: on, off: off, emit: emit, eventLog: eventLog,
    quizResult: quizResult,
    allSectionsVisited: allSectionsVisited,
    reduceMotion: reduceMotion
  };
})();
