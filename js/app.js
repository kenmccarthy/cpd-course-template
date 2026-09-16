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
  if (C.rise) {
    var ovLi = document.createElement("li");
    var ovBtn = document.createElement("button");
    ovBtn.className = "nav__item nav__item--overview";
    ovBtn.setAttribute("data-overview", "");
    ovBtn.innerHTML = '<span class="nav__num"><span class="u-mark" aria-hidden="true"></span></span><span class="nav__label">Course overview</span>';
    ovBtn.addEventListener("click", function () { C.rise.showOverview(); closeSidebar(); });
    ovLi.appendChild(ovBtn); navEl.appendChild(ovLi);
  }
  LESSONS.forEach(function (l) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.className = "nav__item";
    btn.setAttribute("data-goto", l.id);
    btn.innerHTML =
      '<span class="nav__num" aria-hidden="true"><span>' + C.sectionNumber(l.id) + "</span></span>" +
      '<span class="nav__label">' + l.label + "</span>" +
      '<span class="sr-only nav__sr" data-nav-sr></span>';
    btn.addEventListener("click", function () { goTo(l.id); closeSidebar(); });
    li.appendChild(btn);
    navEl.appendChild(li);
  });
  var navItems = $$(".nav__item[data-goto]");

  /* ---------- navigation ---------- */
  var lessons = $$(".lesson").filter(function (s) { return !s.classList.contains("lesson--overview"); });
  var current = state.current != null ? state.current : 0;
  var started = false;

  function goTo(i) {
    i = Math.max(0, Math.min(LESSONS.length - 1, i));
    var prev = current;

    if (!started) { started = true; emit("course.start", {}); }
    // leaving a viewed section => count it complete
    if (prev !== i && state.visited[prev]) {
      var gatesDone = !C.rise || !C.rise.gates[prev] ||
        (state.reveal && (state.reveal[prev] || 0) >= C.rise.gates[prev].gates.length);
      if (!state.completedSec[prev] && gatesDone) {
        state.completedSec[prev] = true;
        emit("section.complete", { id: prev, label: LESSONS[prev].label });
      }
    }

    var outgoing = lessons.filter(function (s) { return s.classList.contains("is-active") && !s.classList.contains("is-leaving"); })[0] || null;
    var fromOverview = !outgoing;
    var prevScroll = C.scrollOffset();
    if (C.rise) C.rise.hideOverview();

    current = i;
    state.current = i;
    var firstView = !state.visited[i];
    state.visited[i] = true;

    var dir = fromOverview ? 1 : (i > prev ? 1 : (i < prev ? -1 : 0));
    transition(outgoing, lessons[i], dir, prevScroll);
    var ovNav = $(".nav__item[data-overview]");
    if (ovNav) { ovNav.classList.remove("is-active"); ovNav.removeAttribute("aria-current"); }
    navItems.forEach(function (n, idx) {
      n.classList.toggle("is-active", idx === i);
      if (idx === i) n.setAttribute("aria-current", "page"); else n.removeAttribute("aria-current");
    });
    $("#topTitle").textContent = LESSONS[i].label;
    C.jumpToTop();

    // One motion only: blocks already in view settle immediately while the lesson slides in.
    if (anim) anim.revealLesson(lessons[i], { settleAboveFold: dir !== 0 });
    updateProgress();
    save();
    // Move the reading point to the new section's heading and announce it.
    var heading = $(".hero h1", lessons[i]) || lessons[i];
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
    }
    C.announce("Section " + C.sectionNumber(i) + " of " + LESSONS.length + ": " + LESSONS[i].label);
    emit("section.view", { id: i, label: LESSONS[i].label, firstView: firstView });
  }

  /* Rise-style horizontal slide between lessons (plain swap under reduced motion).
     - The outgoing lesson is pinned where the learner was looking (top = -scrollTop) so the
       scroll reset doesn't snap it to its start mid-slide.
     - Enter classes are left in place after the animation (fill-mode both); re-adding them
       after a reflow restarts the slide. Nothing is removed on `animationend`, because that
       event bubbles from child animations (figures, ticks) and would cut the slide short. */
  var MOTION = ["is-leaving", "x-left", "x-right", "in-left", "in-right", "fade-in"];
  function transition(out, inc, dir, prevScroll) {
    var reduce = !anim || anim.reduce;
    lessons.forEach(function (s) {
      if (s !== out && s !== inc) { s.classList.remove.apply(s.classList, ["is-active"].concat(MOTION)); s.style.top = ""; s.style.height = ""; }
    });
    if (out && out !== inc) {
      out.classList.remove("in-left", "in-right", "fade-in");
      if (reduce || dir === 0) {
        out.classList.remove("is-active");
      } else {
        // Pin the outgoing lesson so the part the learner was reading is what slides away.
        out.style.top = (-(prevScroll || 0)) + "px";
        out.style.height = ((prevScroll || 0) + window.innerHeight) + "px";
        out.classList.add("is-leaving", dir > 0 ? "x-left" : "x-right");
        var finished = false;
        var done = function (e) {
          if (e && e.target !== out) return;           // ignore bubbled child animations
          if (finished) return; finished = true;
          out.classList.remove("is-active", "is-leaving", "x-left", "x-right");
          out.style.top = ""; out.style.height = "";
        };
        out.addEventListener("animationend", done);
        setTimeout(done, 600);
      }
    }
    inc.classList.remove.apply(inc.classList, MOTION);
    inc.style.top = ""; inc.style.height = "";
    inc.classList.add("is-active");
    if (!reduce && out !== inc && dir !== 0) {
      void inc.offsetWidth;                                // reflow so the animation restarts
      inc.classList.add(dir < 0 ? "in-left" : "in-right");
    } else if (!reduce && out === inc) {
      void inc.offsetWidth;
      inc.classList.add("fade-in");
    }
  }

  function countVisited() {
    return LESSONS.filter(function (l) { return state.visited[l.id]; }).length;
  }
  function updateProgress() {
    navItems.forEach(function (n, idx) {
      var done = !!state.visited[idx] && idx !== current;
      n.classList.toggle("is-done", done);
      var sr = n.querySelector("[data-nav-sr]");
      if (sr) sr.textContent = done ? " (viewed)" : "";
    });
    var pct = Math.round((countVisited() / LESSONS.length) * 100);
    if (anim) anim.countUp($("#progressPct"), pct, { suffix: "%" });
    else $("#progressPct").textContent = pct + "%";
    $("#progressFill").style.width = pct + "%";
  }

  $$("[data-next]").forEach(function (b) { b.addEventListener("click", function () { goTo(current + 1); }); });
  $$("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { goTo(current - 1); }); });

  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target, tag = t && t.tagName;
    if (e.key === "Escape") { if (sidebar.classList.contains("open")) { closeSidebar(); $("#menuBtn").focus(); } return; }
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || tag === "BUTTON" || (t && t.isContentEditable)) return;
    if (t && t.closest && t.closest("[role='tablist'], [role='tab'], .token, .drop, .kc__options")) return;
    if (C.rise && !lessons.some(function (l) { return l.classList.contains("is-active"); })) return;   // on the overview
    if (e.key === "ArrowRight") goTo(current + 1);
    if (e.key === "ArrowLeft") goTo(current - 1);
  });

  /* ---------- sidebar (mobile) ---------- */
  var sidebar = $("#sidebar"), backdrop = $("#backdrop");
  function openSidebar() {
    sidebar.classList.add("open"); backdrop.classList.add("show");
    $("#menuBtn").setAttribute("aria-expanded", "true");
    var first = $(".nav__item", sidebar); if (first) first.focus();
  }
  function closeSidebar() {
    sidebar.classList.remove("open"); backdrop.classList.remove("show");
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }
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
    var dark = currentlyDark();
    var label = dark ? "Switch to light mode" : "Switch to dark mode";
    var lbl = $("#themeLabel"); if (lbl) lbl.textContent = label;
    ["#themeIcon", "#themeIconTop"].forEach(function (sel) { var ic = $(sel); if (ic) ic.innerHTML = C.icon(dark ? "sun" : "moon"); });
    var top = $("#themeBtn"); if (top) top.setAttribute("aria-label", label);
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
      if (!replay && !isCorrect) retry.focus({ preventScroll: true });   // disabled options drop focus; land on Try again
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
    if (!el || !r.hasQuiz) return;        // reflection-led course: no graded quiz to score
    if (r.answered === 0) {
      el.textContent = "Answer the four questions above to see your score.";
    } else {
      el.innerHTML = "Final quiz score: <b>" + r.correct + " / " + r.total + "</b>" +
        (r.answered < r.total ? " · " + (r.total - r.answered) + " unanswered"
                              : (r.passed ? " · passed " + C.icon("check") : ""));
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
      var original = btn.innerHTML;
      btn.innerHTML = C.icon("check") + " Saved";
      setTimeout(function () { btn.innerHTML = original; }, 1400);
      C.announce("Note saved on this device");
      // emit length only — never the private content
      emit("reflection.save", { id: id, length: (ta.value || "").trim().length });
    });
  });

  /* ==========================================================================
     Matching (Bloom) — drag & drop, tap-to-place and keyboard
     Each token carries its own id (data-token) and its correct level
     (data-level); a drop accepts a level (data-accept). A level may hold
     several tokens, or none — so the exercise can't be solved by elimination.
     ========================================================================== */
  (function () {
    var wrap = $("[data-match='bloom']");
    if (!wrap) return;
    var tokens = $$(".token", wrap);
    var drops = $$(".drop", wrap);
    var selected = null;

    function levelName(drop) { return $(".drop__target", drop).textContent.trim(); }
    function tokenById(id) {
      return tokens.filter(function (t) { return t.getAttribute("data-token") === id; })[0];
    }
    function releaseToken(token) {
      token.classList.remove("placed");
      token.setAttribute("aria-pressed", "false");
    }

    function placeToken(token, drop) {
      // A token can only sit in one bucket: pull it out of wherever it is now.
      var existing = wrap.querySelector('.drop__chip[data-token="' + token.getAttribute("data-token") + '"]');
      if (existing) existing.parentNode.removeChild(existing);

      var slot = $(".drop__slot", drop);
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "drop__chip";
      chip.setAttribute("data-token", token.getAttribute("data-token"));
      chip.innerHTML = token.textContent + " " + C.icon("x");
      chip.setAttribute("aria-label", "Remove " + token.textContent + " from " + levelName(drop));
      chip.addEventListener("click", function (e) {
        e.stopPropagation();
        chip.parentNode.removeChild(chip);
        releaseToken(token);
        clearMarks();
        C.announce(token.textContent + " returned to the phrase list");
        token.focus();
      });
      slot.appendChild(chip);
      token.classList.add("placed");
      clearMarks();
      C.announce(token.textContent + " placed on " + levelName(drop));
    }

    function clearMarks() {
      drops.forEach(function (d) { d.classList.remove("correct", "incorrect"); });
      $$(".drop__chip", wrap).forEach(function (c) { c.classList.remove("is-right", "is-wrong"); });
      scoreEl.textContent = "";
    }

    tokens.forEach(function (t) {
      t.setAttribute("aria-pressed", "false");
      t.addEventListener("dragstart", function (e) {
        t.classList.add("dragging");
        e.dataTransfer.setData("text/plain", t.getAttribute("data-token"));
      });
      t.addEventListener("dragend", function () { t.classList.remove("dragging"); });
      function toggleSelect() {
        if (t.classList.contains("placed")) return;
        if (selected === t) { t.classList.remove("selected"); t.setAttribute("aria-pressed", "false"); selected = null; return; }
        tokens.forEach(function (x) { x.classList.remove("selected"); x.setAttribute("aria-pressed", "false"); });
        selected = t; t.classList.add("selected"); t.setAttribute("aria-pressed", "true");
        C.announce(t.textContent + " selected. Choose a Bloom's level to place it.");
      }
      t.addEventListener("click", toggleSelect);
      t.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(); }
      });
    });

    drops.forEach(function (d) {
      d.addEventListener("dragover", function (e) { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", function () { d.classList.remove("over"); });
      d.addEventListener("drop", function (e) {
        e.preventDefault(); d.classList.remove("over");
        var token = tokenById(e.dataTransfer.getData("text/plain"));
        if (token) placeToken(token, d);
      });
      d.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".drop__chip")) return;   // chip handles its own click
        if (selected) {
          var tok = selected;
          tok.classList.remove("selected");
          selected = null;
          placeToken(tok, d);
        } else if (e.target.closest && e.target.closest(".drop__target")) {
          C.announce("Select a phrase first, then choose a level.");
        }
      });
    });

    var scoreEl = $("[data-matchscore]", wrap);

    $("[data-check]", wrap).addEventListener("click", function () {
      var placed = tokens.filter(function (t) { return t.classList.contains("placed"); }).length;
      if (placed < tokens.length) {
        scoreEl.textContent = "Place all " + tokens.length + " phrases first (" + placed + "/" + tokens.length + ")";
        return;
      }
      var right = 0;
      drops.forEach(function (d) {
        var accept = d.getAttribute("data-accept");
        var chips = $$(".drop__chip", d);
        var allRight = chips.length > 0;
        chips.forEach(function (chip) {
          var token = tokenById(chip.getAttribute("data-token"));
          var ok = token && token.getAttribute("data-level") === accept;
          chip.classList.add(ok ? "is-right" : "is-wrong");
          if (ok) right++; else allRight = false;
        });
        if (chips.length) d.classList.add(allRight ? "correct" : "incorrect");
      });
      var perfect = right === tokens.length;
      scoreEl.textContent = right + " / " + tokens.length + " correct" +
        (perfect ? " — perfect!" : ". The ones marked in red are on the wrong level; select a phrase to move it.");
      C.announce(right + " of " + tokens.length + " placed correctly.");
      emit("interaction.complete", { id: "bloom-match", score: right, total: tokens.length });
      if (perfect && window.Confetti) window.Confetti.burst(wrap);
    });

    $("[data-reset]", wrap).addEventListener("click", function () {
      drops.forEach(function (d) { $(".drop__slot", d).innerHTML = ""; });
      tokens.forEach(function (t) { releaseToken(t); t.classList.remove("selected"); });
      selected = null;
      clearMarks();
      C.announce("Matching activity reset.");
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
    function activate(k, fromScrub, focusTab) {
      btns.forEach(function (x) {
        var on = x.getAttribute("data-tab") === k;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.setAttribute("tabindex", on ? "0" : "-1");
        if (on && focusTab) x.focus();
      });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-panel") === k); });
      if (scrub) { if (!fromScrub) scrub.value = k; scrub.setAttribute("aria-valuetext", "Level " + k); }
      seen[k] = true;
      emit("interaction.complete", { id: "nfq-tabs", value: k, seenCount: Object.keys(seen).length });
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { activate(b.getAttribute("data-tab")); });
      b.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % btns.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + btns.length) % btns.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = btns.length - 1;
        if (j === null) return;
        e.preventDefault();
        activate(btns[j].getAttribute("data-tab"), false, true);
      });
    });
    if (scrub) scrub.addEventListener("input", function () { activate(scrub.value, true); });
  });

  /* ==========================================================================
     Accordion
     ========================================================================== */
  $$("[data-accordion] .acc").forEach(function (acc, idx) {
    var head = $(".acc__head", acc);
    head.addEventListener("click", function () {
      var open = acc.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
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
    if (state.completed) finishBtn.innerHTML = C.icon("check") + " Course completed";
    finishBtn.addEventListener("click", function () {
      state.completed = true;
      state.completedSec[current] = true;
      finishBtn.innerHTML = C.icon("check") + " Course completed";
      C.announce("Course marked complete");
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
  C.goTo = goTo;
  C.currentLesson = function () { return current; };
  updateProgress();
  if (C.rise) C.rise.showOverview(); else goTo(current);
  updateFinalScore();
})();
