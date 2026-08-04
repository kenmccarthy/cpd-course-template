/* ==========================================================================
   Understanding Module Descriptors — Extra interactions (Phase 2)
   New activities that emit tracking events via Course core.
   Each is a self-contained IIFE and a no-op if its markup isn't present.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course;
  var $ = C.$, $$ = C.$$;
  var emit = C.emit, state = C.state;

  /* ==========================================================================
     §4 — Workload budget: build an assessment plan within 76 independent hours
     ========================================================================== */
  (function () {
    var wrap = $("[data-budget]");
    if (!wrap) return;
    var BUDGET = 76;
    var items = $$(".budget__item", wrap);
    var fill = $("#budgetFill"), usedEl = $("#budgetUsed"), statusEl = $("#budgetStatus");
    var touched = false;

    // restore
    var saved = (state.interactions["workload-budget"] || {}).on || {};
    items.forEach(function (it, i) { if (saved[i]) it.classList.add("on"); });

    function render() {
      var used = 0, on = {};
      items.forEach(function (it, i) {
        if (it.classList.contains("on")) { used += +it.getAttribute("data-hours"); on[i] = true; }
      });
      var pct = Math.min(100, (used / BUDGET) * 100);
      var over = used > BUDGET;
      fill.style.width = pct + "%";
      fill.classList.toggle("over", over);
      usedEl.textContent = used + " h";
      if (used === 0) { statusEl.textContent = ""; statusEl.className = "budget__status"; }
      else if (over) { statusEl.textContent = "⚠ " + (used - BUDGET) + " h over budget"; statusEl.className = "budget__status is-over"; }
      else { statusEl.textContent = "✓ " + (BUDGET - used) + " h to spare"; statusEl.className = "budget__status is-ok"; }
      state.interactions["workload-budget"] = { on: on, used: used, over: over };
      C.saveSoon();
    }

    items.forEach(function (it) {
      it.addEventListener("click", function () {
        it.classList.toggle("on");
        render();
        if (!touched) { touched = true; emit("interaction.complete", { id: "workload-budget" }); }
      });
    });
    render();
  })();

  /* ==========================================================================
     §5 — Readiness checklist: tick confidence, build a 0–4 readiness score
     ========================================================================== */
  (function () {
    var wrap = $("[data-readiness]");
    if (!wrap) return;
    var boxes = $$('input[type="checkbox"]', wrap);
    var ring = $("#readyRing"), scoreEl = $("#readyScore"), msg = $("#readyMsg");
    var MSGS = [
      "Tick what you're confident about to see your readiness.",
      "A good start — one habit in place.",
      "Halfway there — you're building the method.",
      "Nearly there — three of four in hand.",
      "Descriptor-ready. You've got the full method. 🎓"
    ];
    var touched = false;

    var saved = (state.interactions["readiness"] || {}).checked || [];
    boxes.forEach(function (b, i) { if (saved[i]) b.checked = true; });

    function render() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      var pct = (n / boxes.length) * 100;
      scoreEl.textContent = n + "/" + boxes.length;
      ring.style.setProperty("--pct", pct + "%");
      ring.classList.toggle("full", n === boxes.length);
      msg.textContent = MSGS[n];
      state.interactions["readiness"] = { checked: boxes.map(function (b) { return b.checked; }), score: n };
      C.saveSoon();
    }
    boxes.forEach(function (b) {
      b.addEventListener("change", function () {
        render();
        if (!touched) { touched = true; emit("interaction.complete", { id: "readiness" }); }
      });
    });
    render();
  })();

  /* Shared: Bloom level names, 1–6 */
  var LEVELS = ["", "Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];

  /* ==========================================================================
     §1 — Anatomy of a descriptor: click a part to reveal what it tells you
     ========================================================================== */
  (function () {
    var wrap = $("[data-anatomy]");
    if (!wrap) return;
    var DETAIL = {
      title: ["Title, code &amp; credits", "Names the module and sets its <strong>ECTS credit value</strong> — your first clue to how much total student effort the module represents (see the ECTS section)."],
      nfq: ["NFQ level", "Sets the <strong>level of independence and critical thinking</strong> expected. It tells you how much to challenge — and how much to scaffold — for your students."],
      outcomes: ["Learning outcomes", "The engine of the descriptor: what students must be able to <strong>do</strong> by the end. The action verbs signal the Bloom's level your teaching and assessment must reach."],
      content: ["Indicative content", "The syllabus topics. Note the word <em>indicative</em> — it guides coverage, but the outcomes decide what's essential, not the other way around."],
      assessment: ["Assessment strategy", "How students demonstrate the outcomes. For <strong>constructive alignment</strong>, this must test at the same cognitive level the outcomes demand."]
    };
    var tabs = $$(".anatomy__tab", wrap);
    var detail = $("#anatomyDetail");
    var seen = {};
    function show(part) {
      var d = DETAIL[part];
      detail.innerHTML = "<h4>" + d[0] + "</h4><p>" + d[1] + "</p>";
      tabs.forEach(function (t) { t.classList.toggle("is-active", t.getAttribute("data-part") === part); });
      seen[part] = true;
      emit("interaction.complete", { id: "descriptor-anatomy", value: part, seenCount: Object.keys(seen).length });
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-part")); }); });
    show("title");
  })();

  /* ==========================================================================
     §2 — Build a learning outcome
     ========================================================================== */
  (function () {
    var wrap = $("[data-builder]");
    if (!wrap) return;
    var verb = $("#bVerb"), obj = $("#bObject"), std = $("#bStandard");
    var levelEl = $("#bLevel"), sentence = $("#bSentence");
    var used = false;
    function render() {
      var opt = verb.options[verb.selectedIndex];
      var lvl = +opt.getAttribute("data-level");
      var v = opt.textContent;
      levelEl.textContent = LEVELS[lvl];
      levelEl.setAttribute("data-level", lvl);
      sentence.innerHTML = "&ldquo;<strong>" + v + "</strong> " + obj.value + " " + std.value + ".&rdquo;";
    }
    [verb, obj, std].forEach(function (el) {
      el.addEventListener("change", function () {
        render();
        if (!used) { used = true; emit("interaction.complete", { id: "outcome-builder" }); }
      });
    });
    render();
  })();

  /* ==========================================================================
     §2 — Alignment checker: do outcome / teaching / assessment match level?
     ========================================================================== */
  (function () {
    var wrap = $("[data-align]");
    if (!wrap) return;
    var selects = [$("#alOutcome"), $("#alTeach"), $("#alAssess")];
    var defaults = [6, 3, 6];   // outcome Create, teaching Apply, assess Create -> misaligned to start
    selects.forEach(function (sel, i) {
      for (var l = 1; l <= 6; l++) {
        var o = document.createElement("option");
        o.value = l; o.textContent = LEVELS[l];
        if (l === defaults[i]) o.selected = true;
        sel.appendChild(o);
      }
    });
    var verdict = $("#alignVerdict");
    var used = false;
    function render() {
      var vals = selects.map(function (s) { return +s.value; });
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      if (min === max) {
        verdict.className = "align__verdict is-ok";
        verdict.innerHTML = "✓ <strong>Aligned.</strong> Outcome, teaching and assessment all target <em>" + LEVELS[min] + "</em> — this is constructive alignment.";
      } else {
        var lo = ["outcome", "teaching", "assessment"][vals.indexOf(min)];
        var hi = ["outcome", "teaching", "assessment"][vals.indexOf(max)];
        verdict.className = "align__verdict is-off";
        verdict.innerHTML = "⚠ <strong>Misaligned.</strong> Your <em>" + lo + "</em> sits at " + LEVELS[min] +
          " but your <em>" + hi + "</em> reaches " + LEVELS[max] + ". Students may be tested above what they were taught.";
      }
    }
    selects.forEach(function (s) {
      s.addEventListener("change", function () {
        render();
        if (!used) { used = true; emit("interaction.complete", { id: "alignment-check" }); }
      });
    });
    render();
  })();

  /* ==========================================================================
     §3 — Pitch check: match each task to its NFQ level
     ========================================================================== */
  (function () {
    var wrap = $("[data-pitch]");
    if (!wrap) return;
    var cards = $$(".pitch__card", wrap);
    var done = {};
    cards.forEach(function (card, idx) {
      var answer = card.getAttribute("data-answer");
      var opts = $$("button", card);
      var fb = $(".pitch__fb", card);
      opts.forEach(function (o) {
        o.addEventListener("click", function () {
          if (card.classList.contains("answered")) return;
          var chosen = o.getAttribute("data-lvl");
          var correct = chosen === answer;
          opts.forEach(function (x) {
            x.disabled = true;
            if (x.getAttribute("data-lvl") === answer) x.classList.add("right");
            else if (x === o) x.classList.add("wrong");
          });
          card.classList.add("answered");
          fb.className = "pitch__fb show " + (correct ? "good" : "bad");
          fb.textContent = correct
            ? "Correct — that's a Level " + answer + " task."
            : "Not quite — this is best pitched at Level " + answer + ".";
          done[idx] = correct;
          emit("knowledge_check.answer", { id: "pitch-" + (idx + 1), choice: chosen, correct: correct });
        });
      });
    });
  })();
})();
