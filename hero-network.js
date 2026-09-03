/* Animated network behind the .page-hero title.
   Nodes drift freely, so the topology keeps reforming: a link exists only
   while two nodes are within LINK of each other. Signals are seeded at a
   random *connected* node and relay outwards along those links. A pulse
   whose link stretches past the radius mid-flight is dropped with it, so a
   signal is never drawn where there is no edge.

   No-ops on pages without a .page-hero (index.html has its own hero). */
(function () {
  var host = document.querySelector('.page-hero');
  var cv = host && host.querySelector('.hero-net');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, raf = 0, last = 0, visible = true;
  var nodes = [], nbr = [], pulses = [], seedIn = 0, LINK = 100;
  var TARGET_DEGREE = 7, SPEED = 130, MAX_DEPTH = 5, MAX_PULSES = 110;
  var FANOUT = 2, RELAY = 0.72;

  function build() {
    var n = Math.round(Math.min(130, Math.max(30, (W * H) / 3500)));
    nodes = []; nbr = []; pulses = []; seedIn = 0;
    for (var i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 13, vy: (Math.random() - 0.5) * 13,
        r: 1.1 + Math.random() * 1.4, flash: 0
      });
      nbr.push([]);
    }
    // Pick the connection radius from the node density so the mean degree
    // stays put whatever the viewport is: E[deg] = pi * r^2 * n / (W*H).
    LINK = Math.max(60, Math.min(170, Math.sqrt(TARGET_DEGREE * W * H / (Math.PI * n))));
  }

  function neighbours() {
    for (var i = 0; i < nodes.length; i++) nbr[i].length = 0;
    var L2 = LINK * LINK;
    for (i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy > L2) continue;
        nbr[i].push(j); nbr[j].push(i);
      }
    }
  }

  function emit(from, depth, exclude, fanout) {
    var cand = [], list = nbr[from];
    for (var i = 0; i < list.length; i++) if (list[i] !== exclude) cand.push(list[i]);
    for (i = cand.length - 1; i > 0; i--) {          // Fisher-Yates
      var k = (Math.random() * (i + 1)) | 0, t = cand[i]; cand[i] = cand[k]; cand[k] = t;
    }
    var sent = 0;
    for (i = 0; i < cand.length && sent < fanout; i++) {
      if (pulses.length >= MAX_PULSES) return;
      if (depth > 0 && Math.random() > RELAY) continue;
      pulses.push({ a: from, b: cand[i], t: 0, depth: depth });
      sent++;
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Measure the canvas, not the hero: the hero box includes its 2px
    // bottom border, which would stretch the backing store vertically.
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, r.width), h = Math.max(1, r.height);
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (bw === cv.width && bh === cv.height) return;
    W = w; H = h;
    cv.width = bw; cv.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(); neighbours(); draw();
  }

  function step(dt) {
    for (var i = 0; i < nodes.length; i++) {
      var p = nodes[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0) { p.x = 0; p.vx = -p.vx; } else if (p.x > W) { p.x = W; p.vx = -p.vx; }
      if (p.y < 0) { p.y = 0; p.vy = -p.vy; } else if (p.y > H) { p.y = H; p.vy = -p.vy; }
      p.flash = Math.max(0, p.flash - dt * 1.7);
    }
    neighbours();

    seedIn -= dt;
    if (seedIn <= 0) {
      seedIn = 1.0 + Math.random() * 1.3;
      // Seed only where there is somewhere to send: an isolated node
      // lighting up would read as a signal with no edge under it.
      var linked = [];
      for (i = 0; i < nodes.length; i++) if (nbr[i].length) linked.push(i);
      if (linked.length) {
        var s = linked[(Math.random() * linked.length) | 0];
        nodes[s].flash = 1;
        emit(s, 0, -1, 3);
      }
    }

    for (i = pulses.length - 1; i >= 0; i--) {
      var q = pulses[i], a = nodes[q.a], b = nodes[q.b];
      var d = Math.hypot(b.x - a.x, b.y - a.y);
      // The nodes drift apart mid-flight: once the pair is out of range the
      // edge is gone, so the signal in transit on it goes too.
      if (d > LINK) { pulses.splice(i, 1); continue; }
      q.t += (SPEED * dt) / Math.max(d, 1);
      if (q.t >= 1) {
        b.flash = 1;
        pulses.splice(i, 1);
        if (q.depth + 1 < MAX_DEPTH) emit(q.b, q.depth + 1, q.a, FANOUT);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var carrying = {};
    for (var i = 0; i < pulses.length; i++) {
      var q = pulses[i];
      carrying[q.a < q.b ? q.a + ':' + q.b : q.b + ':' + q.a] = 1;
    }

    ctx.lineWidth = 0.8;
    for (i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var k = 0; k < nbr[i].length; k++) {
        var j = nbr[i][k];
        if (j < i) continue;
        var b = nodes[j];
        var t = 1 - Math.hypot(a.x - b.x, a.y - b.y) / LINK;
        var al = t * t * 0.30;
        if (carrying[i + ':' + j]) al = Math.max(al, 0.34);
        ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    ctx.lineWidth = 1.7; ctx.lineCap = 'round';
    for (i = 0; i < pulses.length; i++) {
      q = pulses[i];
      var s = nodes[q.a], e = nodes[q.b];
      var t1 = Math.min(q.t, 1), t0 = Math.max(0, q.t - 0.32);
      var x0 = s.x + (e.x - s.x) * t0, y0 = s.y + (e.y - s.y) * t0;
      var x1 = s.x + (e.x - s.x) * t1, y1 = s.y + (e.y - s.y) * t1;
      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(216,36,24,0)');
      g.addColorStop(1, 'rgba(255,116,92,0.9)');
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    for (i = 0; i < nodes.length; i++) {
      var v = nodes[i], f = v.flash;
      if (f > 0.01) {
        ctx.fillStyle = 'rgba(216,36,24,' + (f * 0.26).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(v.x, v.y, v.r + 8 * f, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,' + ((150 + 90 * (1 - f)) | 0) + ',' + ((140 + 100 * (1 - f)) | 0) + ',' + (0.5 + 0.45 * f).toFixed(3) + ')';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
      }
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r + 1.3 * f, 0, 6.2832); ctx.fill();
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt); draw();
  }

  function play() { if (!raf && !reduce && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  resize();
  // ResizeObserver rather than window.resize: it also catches the hero
  // growing when the title wraps, and it fires once on observe, which covers
  // the case where the first measurement ran before layout settled. Applied
  // straight away rather than debounced -- a debounce timer is throttled in
  // background tabs, which can leave the backing store stale and the artwork
  // stretched. The observer is already capped at once per frame, and resize()
  // returns immediately when the pixel size has not actually changed.
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(cv);
  } else {
    addEventListener('resize', resize);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? play() : pause(); })
      .observe(host);
  }
  play();
})();
