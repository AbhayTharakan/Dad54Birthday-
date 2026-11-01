/*
 * "My Dad is Cooler Than Yours": neon title, falling sunglasses,
 * counting-up stats, then the cool photos as trading cards.
 */
(function () {
  'use strict';

  var reduced = Site.reduced;
  var rand = Site.rand;

  // ---------- Snow ----------
  if (!reduced) {
    var snow = document.querySelector('.snow');
    var count = window.innerWidth < 600 ? 14 : 24;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.textContent = '❄';
      s.style.left = (i / count * 100 + rand(-2, 2)).toFixed(1) + '%';
      s.style.setProperty('--s', rand(0.7, 1.6).toFixed(2) + 'rem');
      s.style.setProperty('--d', rand(10, 20).toFixed(1) + 's');
      s.style.setProperty('--delay', (-rand(0, 20)).toFixed(1) + 's');
      s.style.setProperty('--x', rand(-60, 60).toFixed(0) + 'px');
      snow.appendChild(s);
    }
  }

  // ---------- Hero ----------
  var hero = document.querySelector('.cool-hero');
  var word = hero.querySelector('.cool-word');
  var shades = hero.querySelector('.shades');

  if (reduced) {
    gsap.set([word, shades, '.cool-pre', '.cool-post', '.cool-deal'], { opacity: 1 });
  } else {
    gsap.timeline({ delay: Site.arriving ? 0.6 : 0.2 })
      .fromTo('.cool-pre', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      // Neon sign flickering on
      .fromTo(word, { opacity: 0, scale: 0.92 }, {
        keyframes: [
          { opacity: 1, duration: 0.05 }, { opacity: 0.1, duration: 0.08 },
          { opacity: 1, duration: 0.05 }, { opacity: 0.25, duration: 0.12 },
          { opacity: 1, scale: 1, duration: 0.2 }
        ]
      }, '+=0.1')
      .fromTo('.cool-post', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '+=0.1')
      // The sunglasses drop in
      .fromTo(shades, { y: function () { return -window.innerHeight; }, rotation: -12, opacity: 1 },
        { y: 0, rotation: 0, duration: 1.1, ease: 'bounce.out' }, '+=0.25')
      .fromTo('.cool-deal', { scale: 0, rotation: -10, opacity: 0 },
        { scale: 1, rotation: -4, opacity: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)' }, '-=0.2');

    gsap.to(hero.querySelector('.cool-title'), {
      yPercent: -18, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // ---------- Stats ----------
  var stats = document.querySelector('.cool-stats');
  var nums = stats.querySelectorAll('.stat-num[data-count]');

  function setNum(el, n) {
    el.textContent = Math.round(n).toLocaleString('en-US') + (el.getAttribute('data-suffix') || '');
  }

  if (!reduced) {
    gsap.timeline({ scrollTrigger: { trigger: stats, start: 'top 70%', toggleActions: 'play none none reverse' } })
      .from(stats.querySelectorAll('.eyebrow, .stats-title'), { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 })
      .from(stats.querySelectorAll('.stat'), {
        y: 60, opacity: 0, rotationX: -60, transformPerspective: 800,
        duration: 0.8, ease: 'back.out(1.6)', stagger: 0.12
      }, '-=0.3')
      .add(function () {
        nums.forEach(function (el) {
          var o = { n: 0 };
          gsap.to(o, {
            n: parseFloat(el.getAttribute('data-count')), duration: 1.6, ease: 'power2.out',
            onUpdate: function () { setNum(el, o.n); }
          });
        });
      }, '-=0.6')
      .from(stats.querySelector('.stats-note'), { opacity: 0, y: 20, duration: 0.6 }, '+=0.6');
  }

  // ---------- Gallery ----------
  Gallery.mount(document.getElementById('gallery'), 'cool', {
    sequence: ['tilt', 'zoom', 'circle', 'diagonal'],
    captionStyle: 'words',
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
