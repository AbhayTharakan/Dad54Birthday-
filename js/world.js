/*
 * "Dad Around the World": globe hero, a dotted travel route that draws
 * itself as you scroll, then the world photos as postcards.
 */
(function () {
  'use strict';

  var reduced = Site.reduced;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PINS = [
    { at: 0, icon: '🏠' },
    { at: 0.27, icon: '🏔️' },
    { at: 0.52, icon: '🏝️' },
    { at: 0.77, icon: '🏛️' },
    { at: 1, icon: '🎉' }
  ];

  // ---------- Hero ----------
  var hero = document.querySelector('.world-hero');
  if (!reduced) {
    gsap.timeline({ delay: Site.arriving ? 0.6 : 0.15 })
      .from(hero.querySelector('.globe'), { scale: 0.4, opacity: 0, rotation: -40, duration: 1.2, ease: 'back.out(1.6)' })
      .from(hero.querySelectorAll('.world-title, .world-sub'), { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15 }, '-=0.7')
      .fromTo(hero.querySelector('.hero-stamp'), { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 0.85, duration: 0.4, ease: 'power4.in' }, '-=0.2');

    var globe = hero.querySelector('.globe');
    gsap.to(globe, {
      y: -80, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });

    // The spinning globe repaints every frame, so pause it while it's off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        globe.classList.toggle('is-paused', !entries[0].isIntersecting);
      }).observe(globe);
    }
  }

  // ---------- Travel route ----------
  var route = document.querySelector('.world-route');
  var path = route.querySelector('.route-ghost');
  var plane = route.querySelector('.route-plane');
  var pinGroup = route.querySelector('.route-pins');
  var len = path.getTotalLength();

  // Individual dots along the path; switching a few on per frame is far
  // cheaper than re-rasterising an SVG mask on every scroll tick.
  var DOT_GAP = 22;
  var dots = [];
  var dotGroup = route.querySelector('.route-dots');
  for (var d = 0; d <= len; d += DOT_GAP) {
    var pt = path.getPointAtLength(d);
    var c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', pt.x.toFixed(1));
    c.setAttribute('cy', pt.y.toFixed(1));
    c.setAttribute('r', '4');
    dotGroup.appendChild(c);
    dots.push(c);
  }
  var shown = 0;

  var pins = PINS.map(function (p) {
    var pt = path.getPointAtLength(len * p.at);
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
    var inner = document.createElementNS(SVGNS, 'g');
    inner.setAttribute('class', 'route-pin');
    var dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '9');
    dot.setAttribute('fill', '#c8553d');
    dot.setAttribute('stroke', '#fffaf0');
    dot.setAttribute('stroke-width', '3');
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('y', '-16');
    t.textContent = p.icon;
    inner.appendChild(dot);
    inner.appendChild(t);
    g.appendChild(inner);
    pinGroup.appendChild(g);
    return { at: p.at, el: inner };
  });

  function draw(progress) {
    var target = Math.round(dots.length * progress);
    while (shown < target) dots[shown++].classList.add('is-on');
    while (shown > target) dots[--shown].classList.remove('is-on');

    var d = Math.max(0.5, len * progress);
    var a = path.getPointAtLength(d);
    var b = path.getPointAtLength(Math.min(len, d + 2));
    var c = d >= len ? path.getPointAtLength(len - 2) : a;
    var angle = d >= len
      ? Math.atan2(a.y - c.y, a.x - c.x)
      : Math.atan2(b.y - a.y, b.x - a.x);
    plane.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + (angle * 180 / Math.PI).toFixed(1) + ')');
    pins.forEach(function (p) { p.el.classList.toggle('is-on', progress >= p.at - 0.001); });
  }

  if (reduced) {
    draw(1);
  } else {
    draw(0);
    ScrollTrigger.create({
      trigger: route,
      start: 'top 75%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: function (self) { draw(self.progress); }
    });
    gsap.from(route.querySelector('.route-label'), {
      y: 30, opacity: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: route.querySelector('.route-label'), start: 'top 90%', toggleActions: 'play none none reverse' }
    });
  }

  // ---------- Gallery ----------
  Gallery.mount(document.getElementById('gallery'), 'world', {
    sequence: ['zoom', 'circle', 'tilt', 'diagonal'],
    captionStyle: 'stamp',
    pairPortraits: true
  });

  // ---------- Footer ----------
  if (!reduced) {
    gsap.from(document.querySelectorAll('.page-end > *'), {
      y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.page-end', start: 'top 75%', toggleActions: 'play none none reverse' }
    });
  }
})();
