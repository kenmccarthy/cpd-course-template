/* ==========================================================================
   Understanding Module Descriptors — Animation helpers (Phase 1)
   Scroll-reveal, count-ups, and self-building SVG diagrams.
   All motion is gated behind prefers-reduced-motion (Course.reduceMotion).
   Exposes: Course.anim
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course;
  var $$ = C.$$;
  var reduce = C.reduceMotion;

  /* Blocks that get a staggered entrance as they scroll into view. */
  var REVEAL_SELECTOR = [
    ".cover", ".statement", ".card", ".callout", ".figure", ".kc",
    ".reflect", ".match", ".tabs", ".calc", ".accordion", ".deflist",
    ".complete", ".widget", ".lesson > h2"
  ].join(",");

  /* One IntersectionObserver reused across lessons. */
  var io = null;
  if (!reduce && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }

  /* Prepare/observe reveal targets inside a lesson when it becomes active.
     opts.settleAboveFold: blocks already in the viewport are shown at once (no stagger) —
     used when the lesson itself is sliding in, so there is one motion, not two. */
  function revealLesson(lessonEl, opts) {
    if (!lessonEl) return;
    opts = opts || {};
    var targets = C.$$(REVEAL_SELECTOR, lessonEl);
    var vh = window.innerHeight || 800;
    targets.forEach(function (el, i) {
      // reset so re-entering a lesson replays the entrance
      el.classList.remove("is-in");
      el.classList.add("reveal");
      if (reduce || !io) { el.classList.add("is-in"); return; }
      if (opts.settleAboveFold && el.getBoundingClientRect().top < vh) {
        el.style.setProperty("--rd", "0ms");
        el.classList.add("is-in");
        return;
      }
      // small stagger for the first cluster (above the fold)
      el.style.setProperty("--rd", (Math.min(i, 6) * 65) + "ms");
      io.observe(el);
    });
  }

  /* Reveal a specific set of nodes (used when a Continue gate opens). */
  function revealNodes(nodes) {
    nodes.forEach(function (el, i) {
      el.classList.remove("is-in");
      el.classList.add("reveal");
      if (reduce) { el.classList.add("is-in"); return; }
      el.style.setProperty("--rd", (Math.min(i, 6) * 70) + "ms");
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-in"); }); });
    });
  }

  /* Animated integer count-up. Respects reduced motion. */
  function countUp(el, to, opts) {
    opts = opts || {};
    to = Number(to);
    if (!el) return;
    var from = opts.from != null ? Number(opts.from) : (parseFloat(el.textContent) || 0);
    var suffix = opts.suffix || "";
    if (reduce || from === to) { el.textContent = to + suffix; return; }
    var dur = opts.dur || 480;
    var start = performance.now();
    (function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);                 // easeOutCubic
      el.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = to + suffix;
    })(start);
  }

  /* A short attention pulse (used on progress / completion). */
  function pulse(el) {
    if (!el || reduce) return;
    el.classList.remove("pulse");
    void el.offsetWidth;               // reflow to restart animation
    el.classList.add("pulse");
  }

  C.anim = {
    revealLesson: revealLesson,
    revealNodes: revealNodes,
    countUp: countUp,
    pulse: pulse,
    reduce: reduce
  };
})();
