/*
 * Shared setup for every page: GSAP + ScrollTrigger, Lenis smooth scroll,
 * the colour-wipe page transition, and a few helpers on window.Site.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var Site = window.Site = {
    reduced: reduced,
    lenis: null,
    arriving: root.classList.contains('is-arriving')
  };

  Site.rand = function (min, max) { return min + Math.random() * (max - min); };

  // Wrap each character in a span (words stay unbroken, <br>s are kept).
  // Returns the char spans.
  Site.splitChars = function (node) {
    var chars = [];
    var parts = Array.from(node.childNodes).map(function (n) {
      return n.nodeName === 'BR' ? null : n.textContent;
    });
    node.setAttribute('aria-label', node.textContent.replace(/\s+/g, ' ').trim());
    node.textContent = '';
    parts.forEach(function (text) {
      if (text === null) { node.appendChild(document.createElement('br')); return; }
      text.trim().split(/\s+/).forEach(function (word, i) {
        if (!word) return;
        if (i) node.appendChild(document.createTextNode(' '));
        var w = document.createElement('span');
        w.className = 'word';
        w.setAttribute('aria-hidden', 'true');
        Array.from(word).forEach(function (c) {
          var s = document.createElement('span');
          s.className = 'ch';
          s.textContent = c;
          w.appendChild(s);
          chars.push(s);
        });
        node.appendChild(w);
      });
    });
    return chars;
  };

  Site.scrollTo = function (y) {
    if (Site.lenis) Site.lenis.scrollTo(y);
    else window.scrollTo(0, y);
  };

  // ---------- GSAP + Lenis ----------
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!reduced && window.Lenis) {
    var lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    Site.lenis = lenis;
  }

  // ---------- Page transition (colour wipe) ----------
  var wipe = document.querySelector('.wipe');
  var panels = wipe ? wipe.querySelectorAll('.wipe-panel') : [];

  function resetWipe() {
    root.classList.remove('is-arriving');
    if (!wipe) return;
    // y: 0 stops GSAP from adding the CSS translateY(100%) on top of yPercent
    gsap.set(panels, { y: 0, yPercent: 100 });
    wipe.style.pointerEvents = '';
  }

  if (wipe && Site.arriving && !reduced) {
    gsap.timeline({ onComplete: resetWipe })
      .fromTo(panels[1], { yPercent: 0 }, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, 0.05)
      .fromTo(panels[0], { yPercent: 0 }, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, 0.17);
  } else {
    resetWipe();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-wipe]');
    if (!a || e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;

    if (a.getAttribute('aria-current') === 'page') {
      e.preventDefault();
      Site.scrollTo(0);
      return;
    }
    if (reduced || !wipe) return;

    e.preventDefault();
    var href = a.href;
    try { sessionStorage.setItem('wipe', '1'); } catch (err) { /* storage blocked: no arrival wipe */ }
    wipe.className = 'wipe to-' + a.getAttribute('data-wipe');
    wipe.style.pointerEvents = 'auto';
    gsap.timeline({ onComplete: function () { window.location.href = href; } })
      .fromTo(panels[0], { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' }, 0)
      .fromTo(panels[1], { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' }, 0.12);
  });

  // Coming back via the browser's Back button can restore the covered page
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) resetWipe();
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
