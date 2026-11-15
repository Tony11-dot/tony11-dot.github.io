// ClassNotes landing page: the 3D iPad (pointer + scroll), the Pencil writing,
// and quiet reveals. No libraries, no network. Everything still reads without it.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── fit the fixed-size scene to its column ── */
  var stage = document.querySelector('.stage');
  var scene = stage && stage.querySelector('.scene');
  function fit() {
    if (!stage) return;
    var avail = stage.parentElement.clientWidth;
    var s = Math.min(1, avail / 640);
    stage.style.setProperty('--s', s.toFixed(4));
  }
  if (stage && 'ResizeObserver' in window) new ResizeObserver(fit).observe(stage.parentElement);
  fit();

  /* ── reveals ── */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  if (!scene) return;
  var tablet = scene.querySelector('.tablet');
  var pencil = scene.querySelector('.pencil');
  var pshadow = scene.querySelector('.pshadow');
  var strokes = Array.prototype.slice.call(scene.querySelectorAll('.ink path'));
  var base = { rx: 7, ry: -17 };

  /* ── pencil + ink ── */
  var OX = 20.5, OY = 20.5;                      // screen inset inside the tablet
  var lens = strokes.map(function (p) { return p.getTotalLength(); });
  var SPEED = 150, LIFT = 0.16, HOLD = 3.2, FADE = 0.7;   // units/s, seconds
  var plan = [], t = 0;
  strokes.forEach(function (p, i) {
    var start = t, d = lens[i] / SPEED;
    plan.push({ el: p, len: lens[i], t0: start, t1: start + d });
    t += d + LIFT;
  });
  var writeEnd = t - LIFT, cycle = writeEnd + HOLD + FADE + 0.5;
  strokes.forEach(function (p, i) { p.style.strokeDasharray = lens[i]; });

  function pose(x, y, z) {
    pencil.style.transform = 'translate3d(' + (OX + x - 10) + 'px,' + (OY + y - 330) + 'px,' + z + 'px) rotateZ(34deg) rotateX(-46deg)';
    pshadow.style.transform = 'translate3d(' + (OX + x + 9 + z * 0.35) + 'px,' + (OY + y + 8 + z * 0.5) + 'px,1.8px)';
    pshadow.style.opacity = z > 8 ? 0.45 : 0.9;
  }
  var rest = { x: 400, y: 330 };
  function showStill() {
    plan.forEach(function (s) { s.el.style.strokeDashoffset = 0; s.el.style.opacity = 1; });
    var last = plan[plan.length - 1];
    var pt = last.el.getPointAtLength(last.len);
    pose(pt.x + 40, pt.y + 56, 26);
  }
  var t00 = null;
  function frame(ts) {
    if (t00 === null) t00 = ts;
    var tt = ((ts - t00) / 1000) % cycle;
    var fade = 1, tipX = rest.x, tipY = rest.y, z = 26;
    if (tt > writeEnd + HOLD) fade = Math.max(0, 1 - (tt - writeEnd - HOLD) / FADE);
    var cur = null, prev = null;
    for (var i = 0; i < plan.length; i++) {
      var s = plan[i];
      if (tt >= s.t1) { s.el.style.strokeDashoffset = 0; prev = s; }
      else if (tt >= s.t0) { var k = (tt - s.t0) / (s.t1 - s.t0); s.el.style.strokeDashoffset = s.len * (1 - k); cur = { s: s, k: k }; }
      else s.el.style.strokeDashoffset = s.len;
      s.el.style.opacity = fade;
    }
    if (cur) {
      var p = cur.s.el.getPointAtLength(cur.s.len * cur.k);
      tipX = p.x; tipY = p.y; z = 3;
    } else if (tt < writeEnd) {            // lifted between strokes: glide to the next start
      var nx = null;
      for (var j = 0; j < plan.length; j++) if (plan[j].t0 > tt) { nx = plan[j]; break; }
      if (nx) {
        var from = prev ? prev.el.getPointAtLength(prev.len) : { x: rest.x, y: rest.y };
        var to = nx.el.getPointAtLength(0);
        var a = prev ? prev.t1 : 0, b = nx.t0, m = b > a ? (tt - a) / (b - a) : 1;
        m = m * m * (3 - 2 * m);
        tipX = from.x + (to.x - from.x) * m; tipY = from.y + (to.y - from.y) * m;
        z = 3 + 18 * Math.sin(Math.PI * m);
      }
    } else {                                // resting off the page while it holds
      var l = plan[plan.length - 1], q = l.el.getPointAtLength(l.len);
      var m2 = Math.min(1, (tt - writeEnd) / 0.8); m2 = m2 * m2 * (3 - 2 * m2);
      tipX = q.x + 28 * m2; tipY = q.y + 56 * m2; z = 3 + 24 * m2;
    }
    pose(tipX, tipY, z);
  }

  /* ── tilt: pointer + scroll, eased ── */
  var hero = document.querySelector('.hero');
  var target = { rx: base.rx, ry: base.ry }, cur3 = { rx: base.rx, ry: base.ry };
  var scrollP = 0, running = false, visible = true;
  function onMove(e) {
    var r = stage.getBoundingClientRect();
    var nx = ((e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 400));
    var ny = ((e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 400));
    nx = Math.max(-1.2, Math.min(1.2, nx)); ny = Math.max(-1.2, Math.min(1.2, ny));
    target.ry = base.ry + nx * 15; target.rx = base.rx - ny * 11;
    kick();
  }
  function onScroll() {
    var h = hero ? hero.offsetHeight : 700;
    scrollP = Math.max(0, Math.min(1, window.scrollY / h));
    kick();
  }
  function kick() { if (!running && visible) { running = true; requestAnimationFrame(loop); } }
  function loop(ts) {
    if (!visible) { running = false; return; }
    cur3.rx += (target.rx - cur3.rx) * 0.09; cur3.ry += (target.ry - cur3.ry) * 0.09;
    // The iPad turns gently by itself, so it is seen in 3D where there is no pointer (phones, iPads).
    var sway = (ts || 0) / 1000;
    var ry = cur3.ry + scrollP * 24 + Math.sin(sway * 0.7) * 9, rx = cur3.rx - scrollP * 8 + Math.sin(sway * 0.5 + 1) * 3.5;
    tablet.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    tablet.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    tablet.style.setProperty('--rz', (scrollP * -3).toFixed(2) + 'deg');
    tablet.style.setProperty('--gx', (60 - ry * 3.2).toFixed(1) + '%');
    stage.style.setProperty('--ry-n', (ry / 20).toFixed(3));
    stage.style.transform = 'translateY(' + (scrollP * -26).toFixed(1) + 'px)';
    frame(ts);
    requestAnimationFrame(loop);
  }

  function start() {
    if (reduce.matches) {
      tablet.style.setProperty('--rx', '7deg'); tablet.style.setProperty('--ry', '-17deg');
      showStill();
      return;
    }
    running = false;
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
    }
    kick();
  }
  start();
  reduce.addEventListener && reduce.addEventListener('change', function () { location.reload(); });
})();
