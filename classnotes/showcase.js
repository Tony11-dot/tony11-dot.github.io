// The pinned 3D iPad: one device zig-zags left and right as you scroll, turns a half-turn per
// step and flips to the next screenshot. Only the face turned away is ever swapped (front =
// even screens, back = odd), so the right screen is upright at each stop. Vanilla JS: scroll
// progress comes from the section's rect and is eased in rAF; it only runs while on screen.
// `?sc=0.42` pins the progress (and scrolls there), for screenshots.
(function () {
  var wrap = document.querySelector('.sc-wrap');
  if (!wrap) return;
  var box = wrap.querySelector('.sc-3d');
  var front = wrap.querySelector('.sc-shot-f');
  var back = wrap.querySelector('.sc-shot-b');
  var copies = Array.prototype.slice.call(wrap.querySelectorAll('.sc-copy'));
  if (!box || !front || !back || !copies.length) return;

  var N = copies.length, seg = N - 1;
  var SRC = copies.map(function (c) { return c.getAttribute('data-img'); });
  var ALT = copies.map(function (c) { return c.getAttribute('data-alt') || ''; });
  var pin = new URLSearchParams(location.search).get('sc');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 768px)');
  var cur = 0, target = 0, on = false, running = false;

  function ampX() { return Math.min(window.innerWidth * 0.26, 460); }
  function setFaces(from) {
    var a = Math.max(0, Math.min(N - 1, from)), b = Math.max(0, Math.min(N - 1, from + 1));
    var even = a % 2 === 0 ? a : b, odd = a % 2 === 0 ? b : a;
    if (front.getAttribute('data-s') !== String(even)) { front.src = SRC[even]; front.alt = ALT[even]; front.setAttribute('data-s', even); }
    if (back.getAttribute('data-s') !== String(odd)) { back.src = SRC[odd]; back.alt = ALT[odd]; back.setAttribute('data-s', odd); }
  }
  function apply(p) {
    var a = ampX();
    var x = -a * Math.cos(p * seg * Math.PI);                 // zig-zag
    var lean = (x / a) * -24;                                  // faces the centre at each stop
    var rotY = p * seg * 180 + lean;                           // continuous half-turn per step
    var tiltX = Math.sin(p * seg * Math.PI * 2) * 5;           // subtle tumble
    box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
    setFaces(Math.floor(p * seg + 1e-4));
    var c = Math.round(p * seg);
    for (var i = 0; i < copies.length; i++) copies[i].classList.toggle('is-active', i === c);
  }
  function progress() {
    var r = wrap.getBoundingClientRect(), range = r.height - window.innerHeight;
    return range > 0 ? Math.max(0, Math.min(1, -r.top / range)) : 0;
  }
  function loop() {
    if (!on) { running = false; return; }
    target = progress();
    cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.0004) cur = target;
    apply(cur);
    requestAnimationFrame(loop);
  }
  function kick() { if (on && !running) { running = true; requestAnimationFrame(loop); } }

  if (reduce.matches || narrow.matches) return;
  apply(0);
  if (pin !== null) {                                          // test hook: pin the progress
    var p = Math.max(0, Math.min(1, parseFloat(pin) || 0));
    var go = function () {
      var top = wrap.getBoundingClientRect().top + window.pageYOffset;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, top + p * (wrap.offsetHeight - window.innerHeight));
      cur = p; apply(p);
    };
    go(); window.addEventListener('load', go);
    var n = 0, t = setInterval(function () { go(); if (++n > 8) clearInterval(t); }, 250);
    return;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on) { cur = progress(); kick(); } }, { rootMargin: '10% 0px' }).observe(wrap);
  } else { on = true; kick(); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { apply(cur); });
})();
