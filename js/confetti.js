/* ==========================================================================
   Tiny canvas confetti in SETU colours. No dependencies.
   Silent no-op under prefers-reduced-motion. Exposes window.Confetti.
   ========================================================================== */
(function () {
  "use strict";
  var COLORS = ["#e74751", "#fcca3a", "#a752a0", "#2ac5f4", "#5f5aa8", "#0062af", "#4eb47d", "#378b84"];
  var reduce = window.Course ? window.Course.reduceMotion
             : (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function burst(anchor, opts) {
    if (reduce) return;
    opts = opts || {};
    var rect = anchor && anchor.getBoundingClientRect
      ? anchor.getBoundingClientRect()
      : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var ox = rect.left + rect.width / 2;
    var oy = rect.top + rect.height / 2;

    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
    canvas.width = innerWidth; canvas.height = innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    var N = opts.count || 90;
    var parts = [];
    for (var i = 0; i < N; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 4 + Math.random() * 7;
      parts.push({
        x: ox, y: oy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        g: 0.16 + Math.random() * 0.1,
        s: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 0, max: 70 + Math.random() * 40
      });
    }

    var raf;
    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        if (p.life > p.max) continue;
        alive = true;
        p.life++;
        p.vy += p.g;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(frame);
      else { cancelAnimationFrame(raf); canvas.remove(); }
    })();
  }

  window.Confetti = { burst: burst };
})();
