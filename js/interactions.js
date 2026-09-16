/* ==========================================================================
   Course interactions
   Each widget is a self-contained block and a no-op if its markup is absent.
   All of them emit tracking events through the Course event bus, so SCORM and
   analytics pick them up without any extra wiring.

   Generic, reusable widgets (knowledge checks, reflections, matching, tabs,
   accordion) live in js/app.js. This file holds the ones a course adds — and,
   at the end, two that are generic but only used when a course provides their
   markup: the scenario chooser and the checklist.
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
      items.forEach(function (it) { it.setAttribute("aria-pressed", it.classList.contains("on") ? "true" : "false"); });
      if (used === 0) { statusEl.textContent = ""; statusEl.className = "budget__status"; }
      else if (over) { statusEl.innerHTML = C.icon("warning") + " " + (used - BUDGET) + " h over budget"; statusEl.className = "budget__status is-over"; }
      else { statusEl.innerHTML = C.icon("check") + " " + (BUDGET - used) + " h to spare"; statusEl.className = "budget__status is-ok"; }
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
    function show(part, focusTab) {
      var d = DETAIL[part];
      detail.innerHTML = '<p class="anatomy__title">' + d[0] + "</p><p>" + d[1] + "</p>";
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-part") === part;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        if (on) { detail.setAttribute("aria-labelledby", t.id); if (focusTab) t.focus(); }
      });
      seen[part] = true;
      emit("interaction.complete", { id: "descriptor-anatomy", value: part, seenCount: Object.keys(seen).length });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(t.getAttribute("data-part")); });
      t.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % tabs.length;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault();
        show(tabs[j].getAttribute("data-part"), true);
      });
    });
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
        verdict.innerHTML = C.icon("check-circle") + " <strong>Aligned.</strong> Outcome, teaching and assessment all target <em>" + LEVELS[min] + "</em> — this is constructive alignment.";
      } else {
        var lo = ["outcome", "teaching", "assessment"][vals.indexOf(min)];
        var hi = ["outcome", "teaching", "assessment"][vals.indexOf(max)];
        verdict.className = "align__verdict is-off";
        verdict.innerHTML = C.icon("warning") + " <strong>Misaligned.</strong> Your <em>" + lo + "</em> sits at " + LEVELS[min] +
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
  /* ==========================================================================
     Checklist — a tickable self-audit with a progress ring. Generic: one block
     per [data-checklist], keyed by the attribute's value, emitting
     "<value>-checklist". The message shown under the ring comes from data-msgs
     (one message per score, 0..n, separated by "|").

     Markup:
       <div class="widget checklist" data-checklist="KEY"
            data-msgs="none yet|one|two|three|all four">
         <div class="checklist__grid">
           <label class="check"><input type="checkbox"> <span>…</span></label>
         </div>
         <div class="checklist__meter">
           <div class="checklist__ring" data-ring><span data-score>0/4</span></div>
           <p class="checklist__msg" data-msg role="status">none yet</p>
         </div>
       </div>
     ========================================================================== */
  $$("[data-checklist]").forEach(function (wrap) {
    var key = wrap.getAttribute("data-checklist") || "checklist";
    var boxes = $$('input[type="checkbox"]', wrap);
    var ring = $("[data-ring]", wrap), scoreEl = $("[data-score]", wrap), msg = $("[data-msg]", wrap);
    if (!boxes.length || !ring) return;

    var msgs = (wrap.getAttribute("data-msgs") || "").split("|");
    var touched = false;

    var saved = (state.interactions[key + "-checklist"] || {}).checked || [];
    boxes.forEach(function (b, i) { if (saved[i]) b.checked = true; });

    function render() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      scoreEl.textContent = n + "/" + boxes.length;
      ring.style.setProperty("--pct", (n / boxes.length) * 100 + "%");
      ring.classList.toggle("full", n === boxes.length);
      if (msg && msgs[n]) msg.textContent = msgs[n];
      state.interactions[key + "-checklist"] = {
        checked: boxes.map(function (b) { return b.checked; }), score: n
      };
      C.saveSoon();
    }

    boxes.forEach(function (b) {
      b.addEventListener("change", function () {
        render();
        if (!touched) { touched = true; emit("interaction.complete", { id: key + "-checklist" }); }
      });
    });
    render();
  });

  /* ==========================================================================
     Scenario chooser — a situation with several approaches, each carrying its
     own trade-off feedback. Deliberately NOT scored: learners are encouraged to
     open every option and compare, so "explored" counts options seen. Generic:
     one block per [data-scenario], emitting "<value>-scenario".

     Markup:
       <div class="widget scenario" data-scenario="KEY">
         <p class="scenario__setup">…the situation…</p>
         <div class="scenario__opts">
           <button class="scenario__opt" data-verdict="good|mixed|poor"
                   data-feedback="what this trades off">
             <span class="scenario__opt-k" aria-hidden="true">A</span>
             <span>…the approach…</span>
           </button>
         </div>
         <div class="scenario__fb" role="status"></div>
       </div>
     ========================================================================== */
  $$("[data-scenario]").forEach(function (wrap) {
    var key = wrap.getAttribute("data-scenario") || "scenario";
    var opts = $$(".scenario__opt", wrap);
    var fb = $(".scenario__fb", wrap);
    if (!opts.length || !fb) return;

    var saved = state.interactions[key + "-scenario"] || {};
    var seen = saved.seen || {};

    var VERDICT = {
      good:  { icon: "check-circle", label: "Strong choice" },
      mixed: { icon: "scale",        label: "Workable, with trade-offs" },
      poor:  { icon: "warning",      label: "High risk" }
    };

    function show(opt) {
      var verdict = opt.getAttribute("data-verdict") || "mixed";
      var v = VERDICT[verdict] || VERDICT.mixed;
      opts.forEach(function (o) { o.classList.toggle("is-chosen", o === opt); });
      opt.classList.add("is-seen");
      fb.className = "scenario__fb show is-" + verdict;
      fb.innerHTML = '<p class="scenario__verdict">' + C.icon(v.icon) + " <strong>" + v.label + "</strong></p>" +
        "<p>" + opt.getAttribute("data-feedback") + "</p>";

      var i = opts.indexOf(opt);
      seen[i] = true;
      state.interactions[key + "-scenario"] = { seen: seen };
      C.saveSoon();
      emit("interaction.complete", {
        id: key + "-scenario", choice: i, verdict: verdict,
        seenCount: Object.keys(seen).length, of: opts.length
      });
    }

    // Restore which options were already opened, without re-firing the event.
    opts.forEach(function (o, i) { if (seen[i]) o.classList.add("is-seen"); });

    opts.forEach(function (o) {
      o.addEventListener("click", function () { show(o); });
    });
  });
})();
