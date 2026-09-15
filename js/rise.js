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
    if (chunk[0]) {
      // Move the reading point to the new content (keyboard + screen-reader users), then scroll it in.
      chunk[0].classList.add("gate-target");
      chunk[0].setAttribute("tabindex", "-1");
      try { chunk[0].focus({ preventScroll: true }); } catch (e) { chunk[0].focus(); }
      if (chunk[0].scrollIntoView) chunk[0].scrollIntoView({ behavior: C.reduceMotion ? "auto" : "smooth", block: "start" });
    }
    var remaining = g.gates.length - opened;
    C.announce("More of this section revealed. " + (remaining ? remaining + " more to reveal." : "Section fully revealed."));
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
      btn.innerHTML = 'Continue ' + C.icon("arrow-down");
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
    var n = C.SECTIONS.length;
    C.SECTIONS.forEach(function (s) {
      var st = statusOf(s);
      var num = C.sectionNumber(s.id);
      var statusText = st.done ? "Completed" : st.started ? "In progress" : "Not started";
      var li = document.createElement("div"); li.setAttribute("role", "listitem");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lcard" + (st.done ? " is-done" : st.started ? " is-started" : "");
      b.setAttribute("data-accent", String((s.id % 3) + 1));
      b.setAttribute("aria-label", "Section " + num + " of " + n + ": " + s.label + ", about " + s.mins + " minutes, " + statusText.toLowerCase() +
        (st.done || !st.started ? "" : ", " + st.pct + "% revealed"));
      b.innerHTML =
        '<span class="lcard__num" aria-hidden="true">' + (st.done ? C.icon("check") : num) + "</span>" +
        '<span class="lcard__body" aria-hidden="true"><span class="lcard__title">' + s.label + "</span>" +
        '<span class="lcard__meta">~' + s.mins + ' min · <span class="lcard__status">' + statusText + "</span></span>" +
        '<span class="lcard__bar"><span style="width:' + st.pct + '%"></span></span></span>' +
        '<span class="lcard__arrow" aria-hidden="true">' + C.icon("arrow-right") + "</span>";
      b.addEventListener("click", function () { C.goTo(s.id); });
      li.appendChild(b);
      grid.appendChild(li);
    });
    var cta = $("#overviewCta");
    if (cta) {
      var resume = state.current != null && state.visited[state.current] && !state.completed;
      cta.innerHTML = (resume ? ("Continue · " + C.SECTIONS[state.current].label) : (state.completed ? "Review the course" : "Start the course")) + " " + C.icon("arrow-right");
      cta.onclick = function () { C.goTo(resume ? state.current : 0); };
    }
    var pctEl = $("#ovPct");
    if (pctEl) {
      var v = C.SECTIONS.filter(function (x) { return state.visited[x.id]; }).length;
      pctEl.textContent = Math.round(v / C.SECTIONS.length * 100) + "%";
    }
  }
  /* Section heroes: "Section N of M" eyebrow + progress strip on the side (same shell as the overview hero). */
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderHeroSides() {
    var n = C.SECTIONS.length;
    lessonEls.forEach(function (lesson) {
      var id = +lesson.getAttribute("data-lesson");
      if (!C.SECTIONS[id]) return;
      var eb = $("[data-hero-eyebrow]", lesson);
      if (eb) eb.innerHTML = '<span class="u-mark" aria-hidden="true"></span> Section ' + C.sectionNumber(id) + " of " + n;
      var side = $("[data-hero-side]", lesson);
      if (!side) return;
      var doneCount = 0;
      var dots = C.SECTIONS.map(function (x) {
        var st = statusOf(x);
        if (st.done) doneCount++;
        return '<i class="' + (x.id === id ? "is-current" : st.done ? "is-done" : "") + '"></i>';
      }).join("");
      side.innerHTML =
        '<p class="hero__kicker">' + esc(C.CONFIG.courseTitle) + "</p>" +
        '<div class="hero__steps" role="img" aria-label="Section ' + C.sectionNumber(id) + " of " + n + ", " + doneCount + ' completed">' + dots + "</div>" +
        '<p class="hero__count">' + doneCount + " of " + n + " sections completed</p>";
    });
  }
  renderHeroSides();

  var firstShow = true;
  function showOverview() {
    if (!overview) return;
    lessonEls.forEach(function (s) { s.classList.remove("is-active", "is-leaving", "x-left", "x-right", "in-left", "in-right"); });
    overview.classList.remove("fade-in");
    void overview.offsetWidth;
    overview.classList.add("is-active", "fade-in");
    $$(".nav__item").forEach(function (n) {
      var on = n.hasAttribute("data-overview");
      n.classList.toggle("is-active", on);
      if (on) n.setAttribute("aria-current", "page"); else n.removeAttribute("aria-current");
    });
    var top = $("#topTitle"); if (top) top.textContent = "Course overview";
    C.jumpToTop();
    renderCards();
    if (C.anim) C.anim.revealLesson(overview);
    if (!firstShow) {
      var h = $("#ovTitle");
      if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      C.announce("Course overview");
    }
    firstShow = false;
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

  function refresh() { renderCards(); renderHeroSides(); }
  C.on("section.view", refresh); C.on("section.complete", refresh); C.on("course.complete", refresh);

  C.rise = { showOverview: showOverview, hideOverview: hideOverview, openNext: openNext,
             revealAll: revealAll, renderCards: renderCards, renderHeroSides: renderHeroSides, gates: gatesByLesson };
})();
