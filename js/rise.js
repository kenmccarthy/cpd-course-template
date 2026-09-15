/* ==========================================================================
   Rise layer — course overview with lesson cards, Continue-button reveal,
   and lesson status. Loads AFTER animations/confetti and BEFORE app.js;
   app.js exposes Course.goTo and calls Course.rise.showOverview() on load.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course, $ = C.$, $$ = C.$$, state = C.state, emit = C.emit;
  state.reveal = state.reveal || {};            // { lessonId: gates opened }

  var REVEAL_SEL = ".hero,.statement,.card,.callout,.figure,.kc,.reflect,.match,.tabs,.calc,.accordion,.deflist,.complete,.widget,h2";
  var lessonEls = $$(".lesson[data-lesson]").filter(function (s) { return !s.classList.contains("lesson--overview"); });

  /* ---------- Continue gates ---------- */
  var gatesByLesson = {};
  function chunksFor(lesson) {
    var chunks = [[]], gates = [];
    Array.prototype.forEach.call(lesson.children, function (el) {
      if (el.classList.contains("gate")) { gates.push(el); chunks.push([]); }
      else chunks[chunks.length - 1].push(el);
    });
    return { chunks: chunks, gates: gates };
  }
  function applyGating(lesson, opened) {
    var g = gatesByLesson[lesson.getAttribute("data-lesson")];
    g.chunks.forEach(function (chunk, ci) {
      chunk.forEach(function (el) { el.classList.toggle("is-gated", ci > opened); });
    });
    g.gates.forEach(function (gate, gi) {
      gate.classList.toggle("is-open", gi < opened);
      gate.classList.toggle("is-gated", gi !== opened);
    });
  }
  function openNext(lesson) {
    var id = lesson.getAttribute("data-lesson");
    var g = gatesByLesson[id];
    var opened = state.reveal[id] || 0;
    if (opened >= g.gates.length) return;
    opened++;
    state.reveal[id] = opened; C.saveSoon();
    applyGating(lesson, opened);
    var chunk = g.chunks[opened];
    var targets = chunk.filter(function (el) { return el.matches(REVEAL_SEL); });
    if (C.anim) C.anim.revealNodes(targets.length ? targets : chunk);
    if (chunk[0] && chunk[0].scrollIntoView) {
      chunk[0].scrollIntoView({ behavior: C.reduceMotion ? "auto" : "smooth", block: "start" });
    }
    emit("interaction.complete", { id: "continue", lesson: +id, step: opened, of: g.gates.length });
    renderCards();
  }
  function revealAll(lesson) {
    var id = lesson.getAttribute("data-lesson");
    state.reveal[id] = gatesByLesson[id].gates.length; C.saveSoon();
    applyGating(lesson, state.reveal[id]);
  }
  lessonEls.forEach(function (lesson) {
    var id = lesson.getAttribute("data-lesson");
    var g = chunksFor(lesson);
    gatesByLesson[id] = g;
    g.gates.forEach(function (gate) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary continue-btn";
      btn.innerHTML = 'Continue <span aria-hidden="true">↓</span>';
      btn.addEventListener("click", function () { openNext(lesson); });
      gate.appendChild(btn);
    });
    applyGating(lesson, Math.min(state.reveal[id] || 0, g.gates.length));
  });

  /* ---------- Overview page ---------- */
  var overview = $(".lesson--overview");
  function statusOf(s) {
    var id = s.id;
    var done = !!(state.completedSec && state.completedSec[id]) || (id === C.SECTIONS.length - 1 && !!state.completed);
    var g = gatesByLesson[id]; var steps = g ? g.gates.length + 1 : 1;
    var opened = Math.min(state.reveal[id] || 0, steps - 1);
    var started = !!state.visited[id] || opened > 0;
    var pct = done ? 100 : Math.round(((opened + (started ? 0.5 : 0)) / steps) * 100);
    return { done: done, started: started, pct: Math.min(100, pct) };
  }
  function renderCards() {
    var grid = $("#lessonCards"); if (!grid) return;
    grid.innerHTML = "";
    C.SECTIONS.forEach(function (s) {
      var st = statusOf(s);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lcard" + (st.done ? " is-done" : st.started ? " is-started" : "");
      b.setAttribute("data-accent", String((s.id % 3) + 1));
      b.setAttribute("aria-label", s.label + " — " + (st.done ? "completed" : st.started ? "in progress" : "not started"));
      b.innerHTML =
        '<span class="lcard__num">' + (st.done ? "✓" : (s.id === 0 ? '<span class="u-mark" aria-hidden="true"></span>' : s.id)) + "</span>" +
        '<span class="lcard__body"><span class="lcard__title">' + s.label + "</span>" +
        '<span class="lcard__meta">~' + s.mins + ' min · <span class="lcard__status">' +
          (st.done ? "Completed" : st.started ? "In progress" : "Not started") + "</span></span>" +
        '<span class="lcard__bar"><span style="width:' + st.pct + '%"></span></span></span>' +
        '<span class="lcard__arrow" aria-hidden="true">→</span>';
      b.addEventListener("click", function () { C.goTo(s.id); });
      grid.appendChild(b);
    });
    var cta = $("#overviewCta");
    if (cta) {
      var resume = state.current != null && state.visited[state.current] && !state.completed;
      cta.textContent = resume ? ("Continue · " + C.SECTIONS[state.current].label) : (state.completed ? "Review the course" : "Start the course");
      cta.onclick = function () { C.goTo(resume ? state.current : 0); };
    }
    var pctEl = $("#ovPct");
    if (pctEl) {
      var v = C.SECTIONS.filter(function (x) { return state.visited[x.id]; }).length;
      pctEl.textContent = Math.round(v / C.SECTIONS.length * 100) + "%";
    }
  }
  function showOverview() {
    if (!overview) return;
    lessonEls.forEach(function (s) { s.classList.remove("is-active", "is-leaving", "x-left", "x-right", "in-left", "in-right"); });
    overview.classList.add("is-active");
    $$(".nav__item").forEach(function (n) { n.classList.toggle("is-active", n.hasAttribute("data-overview")); });
    var top = $("#topTitle"); if (top) top.textContent = "Course overview";
    var sc = $("#scroll"); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0);
    renderCards();
    if (C.anim) C.anim.revealLesson(overview);
    emit("overview.view", {});
  }
  function hideOverview() { if (overview) overview.classList.remove("is-active"); }

  // Fill overview text from config
  (function () {
    var t = $("#ovTitle"); if (t) t.textContent = C.CONFIG.courseTitle;
    var sub = $("#ovSubtitle"); if (sub) { if (C.CONFIG.courseSubtitle) sub.textContent = C.CONFIG.courseSubtitle; else sub.remove(); }
    var tag = $("#ovTagline"); if (tag) { if (C.CONFIG.tagline) tag.innerHTML = C.CONFIG.tagline.replace(/\.\s+/g, ".<br>"); else tag.remove(); }
    var meta = $("#ovMeta");
    if (meta) { var total = C.SECTIONS.reduce(function (a, s) { return a + (s.mins || 0); }, 0);
      meta.textContent = "~" + Math.round(total) + " minutes · " + C.SECTIONS.length + " sections"; }
  })();

  C.on("section.view", renderCards); C.on("section.complete", renderCards); C.on("course.complete", renderCards);

  C.rise = { showOverview: showOverview, hideOverview: hideOverview, openNext: openNext,
             revealAll: revealAll, renderCards: renderCards, gates: gatesByLesson };
})();
