// The pinned 3D iPad: one device zig-zags left and right as you scroll, turns a half-turn per
// step and flips to the next screenshot. Only the face turned away is ever swapped (front =
// even screens, back = odd), so the right screen is upright at each stop. Vanilla JS: scroll
// progress comes from the section's rect and is eased in rAF; it only runs while on screen.
// `?sc=0.42` pins the progress (and scrolls there), for screenshots; `?sc=0,1,0.43` jumps through those values in order.
(function () {
  var wrap = document.querySelector('.sc-wrap');
  if (!wrap) return;
  var box = wrap.querySelector('.sc-3d');
  var front = wrap.querySelectorAll('.sc-front .sc-scr img');   // even screens, all loaded up front
  var back = wrap.querySelectorAll('.sc-back .sc-scr img');     // odd screens
  var copies = Array.prototype.slice.call(wrap.querySelectorAll('.sc-copy'));
  if (!box || !front.length || !back.length || !copies.length) return;

  var N = copies.length, seg = N - 1;
  var pin = new URLSearchParams(location.search).get('sc');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 768px)');
  var cur = 0, target = 0, on = false, running = false;

  function ampX() { return Math.max(0, Math.min(window.innerWidth * 0.26, 460, window.innerWidth / 2 - box.offsetWidth / 2 - 14)); }
  function show(list, s) { for (var i = 0; i < list.length; i++) list[i].classList.toggle('on', list[i].getAttribute('data-s') === String(s)); }
  function setFaces(from) {
    var a = Math.max(0, Math.min(N - 1, from)), b = Math.max(0, Math.min(N - 1, from + 1));
    show(front, a % 2 === 0 ? a : b);                            // only the face turned away changes
    show(back, a % 2 === 0 ? b : a);
  }
  function apply(p) {
    var a = ampX();
    var x = -a * Math.cos(p * seg * Math.PI);                 // zig-zag
    var lean = (x / a) * -24;                                  // faces the centre at each stop
    var rotY = p * seg * 180 + lean;                           // continuous half-turn per step
    var tiltX = Math.sin(p * seg * Math.PI * 2) * 5;           // subtle tumble
    box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
    setFaces(Math.floor(p * seg + 1e-4));
    var pos = p * seg;                                         // 0..N-1; whole numbers are the stops
    for (var i = 0; i < copies.length; i++) {
      var k = Math.max(0, 1 - Math.abs(pos - i) * 1.6);          // 1 exactly at the stop, fading either side
      copies[i].style.opacity = (0.28 + 0.72 * k).toFixed(3);
      copies[i].style.transform = 'translateY(' + ((1 - k) * 14).toFixed(1) + 'px)';
      copies[i].classList.toggle('is-active', k > 0.5);
    }
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
    var seq = pin.split(',').map(function (v) { return Math.max(0, Math.min(1, parseFloat(v) || 0)); });   // e.g. ?sc=0,1,0.43 jumps 0 -> 1 -> 0.43
    seq.slice(0, -1).forEach(apply);
    var p = seq[seq.length - 1];
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
