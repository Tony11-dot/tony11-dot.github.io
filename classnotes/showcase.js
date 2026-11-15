// The pinned 3D iPad, ported from ClassMate's site (marketing/public/app.js, "Showcase"):
// one device spins continuously (a half-turn per step) and moves side to side between the
// texts; only the face turned away is ever swapped (front = even screens, back = odd), so
// the right screen is upright at each stop. GSAP ScrollTrigger drives it, as on
// classmateapp.org. Every screen is in the page from the start (stacked, shown by class),
// so a face never turns round blank.
// `?sc=0.42` holds the progress there (and scrolls there), for screenshots.
(function () {
  var wrap = document.querySelector('.sc-wrap');
  if (!wrap) return;
  var box = wrap.querySelector('.sc-3d');
  var front = wrap.querySelectorAll('.sc-front .sc-scr img');
  var back = wrap.querySelectorAll('.sc-back .sc-scr img');
  var copies = Array.prototype.slice.call(wrap.querySelectorAll('.sc-copy'));
  var animates = window.gsap && window.ScrollTrigger && box && front.length && back.length && copies.length &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!animates) {
    // No animation here: the still row of screens is shown instead (showcase.css).
    wrap.classList.add('no-anim');
    document.documentElement.classList.add('sc-off');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  var N = copies.length, seg = N - 1;
  var pin = new URLSearchParams(location.search).get('sc');
  // How far the iPad travels each side: ClassMate's rule, held inside the window.
  function ampX() {
    return Math.max(0, Math.min(window.innerWidth * 0.26, 460, window.innerWidth / 2 - box.offsetWidth / 2 - 12));
  }
  function show(list, s) {
    for (var i = 0; i < list.length; i++) list[i].classList.toggle('on', list[i].getAttribute('data-s') === String(s));
  }
  function setFaces(from) {
    var a = Math.max(0, Math.min(N - 1, from)), b = Math.max(0, Math.min(N - 1, from + 1));
    show(front, a % 2 === 0 ? a : b);                         // only the hidden face is swapped
    show(back, a % 2 === 0 ? b : a);
  }
  // What the scene looks like at progress p: the one place it is decided.
  function applyProgress(p) {
    var a = ampX();
    var x = -a * Math.cos(p * seg * Math.PI);                 // side to side
    var tiltY = a > 0 ? (x / a) * -24 : -24 * -Math.cos(p * seg * Math.PI);   // leans toward the centre at a stop
    var rotY = p * seg * 180 + tiltY;                         // continuous spin
    var tiltX = Math.sin(p * seg * Math.PI * 2) * 5;          // subtle tumble
    gsap.set(box, { rotationY: rotY, x: x, rotationX: tiltX });
    setFaces(Math.floor(p * seg + 1e-4));
    var cur = Math.round(p * seg);
    copies.forEach(function (c, i) { c.classList.toggle('is-active', i === cur); });
  }

  setFaces(0);
  copies.forEach(function (c, i) { c.classList.toggle('is-active', i === 0); });
  gsap.set(box, { x: -ampX(), rotationY: 24, rotationX: 0 });

  if (pin !== null) {                                         // test hook: hold the progress
    var p = Math.max(0, Math.min(1, parseFloat(pin) || 0));
    var go = function () {
      var top = wrap.getBoundingClientRect().top + window.pageYOffset;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, top + p * (wrap.offsetHeight - window.innerHeight));
      applyProgress(p);
    };
    go(); window.addEventListener('load', go);
    var n = 0, t = setInterval(function () { go(); if (++n > 8) clearInterval(t); }, 250);
    return;
  }

  var st = ScrollTrigger.create({
    trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,
    onUpdate: function (self) { applyProgress(self.progress); },
  });
  // Work out the trigger's place, then show the scene for where the page really is
  // (a refresh can restore a scroll position half way down).
  ScrollTrigger.refresh();
  applyProgress(st.progress);
  window.addEventListener('load', function () { ScrollTrigger.refresh(); applyProgress(st.progress); });
  if (new URLSearchParams(location.search).get('scplay') !== null) {   // test hook: REAL scrolling through the section
    window.addEventListener('load', function () {
      var top = wrap.getBoundingClientRect().top + window.pageYOffset, len = wrap.offsetHeight - window.innerHeight, t0 = performance.now();
      document.documentElement.style.scrollBehavior = 'auto';
      (function step(now) { var k = Math.min(1, (now - t0) / 20000); window.scrollTo(0, top + k * len); if (k < 1) requestAnimationFrame(step); })(t0);
    });
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { ScrollTrigger.refresh(); applyProgress(st.progress); }, 200);
  });
})();
