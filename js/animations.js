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

  /* Prepare/observe reveal targets inside a lesson when it becomes active. */
  function revealLesson(lessonEl) {
    if (!lessonEl) return;
    var targets = C.$$(REVEAL_SELECTOR, lessonEl);
    targets.forEach(function (el, i) {
      // reset so re-entering a lesson replays the entrance
      el.classList.remove("is-in");
      el.classList.add("reveal");
      if (reduce || !io) { el.classList.add("is-in"); return; }
      // small stagger for the first cluster (above the fold)
      el.style.setProperty("--rd", (Math.min(i, 6) * 65) + "ms");
      io.observe(el);
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
    countUp: countUp,
    pulse: pulse,
    reduce: reduce
  };
})();
