/* ==========================================================================
   Understanding Module Descriptors — Analytics (Phase 5)
   Per the agreed design, the primary analytics store is the LMS via SCORM
   interactions (see js/scorm.js). This module adds:
     1. A dev-only on-screen event inspector  (append ?debug=1 to the URL)
     2. A pluggable, DISABLED-by-default endpoint sink for non-LMS hosting
        (enable by setting Course.analytics.endpoint = "https://…").
   No third-party scripts, no external calls unless an endpoint is set.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Course;

  var api = { endpoint: null };

  /* ---- optional self-hosted sink (off unless an endpoint is configured) ---- */
  C.on("*", function (d) {
    if (!api.endpoint) return;
    try {
      var body = JSON.stringify({ course: "understanding-module-descriptors", event: d });
      if (navigator.sendBeacon) navigator.sendBeacon(api.endpoint, body);
      else fetch(api.endpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch (e) { /* never let analytics break the course */ }
  });

  /* ---- dev event inspector ---- */
  if (/[?&]debug=1/.test(location.search)) {
    var panel = document.createElement("div");
    panel.id = "ev-inspector";
    panel.style.cssText = [
      "position:fixed", "right:12px", "bottom:12px", "width:320px", "max-height:44vh",
      "overflow:auto", "background:#0f151a", "color:#cfe0de", "font:12px/1.5 monospace",
      "border:1px solid #33414c", "border-radius:10px", "z-index:99998",
      "box-shadow:0 10px 30px rgba(0,0,0,.4)"
    ].join(";");
    panel.innerHTML =
      '<div style="position:sticky;top:0;background:#141b21;padding:8px 12px;font-weight:bold;' +
      'border-bottom:1px solid #33414c;display:flex;justify-content:space-between">' +
      '<span>Event inspector' + (C.scorm && C.scorm.present ? " · SCORM ✓" : " · no LMS") + '</span>' +
      '<span id="ev-count">0</span></div><div id="ev-list" style="padding:6px 12px"></div>';
    document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(panel); });
    if (document.body) document.body.appendChild(panel);

    var n = 0;
    C.on("*", function (d) {
      n++;
      var list = document.getElementById("ev-list");
      var cnt = document.getElementById("ev-count");
      if (cnt) cnt.textContent = n;
      if (!list) return;
      var row = document.createElement("div");
      var extra = Object.keys(d).filter(function (k) { return k !== "event" && k !== "t"; })
        .map(function (k) { return k + ":" + JSON.stringify(d[k]); }).join(" ");
      row.innerHTML = '<span style="color:#46b3ac">' + d.event + '</span> ' +
        '<span style="color:#8598a0">' + extra + '</span>';
      list.insertBefore(row, list.firstChild);
    });
  }

  C.analytics = api;
})();
