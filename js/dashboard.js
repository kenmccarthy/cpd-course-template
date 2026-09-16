/* ==========================================================================
   Understanding Module Descriptors — Engagement layer (Phase 3)
   End-of-course results dashboard + export-my-notes.
   Subscribes to the Course event bus; persists which activities were explored.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course;
  var $ = C.$, $$ = C.$$;
  var state = C.state;

  // Which interactive activities count toward "explored" — see `activities`
  // in js/course.config.js.
  var KNOWN_ACTIVITIES = C.CONFIG.activities;

  state.activities = state.activities || {};

  var dash = $("[data-dashboard]");
  if (!dash) return;

  /* Record explored activities from events (and persist). */
  C.on("interaction.complete", function (d) {
    if (d.id && KNOWN_ACTIVITIES.indexOf(d.id) !== -1 && !state.activities[d.id]) {
      state.activities[d.id] = true;
      C.saveSoon();
      render();
    }
  });
  C.on("section.view", render);
  C.on("section.complete", render);
  C.on("knowledge_check.answer", render);
  C.on("reflection.save", render);
  C.on("course.complete", render);

  function render() {
    var visited = C.SECTIONS.filter(function (s) { return state.visited[s.id]; }).length;
    var q = C.quizResult();
    var refl = C.reflectionResult();
    var acts = KNOWN_ACTIVITIES.filter(function (a) { return state.activities[a]; }).length;

    setNum("#dashSections", visited + "/" + C.SECTIONS.length);
    setNum("#dashQuiz", q.correct + "/" + q.total);                 // graded-quiz courses
    setNum("#dashReflections", refl.written + "/" + refl.total);    // reflection-led courses
    setNum("#dashActs", acts + "/" + KNOWN_ACTIVITIES.length);

    var status = $("#dashStatus");
    var allSeen = visited === C.SECTIONS.length;

    if (q.hasQuiz) {
      if (q.complete && q.passed && allSeen) {
        status.className = "dashboard__status is-pass";
        status.innerHTML = C.icon("check-circle") + " <strong>Complete &amp; passed</strong> — all sections viewed and final quiz at " +
          Math.round(q.ratio * 100) + "%.";
      } else if (q.complete && !q.passed) {
        status.className = "dashboard__status is-warn";
        status.innerHTML = "Final quiz at " + Math.round(q.ratio * 100) + "% — the pass mark is " + Math.round(C.CONFIG.passMark * 100) + "%. Use \u201cTry again\u201d on any question to improve.";
      } else {
        status.className = "dashboard__status";
        var bits = [];
        if (!allSeen) bits.push((C.SECTIONS.length - visited) + " section(s) still to view");
        if (!q.complete) bits.push((q.total - q.answered) + " quiz question(s) left");
        status.textContent = bits.length ? "Still to do: " + bits.join(" · ") + "." : "Keep going!";
      }
      return;
    }

    // Reflection-led course: completion is about working through it, not a score.
    if (allSeen && state.completed) {
      status.className = "dashboard__status is-pass";
      status.innerHTML = C.icon("check-circle") + " <strong>Complete</strong> — all " + C.SECTIONS.length +
        " sections viewed" + (refl.written ? ", with " + refl.written + " of " + refl.total + " reflections written" : "") + ".";
    } else {
      status.className = "dashboard__status";
      var todo = [];
      if (!allSeen) todo.push((C.SECTIONS.length - visited) + " section(s) still to view");
      if (refl.written < refl.total) todo.push((refl.total - refl.written) + " reflection(s) not yet written");
      status.textContent = todo.length
        ? "Still to do: " + todo.join(" · ") + ". Reflections aren't scored — they're your own working notes."
        : "Everything covered. Mark the course complete below when you're ready.";
    }
  }
  function setNum(sel, val) {
    var el = $(sel); if (!el) return;
    if (el.textContent !== val) el.textContent = val;
  }

  /* ---------- Export my reflection notes ---------- */
  function exportNotes() {
    var lines = [];
    lines.push(C.CONFIG.courseTitle.toUpperCase() + " — MY REFLECTION NOTES");
    lines.push((C.CONFIG.institution || "") + " · CPD" + (C.CONFIG.pitchLevel ? " · " + C.CONFIG.pitchLevel : ""));
    lines.push("Exported: " + new Date().toLocaleString());
    lines.push("".padEnd(60, "="));
    lines.push("");

    var any = false;
    $$("[data-reflect]").forEach(function (r, i) {
      var id = r.getAttribute("data-reflect");
      var prompt = (r.querySelector(".reflect__prompt") || {}).textContent || ("Reflection " + (i + 1));
      var answer = (state.reflections[id] || "").trim();
      lines.push((i + 1) + ". " + prompt.trim());
      lines.push(answer ? ("   " + answer.replace(/\n/g, "\n   ")) : "   (no note yet)");
      lines.push("");
      if (answer) any = true;
    });

    var q = C.quizResult();
    lines.push("".padEnd(60, "-"));
    if (q.hasQuiz) {
      lines.push("Final quiz: " + q.correct + "/" + q.total + (q.complete ? (q.passed ? " (passed)" : "") : " (incomplete)"));
    } else {
      var visited = C.SECTIONS.filter(function (s) { return state.visited[s.id]; }).length;
      lines.push("Progress: " + visited + "/" + C.SECTIONS.length + " sections viewed" + (state.completed ? " · course marked complete" : ""));
    }

    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (C.CONFIG.courseSlug || "course") + "-my-notes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    var btn = $("#exportNotes");
    if (btn) { var html = btn.innerHTML; btn.innerHTML = C.icon("check") + (any ? " Notes downloaded" : " Downloaded (notes were empty)"); setTimeout(function () { btn.innerHTML = html; }, 1800); }
    C.emit("interaction.complete", { id: "export-notes" });
  }
  var exportBtn = $("#exportNotes");
  if (exportBtn) exportBtn.addEventListener("click", exportNotes);

  render();
})();
