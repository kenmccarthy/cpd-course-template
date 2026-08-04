/* ==========================================================================
   Understanding Module Descriptors — SCORM 1.2 adapter (Phase 4)
   Subscribes to the Course event bus and maps it onto the SCORM 1.2 CMI
   data model. No-op (safe) when no LMS API is present, so the course still
   runs standalone from file:// or any static host.

   Completion rule (agreed):
     - completed  : all sections viewed and the course finished
     - passed     : final quiz >= 75%   (failed if quiz complete but below)

   Analytics (agreed): each knowledge-check answer is written as a
   cmi.interactions.n entry — the LMS is the analytics store.

   Offline testing: append ?scorm=mock to the URL to inject a mock LMS API
   that logs every call (used by the automated tests).
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course;
  var state = C.state;

  /* ---------- optional mock LMS for offline testing ---------- */
  if (/[?&]scorm=mock/.test(location.search) && !window.API) {
    window.API = (function () {
      var data = {}, log = [];
      function set(k, v) { data[k] = v; log.push(["set", k, v]); return "true"; }
      function get(k) { log.push(["get", k]); return data[k] || ""; }
      return {
        _data: data, _log: log,
        LMSInitialize: function () { log.push(["init"]); return "true"; },
        LMSFinish: function () { log.push(["finish"]); return "true"; },
        LMSGetValue: get, LMSSetValue: set,
        LMSCommit: function () { log.push(["commit"]); return "true"; },
        LMSGetLastError: function () { return "0"; },
        LMSGetErrorString: function () { return "No error"; },
        LMSGetDiagnostic: function () { return ""; }
      };
    })();
  }

  /* ---------- locate the LMS API (pipwerks-style search) ---------- */
  function findAPI(win) {
    var n = 0;
    while (win && win.API == null && win.parent && win.parent !== win && n < 500) { n++; win = win.parent; }
    return win ? win.API : null;
  }
  function getAPI() {
    var api = findAPI(window);
    if (!api && window.opener) api = findAPI(window.opener);
    return api || null;
  }

  var API = getAPI();
  var present = !!API;
  var initialised = false;
  var startTime = Date.now();

  function call(fn) {
    try { return API[fn].apply(API, Array.prototype.slice.call(arguments, 1)); }
    catch (e) { if (window.console) console.warn("[SCORM] " + fn + " failed", e); return ""; }
  }
  function set(k, v) { return call("LMSSetValue", k, String(v)); }
  function get(k) { return call("LMSGetValue", k); }

  var commitTimer = null;
  function commitSoon() { clearTimeout(commitTimer); commitTimer = setTimeout(function () { call("LMSCommit", ""); }, 800); }

  /* ---------- suspend_data (compact; excludes private reflections) ---------- */
  function buildSuspend() {
    var payload = {
      v: Object.keys(state.visited).filter(function (k) { return state.visited[k]; }).join(""),
      c: Object.keys(state.completedSec || {}).filter(function (k) { return state.completedSec[k]; }).join(""),
      a: {},
      x: Object.keys(state.activities || {}).filter(function (k) { return state.activities[k]; }),
      d: !!state.completed,
      cur: state.current || 0
    };
    C.CONFIG.finalQuiz.concat(["s1", "s2", "s3", "s4"]).forEach(function (id) {
      if (state.answers[id]) payload.a[id] = (state.answers[id].correct ? "1" : "0") + state.answers[id].chosen;
    });
    var str = JSON.stringify(payload);
    if (str.length > 4000) str = str.slice(0, 4000);   // SCORM 1.2 safety cap (~4096)
    return str;
  }
  function restoreSuspend() {
    var raw = get("cmi.suspend_data");
    if (!raw) return;
    try {
      var p = JSON.parse(raw);
      (p.v || "").split("").forEach(function (i) { if (i !== "") state.visited[i] = true; });
      (p.c || "").split("").forEach(function (i) { if (i !== "") state.completedSec[i] = true; });
      (p.x || []).forEach(function (a) { state.activities[a] = true; });
      if (p.a) Object.keys(p.a).forEach(function (id) {
        var v = p.a[id]; state.answers[id] = { correct: v.charAt(0) === "1", chosen: v.slice(1) };
      });
      if (p.d) state.completed = true;
      if (p.cur != null && state.current == null) state.current = p.cur;
      C.save();
    } catch (e) { /* ignore malformed suspend_data */ }
  }

  /* ---------- CMITimespan (HH:MM:SS) ---------- */
  function sessionTime() {
    var s = Math.floor((Date.now() - startTime) / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(h) + ":" + p(m) + ":" + p(sec);
  }

  /* ---------- interactions (analytics) ---------- */
  var interactionIndex = 0;
  function recordInteraction(id, response, correct) {
    var i = interactionIndex++;
    var base = "cmi.interactions." + i + ".";
    set(base + "id", id);
    set(base + "type", "choice");
    set(base + "student_response", String(response));
    set(base + "result", correct ? "correct" : "wrong");
    set(base + "time", new Date().toTimeString().slice(0, 8));
    commitSoon();
  }

  /* ---------- initialise ---------- */
  if (present) {
    initialised = call("LMSInitialize", "") === "true";
    if (initialised) {
      restoreSuspend();
      var status = get("cmi.core.lesson_status");
      if (!status || status === "not attempted" || status === "") set("cmi.core.lesson_status", "incomplete");
      interactionIndex = parseInt(get("cmi.interactions._count"), 10) || 0;
      set("cmi.core.score.min", "0");
      set("cmi.core.score.max", "100");
      commitSoon();
    }
  }

  /* ---------- wire events → CMI ---------- */
  if (present && initialised) {
    C.on("section.view", function (d) {
      set("cmi.core.lesson_location", String(d.id));
      set("cmi.suspend_data", buildSuspend());
      commitSoon();
    });
    C.on("section.complete", function () { set("cmi.suspend_data", buildSuspend()); commitSoon(); });
    C.on("interaction.complete", function () { set("cmi.suspend_data", buildSuspend()); commitSoon(); });

    C.on("knowledge_check.answer", function (d) {
      recordInteraction(d.id, d.choice, d.correct);
      set("cmi.suspend_data", buildSuspend());
    });

    C.on("quiz.complete", function (d) {
      set("cmi.core.score.raw", String(Math.round(d.ratio * 100)));
      commitSoon();
    });

    C.on("course.complete", function () {
      var q = C.quizResult();               // authoritative: has complete/passed/ratio
      var newStatus;
      if (q.complete) {
        set("cmi.core.score.raw", String(Math.round(q.ratio * 100)));
        newStatus = q.passed ? "passed" : "failed";
      } else {
        newStatus = "completed";            // finished but quiz not fully attempted
      }
      set("cmi.core.lesson_status", newStatus);
      set("cmi.suspend_data", buildSuspend());
      set("cmi.core.session_time", sessionTime());
      call("LMSCommit", "");
    });

    function terminate() {
      if (!initialised) return;
      set("cmi.core.session_time", sessionTime());
      set("cmi.suspend_data", buildSuspend());
      call("LMSCommit", "");
      call("LMSFinish", "");
      initialised = false;
    }
    window.addEventListener("pagehide", terminate);
    window.addEventListener("beforeunload", terminate);
  }

  /* expose a little status for analytics/dev inspector */
  C.scorm = {
    present: present,
    initialised: initialised,
    api: API,
    sessionTime: sessionTime,
    buildSuspend: buildSuspend
  };
})();
