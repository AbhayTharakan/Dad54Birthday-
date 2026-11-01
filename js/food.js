/*
 * "Food + Family": food drifting in the background at different depths,
 * a plate that spins in and gets served, then the photos.
 */
(function () {
  'use strict';

  var reduced = Site.reduced;
  var rand = Site.rand;
  var FOOD = ['🍛', '🍕', '🥘', '🍔', '🌮', '🍜', '🍰', '☕', '🍳', '🥭', '🍩', '🥐', '🍝', '🧁', '🍉', '🥗', '🍪', '🍚', '🌶️', '🍗'];

  // ---------- Drifting food ----------
  // Each item has a depth: near ones are bigger and scroll by faster.
  // They wrap around the screen, so there's always something floating past.
  var bg = document.querySelector('.food-bg');
  var count = window.innerWidth < 600 ? 12 : 20;
  var items = [];
  for (var i = 0; i < count; i++) {
    var depth = rand(0.25, 1);
    var s = document.createElement('span');
    var inner = document.createElement('span');
    inner.textContent = FOOD[i % FOOD.length];
    s.appendChild(inner);
    s.style.left = (i / count * 100 + rand(-2, 2)).toFixed(1) + '%';
    s.style.fontSize = (1.4 + depth * 2.4).toFixed(2) + 'rem';
    s.style.opacity = (0.25 + depth * 0.4).toFixed(2);
    s.style.filter = depth < 0.45 ? 'blur(1.5px)' : '';
    inner.style.setProperty('--d', rand(3, 6).toFixed(1) + 's');
    inner.style.setProperty('--delay', (-rand(0, 6)).toFixed(1) + 's');
    bg.appendChild(s);
    items.push({
      base: rand(0, 1.3),
      speed: 0.15 + depth * 0.6,
      spin: rand(-0.12, 0.12),
      setY: gsap.quickSetter(s, 'y', 'px'),
      setR: gsap.quickSetter(s, 'rotation', 'deg')
    });
  }

  function placeFood() {
    var sy = window.scrollY, h = window.innerHeight, span = h * 1.3;
    items.forEach(function (it) {
      var y = it.base * h - sy * it.speed;
      it.setY(((y % span) + span) % span - h * 0.15);
      it.setR(sy * it.spin);
    });
  }
  placeFood();
  if (!reduced) gsap.ticker.add(placeFood);

  // ---------- Hero: the plate ----------
  var plateItems = document.querySelector('.plate-items');
  var PLATE = ['🍛', '🥭', '🍳', '🍰', '☕', '🍕', '🌮', '🍜'];
  var onPlate = PLATE.map(function (f, i) {
    var a = (i / PLATE.length) * Math.PI * 2 - Math.PI / 2;
    var n = document.createElement('span');
    n.textContent = f;
    n.style.setProperty('--x', Math.cos(a).toFixed(3));
    n.style.setProperty('--y', Math.sin(a).toFixed(3));
    plateItems.appendChild(n);
    return n;
  });

  var lines = Array.prototype.map.call(document.querySelectorAll('.ft-line'), function (l) { return Site.splitChars(l); });
  var chars = lines[0].concat(lines[1]);
  var plus = document.querySelector('.ft-plus');

  if (reduced) {
    gsap.set([chars, plus, onPlate], { opacity: 1 });
  } else {
    gsap.timeline({ delay: Site.arriving ? 0.6 : 0.15 })
      .from('.plate', { scale: 0, rotation: -220, duration: 1.1, ease: 'back.out(1.4)' })
      // Letters rise off the plate like steam, then settle
      .fromTo(chars, { y: 70, opacity: 0, scale: 0.5, rotation: function () { return rand(-30, 30); } },
        { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.05 }, '-=0.45')
      .fromTo(plus, { scale: 0, rotation: -360, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(2.5)' }, '-=0.6')
      // Dishes get served around the rim, one at a time
      .fromTo(onPlate, { y: function () { return -window.innerHeight; }, opacity: 1, rotation: function () { return rand(-180, 180); } },
        { y: 0, rotation: 0, duration: 0.9, ease: 'bounce.out', stagger: 0.09 }, '-=0.3')
      .from('.steam', { opacity: 0, duration: 1 }, '-=0.6')
      .from('.food-sub', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.9')
      .from('.food-hint', { y: 30, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.4')
      .add(function () {
        // Lazy Susan: the dishes keep slowly going round
        gsap.to(plateItems, { rotation: 360, duration: 60, ease: 'none', repeat: -1 });
        onPlate.forEach(function (n, i) {
          gsap.to(n, { y: -6, duration: 1 + (i % 3) * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.1 });
        });
      });

    // Tap a dish and it hops
    onPlate.forEach(function (n) {
      n.addEventListener('pointerenter', function () {
        gsap.fromTo(n, { scale: 1.6 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.35)', overwrite: 'auto' });
      });
    });

    // Scrolling away clears the plate
    gsap.to('.plate-wrap', {
      scale: 0.7, rotation: 25, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.food-hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // ---------- Gallery ----------
  Gallery.mount(document.getElementById('gallery'), 'food', {
    sequence: ['cloche', 'toss', 'fill', 'zoom'],
    captionStyle: 'steam',
    pairPortraits: true
  });

  // ---------- Footer ----------
  if (!reduced) {
    gsap.from(document.querySelectorAll('.page-end > *'), {
      y: 50, opacity: 0, filter: 'blur(6px)', duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.page-end', start: 'top 75%', toggleActions: 'play none none reverse' }
    });
  }
})();
