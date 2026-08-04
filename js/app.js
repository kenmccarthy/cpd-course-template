/* ==========================================================================
   Understanding Module Descriptors — App wiring
   Navigation, progress, theme, and the interactive widgets.
   Uses the Course core (js/core.js) for state + events; emits tracking
   events that SCORM and analytics subscribe to.
   ========================================================================== */
(function () {
  "use strict";

  var C = window.Course;
  var $ = C.$, $$ = C.$$;
  var state = C.state;
  var save = C.save;
  var emit = C.emit;
  var anim = C.anim;
  var LESSONS = C.SECTIONS;

  /* ---------- build nav ---------- */
  var navEl = $("#nav");
  LESSONS.forEach(function (l) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.className = "nav__item";
    btn.setAttribute("data-goto", l.id);
    btn.innerHTML =
      '<span class="nav__num"><span>' + (l.id) + "</span></span>" +
      '<span class="nav__label">' + l.label + "</span>";
    btn.addEventListener("click", function () { goTo(l.id); closeSidebar(); });
    li.appendChild(btn);
    navEl.appendChild(li);
  });
  var navItems = $$(".nav__item");

  /* ---------- navigation ---------- */
  var lessons = $$(".lesson");
  var current = state.current != null ? state.current : 0;
  var started = false;

  function goTo(i) {
    i = Math.max(0, Math.min(LESSONS.length - 1, i));
    var prev = current;

    if (!started) { started = true; emit("course.start", {}); }
    // leaving a viewed section => count it complete
    if (prev !== i && state.visited[prev]) {
      if (!state.completedSec[prev]) {
        state.completedSec[prev] = true;
        emit("section.complete", { id: prev, label: LESSONS[prev].label });
      }
    }

    current = i;
    state.current = i;
    var firstView = !state.visited[i];
    state.visited[i] = true;

    lessons.forEach(function (sec) {
      sec.classList.toggle("is-active", +sec.getAttribute("data-lesson") === i);
    });
    navItems.forEach(function (n, idx) { n.classList.toggle("is-active", idx === i); });
    $("#topTitle").textContent = LESSONS[i].label;
    $("#scroll").scrollTop = 0;
    window.scrollTo(0, 0);

    if (anim) anim.revealLesson(lessons[i]);
    updateProgress();
    save();
    emit("section.view", { id: i, label: LESSONS[i].label, firstView: firstView });
  }

  function countVisited() {
    return LESSONS.filter(function (l) { return state.visited[l.id]; }).length;
  }
  function updateProgress() {
    navItems.forEach(function (n, idx) {
      n.classList.toggle("is-done", !!state.visited[idx] && idx !== current);
    });
    var pct = Math.round((countVisited() / LESSONS.length) * 100);
    if (anim) anim.countUp($("#progressPct"), pct, { suffix: "%" });
    else $("#progressPct").textContent = pct + "%";
    $("#progressFill").style.width = pct + "%";
  }

  $$("[data-next]").forEach(function (b) { b.addEventListener("click", function () { goTo(current + 1); }); });
  $$("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { goTo(current - 1); }); });

  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") goTo(current + 1);
    if (e.key === "ArrowLeft") goTo(current - 1);
  });

  /* ---------- sidebar (mobile) ---------- */
  var sidebar = $("#sidebar"), backdrop = $("#backdrop");
  function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("show"); }
  function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("show"); }
  $("#menuBtn").addEventListener("click", openSidebar);
  backdrop.addEventListener("click", closeSidebar);

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  if (state.theme) root.setAttribute("data-theme", state.theme);
  function currentlyDark() {
    return state.theme === "dark" ||
      (!state.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function syncThemeLabel() {
    var lbl = $("#themeLabel"), ic = $("#themeIcon");
    if (lbl) lbl.textContent = currentlyDark() ? "Switch to light mode" : "Switch to dark mode";
    if (ic) ic.textContent = currentlyDark() ? "☀" : "☾";
  }
  function toggleTheme() {
    state.theme = currentlyDark() ? "light" : "dark";
    root.setAttribute("data-theme", state.theme);
    save();
    syncThemeLabel();
    emit("interaction.complete", { id: "theme-toggle", value: state.theme });
  }
  ["#themeBtn", "#themeBtnSide"].forEach(function (sel) {
    var b = $(sel); if (b) b.addEventListener("click", toggleTheme);
  });
  syncThemeLabel();

  /* ==========================================================================
     Knowledge checks (single-answer MCQ / TF)
     ========================================================================== */
  $$(".kc[data-type='single']").forEach(function (kc) {
    var id = kc.getAttribute("data-kc");
    var isFinal = kc.hasAttribute("data-final");
    var opts = $$(".opt", kc);
    var feedback = $(".kc__feedback", kc);
    var retry = $(".kc__retry", kc);

    function lock(chosen, replay) {
      var correctBtn = opts.filter(function (o) { return o.hasAttribute("data-correct"); })[0];
      var isCorrect = chosen.hasAttribute("data-correct");
      opts.forEach(function (o) {
        o.disabled = true;
        if (o === correctBtn) o.classList.add("is-correct");
        else if (o === chosen) o.classList.add("is-wrong");
        else o.classList.add("is-dim");
      });
      feedback.className = "kc__feedback show " + (isCorrect ? "good" : "bad");
      feedback.innerHTML = "<strong>" + (isCorrect ? "Correct" : "Not quite") + "</strong>" +
        (isCorrect ? feedback.getAttribute("data-good") : feedback.getAttribute("data-bad"));
      retry.classList.toggle("show", !isCorrect);
      if (!replay && !isCorrect && !anim.reduce) {          // micro-interaction: shake wrong
        chosen.classList.remove("shake"); void chosen.offsetWidth; chosen.classList.add("shake");
      }
      state.answers[id] = { chosen: chosen.getAttribute("data-opt"), correct: isCorrect };
      save();
      updateFinalScore();
      if (!replay) {
        emit("knowledge_check.answer", {
          id: id, final: isFinal, choice: chosen.getAttribute("data-opt"), correct: isCorrect
        });
        if (isFinal) maybeQuizComplete();
      }
    }

    opts.forEach(function (o) { o.addEventListener("click", function () { if (!o.disabled) lock(o); }); });
    retry.addEventListener("click", function () {
      opts.forEach(function (o) { o.disabled = false; o.classList.remove("is-correct", "is-wrong", "is-dim"); });
      feedback.className = "kc__feedback";
      retry.classList.remove("show");
      delete state.answers[id];
      save();
      updateFinalScore();
      emit("knowledge_check.retry", { id: id, final: isFinal });
    });

    var saved = state.answers[id];
    if (saved) {
      var btn = opts.filter(function (o) { return o.getAttribute("data-opt") === saved.chosen; })[0];
      if (btn) lock(btn, true);
    }
  });

  /* ---------- final quiz score ---------- */
  var quizAlreadyComplete = false;
  function updateFinalScore() {
    var r = C.quizResult();
    var el = $("#finalScore");
    if (!el) return;
    if (r.answered === 0) {
      el.textContent = "Answer the four questions above to see your score.";
    } else {
      el.innerHTML = "Final quiz score: <b>" + r.correct + " / " + r.total + "</b>" +
        (r.answered < r.total ? " · " + (r.total - r.answered) + " unanswered"
                              : (r.passed ? " · passed ✓" : ""));
    }
  }
  function maybeQuizComplete() {
    var r = C.quizResult();
    if (r.complete && !quizAlreadyComplete) {
      quizAlreadyComplete = true;
      emit("quiz.complete", { correct: r.correct, total: r.total, ratio: r.ratio, passed: r.passed });
    }
  }

  /* ==========================================================================
     Reflections (private, local only)
     ========================================================================== */
  $$("[data-reflect]").forEach(function (r) {
    var id = r.getAttribute("data-reflect");
    var ta = $("textarea", r);
    var btn = $(".reflect__save", r);
    if (state.reflections[id]) ta.value = state.reflections[id];
    function persist() { state.reflections[id] = ta.value; C.saveSoon(); }
    ta.addEventListener("input", persist);
    btn.addEventListener("click", function () {
      persist(); save();
      var original = btn.textContent;
      btn.textContent = "✓ Saved";
      setTimeout(function () { btn.textContent = original; }, 1400);
      // emit length only — never the private content
      emit("reflection.save", { id: id, length: (ta.value || "").trim().length });
    });
  });

  /* ==========================================================================
     Matching (Bloom) — drag & drop with tap fallback
     ========================================================================== */
  (function () {
    var wrap = $("[data-match='bloom']");
    if (!wrap) return;
    var tokens = $$(".token", wrap);
    var drops = $$(".drop", wrap);
    var selected = null;

    function placeToken(token, drop) {
      var slot = $(".drop__slot", drop);
      var existing = $(".drop__chip", slot);
      if (existing) {
        var freed = tokens.filter(function (t) { return t.getAttribute("data-token") === existing.getAttribute("data-token"); })[0];
        if (freed) freed.classList.remove("placed");
      }
      slot.innerHTML = "";
      var chip = document.createElement("span");
      chip.className = "drop__chip";
      chip.setAttribute("data-token", token.getAttribute("data-token"));
      chip.textContent = token.textContent;
      chip.title = "Click to remove";
      chip.addEventListener("click", function () {
        token.classList.remove("placed");
        slot.innerHTML = "";
        drop.classList.remove("correct", "incorrect");
        clearScore();
      });
      slot.appendChild(chip);
      token.classList.add("placed");
      drop.classList.remove("correct", "incorrect");
      clearScore();
    }

    tokens.forEach(function (t) {
      t.addEventListener("dragstart", function (e) {
        t.classList.add("dragging");
        e.dataTransfer.setData("text/plain", t.getAttribute("data-token"));
      });
      t.addEventListener("dragend", function () { t.classList.remove("dragging"); });
      t.addEventListener("click", function () {
        if (t.classList.contains("placed")) return;
        if (selected === t) { t.classList.remove("selected"); selected = null; return; }
        tokens.forEach(function (x) { x.classList.remove("selected"); });
        selected = t; t.classList.add("selected");
      });
    });
    drops.forEach(function (d) {
      d.addEventListener("dragover", function (e) { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", function () { d.classList.remove("over"); });
      d.addEventListener("drop", function (e) {
        e.preventDefault(); d.classList.remove("over");
        var key = e.dataTransfer.getData("text/plain");
        var token = tokens.filter(function (t) { return t.getAttribute("data-token") === key; })[0];
        if (token) placeToken(token, d);
      });
      d.addEventListener("click", function () {
        if (selected) { placeToken(selected, d); selected.classList.remove("selected"); selected = null; }
      });
    });

    var scoreEl = $("[data-matchscore]", wrap);
    function clearScore() { scoreEl.textContent = ""; }

    $("[data-check]", wrap).addEventListener("click", function () {
      var right = 0, total = drops.length, filled = 0;
      drops.forEach(function (d) {
        var chip = $(".drop__chip", d);
        d.classList.remove("correct", "incorrect");
        if (!chip) return;
        filled++;
        if (chip.getAttribute("data-token") === d.getAttribute("data-accept")) { d.classList.add("correct"); right++; }
        else d.classList.add("incorrect");
      });
      if (filled < total) {
        scoreEl.textContent = "Place all six verbs first (" + filled + "/" + total + ")";
        return;
      }
      scoreEl.textContent = right + " / " + total + " correct" + (right === total ? " — perfect!" : "");
      emit("interaction.complete", { id: "bloom-match", score: right, total: total });
      if (right === total && window.Confetti) window.Confetti.burst(wrap);
    });
    $("[data-reset]", wrap).addEventListener("click", function () {
      drops.forEach(function (d) { $(".drop__slot", d).innerHTML = ""; d.classList.remove("correct", "incorrect"); });
      tokens.forEach(function (t) { t.classList.remove("placed", "selected"); });
      selected = null; clearScore();
    });
  })();

  /* ==========================================================================
     Tabs (NFQ)
     ========================================================================== */
  $$("[data-tabs]").forEach(function (tabs) {
    var btns = $$(".tabs__btn", tabs);
    var panels = $$(".tabs__panel", tabs);
    var scrub = $(".tabs__scrub input", tabs);
    var seen = {};
    function activate(k, fromScrub) {
      btns.forEach(function (x) { x.classList.toggle("is-active", x.getAttribute("data-tab") === k); });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-panel") === k); });
      if (scrub && !fromScrub) scrub.value = k;
      seen[k] = true;
      emit("interaction.complete", { id: "nfq-tabs", value: k, seenCount: Object.keys(seen).length });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { activate(b.getAttribute("data-tab")); }); });
    if (scrub) scrub.addEventListener("input", function () { activate(scrub.value, true); });
  });

  /* ==========================================================================
     Accordion
     ========================================================================== */
  $$("[data-accordion] .acc").forEach(function (acc, idx) {
    $(".acc__head", acc).addEventListener("click", function () {
      var open = acc.classList.toggle("open");
      if (open) emit("interaction.complete", { id: "reading-accordion", value: idx + 1 });
    });
  });

  /* ==========================================================================
     ECTS calculator
     ========================================================================== */
  (function () {
    var wrap = $("[data-calc]");
    if (!wrap) return;
    var credits = $("#credits"), hpc = $("#hpc"), contact = $("#contact");
    var totalOut = $("#totalOut"), indepOut = $("#indepOut");
    var splitContact = $("#splitContact"), splitIndep = $("#splitIndep");
    var used = false;
    function render(animate) {
      var c = +credits.value, h = +hpc.value, ct = +contact.value;
      var total = c * h, indep = total - ct;
      $("#creditsVal").textContent = c;
      $("#hpcVal").textContent = h;
      $("#contactVal").textContent = ct;
      var note = $("#calcNote");
      if (animate) anim.countUp(totalOut, total); else totalOut.textContent = total;
      // animated split bar (contact vs independent)
      if (splitContact && splitIndep && total > 0) {
        var cPct = Math.max(0, Math.min(100, (ct / total) * 100));
        splitContact.style.width = cPct + "%";
        splitIndep.style.width = (100 - cPct) + "%";
        splitIndep.classList.toggle("over", indep < 0);
      }
      if (indep < 0) {
        indepOut.textContent = "—";
        note.innerHTML = '<span class="calc__warn">Contact hours exceed total effort — check your figures.</span>';
      } else {
        if (animate) anim.countUp(indepOut, indep); else indepOut.textContent = indep;
        note.innerHTML = c + " credits × " + h + " hours = " + total +
          " total hours, minus " + ct + " contact hours = <strong>" + indep + " hours</strong> on their own.";
      }
    }
    [credits, hpc, contact].forEach(function (el) {
      el.addEventListener("input", function () {
        render(true);
        if (!used) { used = true; emit("interaction.complete", { id: "ects-calc" }); }
      });
    });
    render(false);
  })();

  /* ==========================================================================
     Completion / restart
     ========================================================================== */
  var finishBtn = $("#finishBtn");
  if (finishBtn) {
    if (state.completed) finishBtn.textContent = "✓ Course completed";
    finishBtn.addEventListener("click", function () {
      state.completed = true;
      state.completedSec[current] = true;
      finishBtn.textContent = "✓ Course completed";
      save();
      updateProgress();
      var r = C.quizResult();
      emit("course.complete", {
        allVisited: C.allSectionsVisited(),
        quiz: { correct: r.correct, total: r.total, ratio: r.ratio, passed: r.passed }
      });
      var comp = $(".complete");
      if (comp) anim.pulse($(".complete__badge", comp));
      if (window.Confetti) window.Confetti.burst(finishBtn);
    });
  }
  var restartBtn = $("#restartBtn");
  if (restartBtn) restartBtn.addEventListener("click", function () { goTo(0); });

  /* ---------- init ---------- */
  goTo(current);
  updateFinalScore();
})();
