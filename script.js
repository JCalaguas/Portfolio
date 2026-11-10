(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  function setThemeLabel() {
    var light = root.getAttribute("data-theme") === "light";
    themeBtn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  }
  setThemeLabel();
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    setThemeLabel();
    if (reduced) drawFrame(0);
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menu-btn");
  var links = document.getElementById("nav-links");
  function closeMenu() {
    links.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open menu");
  }
  menuBtn.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---------- Face mesh ---------- */
  var canvas = document.getElementById("mesh");
  var label = document.querySelector(".mesh-label");
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1;

  // Face model in a -1..1 box. Eye points are tagged so they can "blink".
  var pts = [];
  function add(x, y, tag) { pts.push({ x: x, y: y, tag: tag || "" }); }

  var i, a;
  for (i = 0; i < 28; i++) {                       // jaw and face outline
    a = (i / 28) * Math.PI * 2;
    add(Math.cos(a) * 0.62, Math.sin(a) * 0.82 + 0.02);
  }
  function eye(cx, side) {                          // eye contour
    for (var k = 0; k < 8; k++) {
      var t = (k / 8) * Math.PI * 2;
      add(cx + Math.cos(t) * 0.14, -0.12 + Math.sin(t) * 0.06, "eye" + side);
    }
  }
  eye(-0.25, "L"); eye(0.25, "R");
  for (i = 0; i < 5; i++) {                         // brows
    add(-0.4 + i * 0.075, -0.3 - Math.sin((i / 4) * Math.PI) * 0.05);
    add(0.1 + i * 0.075, -0.3 - Math.sin((i / 4) * Math.PI) * 0.05);
  }
  for (i = 0; i < 5; i++) add(0, -0.08 + i * 0.07); // nose bridge
  add(-0.08, 0.22); add(0.08, 0.22);                // nostrils
  for (i = 0; i < 10; i++) {                        // mouth
    a = (i / 10) * Math.PI * 2;
    add(Math.cos(a) * 0.2, 0.44 + Math.sin(a) * 0.06);
  }
  var seed = 7;                                     // fixed pseudo-random fill
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (i = 0; i < 14; i++) {
    var rx, ry;
    do { rx = rnd() * 1.2 - 0.6; ry = rnd() * 1.6 - 0.78; }
    while ((rx * rx) / 0.33 + (ry * ry) / 0.6 > 1);
    add(rx, ry, "fill");
  }

  // Connect each point to its nearest neighbours once.
  var edges = [];
  (function () {
    var seen = {};
    for (var p = 0; p < pts.length; p++) {
      var d = [];
      for (var q = 0; q < pts.length; q++) {
        if (p === q) continue;
        var dx = pts[p].x - pts[q].x, dy = pts[p].y - pts[q].y;
        d.push({ q: q, d: dx * dx + dy * dy });
      }
      d.sort(function (m, n) { return m.d - n.d; });
      for (var k = 0; k < 3; k++) {
        var key = Math.min(p, d[k].q) + "-" + Math.max(p, d[k].q);
        if (!seen[key]) { seen[key] = 1; edges.push([p, d[k].q]); }
      }
    }
  })();

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function colors() {
    var s = getComputedStyle(root);
    var light = root.getAttribute("data-theme") === "light";
    return {
      line: light ? "rgba(15,76,92,0.28)" : "rgba(234,244,248,0.22)",
      dot: light ? "rgba(15,76,92,0.7)" : "rgba(234,244,248,0.75)",
      focus: light ? s.getPropertyValue("--petrol").trim() : s.getPropertyValue("--lime").trim()
    };
  }

  var lastLabel = "";
  function setLabel(text) {
    if (text === lastLabel || !label) return;
    lastLabel = text;
    label.lastChild.nodeValue = " " + text;
  }

  function drawFrame(t) {
    var c = colors();
    ctx.clearRect(0, 0, W, H);
    var s = Math.min(W, H) * 0.42;
    var cx = W / 2, cy = H * 0.47;
    var yaw = reduced ? 0 : Math.sin(t / 2600) * 0.22;      // gentle head turn
    var nod = reduced ? 0 : Math.sin(t / 3700) * 0.03;

    // Blink every ~4.5s: eye height shrinks and recovers.
    var phase = (t % 4500) / 4500;
    var blink = 1;
    if (!reduced && phase > 0.9) blink = Math.max(0.08, Math.abs(Math.cos(((phase - 0.9) / 0.1) * Math.PI)));
    setLabel(blink < 0.5 ? "tracking · blink" : "tracking · eyes open");

    var proj = pts.map(function (p) {
      var y = p.y;
      if (p.tag === "eyeL" || p.tag === "eyeR") y = -0.12 + (p.y + 0.12) * blink;
      var depth = Math.sqrt(Math.max(0, 1 - (p.x * p.x) / 0.5));
      var x = p.x * Math.cos(yaw) + depth * 0.35 * Math.sin(yaw);
      return { x: cx + x * s, y: cy + (y + nod) * s };
    });

    ctx.lineWidth = 1;
    ctx.strokeStyle = c.line;
    ctx.beginPath();
    edges.forEach(function (e) {
      ctx.moveTo(proj[e[0]].x, proj[e[0]].y);
      ctx.lineTo(proj[e[1]].x, proj[e[1]].y);
    });
    ctx.stroke();

    ctx.fillStyle = c.dot;
    proj.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    // Focus marker on the left eye (the one the detector "watches").
    var ex = 0, ey = 0, n = 0;
    pts.forEach(function (p, idx) { if (p.tag === "eyeL") { ex += proj[idx].x; ey += proj[idx].y; n++; } });
    ex /= n; ey /= n;
    var pulse = reduced ? 1 : 1 + Math.sin(t / 400) * 0.15;
    ctx.fillStyle = c.focus;
    ctx.beginPath(); ctx.arc(ex, ey, 5 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.focus; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ex, ey, 14 * pulse, 0, Math.PI * 2); ctx.stroke();
  }

  var running = false;
  function loop(t) { drawFrame(t); if (running) requestAnimationFrame(loop); }

  resize();
  window.addEventListener("resize", function () { resize(); if (reduced) drawFrame(0); });

  if (reduced) {
    drawFrame(0);
  } else if ("IntersectionObserver" in window) {
    // Only animate while the hero is on screen.
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(loop); }
      else if (!vis) running = false;
    }).observe(canvas);
  } else {
    running = true; requestAnimationFrame(loop);
  }
})();
