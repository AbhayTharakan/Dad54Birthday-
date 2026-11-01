/*
 * "Silly Dad": bouncy title, floating emoji, playful pop-in photos.
 */
(function () {
  'use strict';

  var reduced = Site.reduced;
  var rand = Site.rand;
  var COLORS = ['#ff3d7f', '#2ec4ff', '#7ae582', '#ff9f1c', '#b388ff', '#ffffff'];
  var EMOJI = ['😜', '🤪', '😂', '🎈', '🍕', '🤓', '🙃', '🎉', '😎', '🦆', '🍌', '🥸', '👻', '🕺', '🧦', '🍩'];

  // ---------- Floating emoji ----------
  if (!reduced) {
    var bg = document.querySelector('.emoji-bg');
    var count = window.innerWidth < 600 ? 10 : 16;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.textContent = EMOJI[i % EMOJI.length];
      s.style.left = (i / count * 100 + rand(-3, 3)).toFixed(1) + '%';
      s.style.setProperty('--s', rand(1.6, 3.4).toFixed(2) + 'rem');
      s.style.setProperty('--d', rand(14, 26).toFixed(1) + 's');
      s.style.setProperty('--delay', (-rand(0, 26)).toFixed(1) + 's');
      s.style.setProperty('--r', (rand(-1, 1) > 0 ? 1 : -1) * rand(180, 540).toFixed(0) + 'deg');
      bg.appendChild(s);
    }
  }

  // ---------- Wobbly title ----------
  var title = document.querySelector('.silly-title');
  var letters = Site.splitChars(title);
  letters.forEach(function (ch, i) { ch.style.setProperty('--c', COLORS[i % COLORS.length]); });

  if (reduced) {
    gsap.set(letters, { opacity: 1 });
  } else {
    gsap.timeline({ delay: Site.arriving ? 0.6 : 0.15 })
      .fromTo(letters,
        { y: function () { return rand(-500, -250); }, rotation: function () { return rand(-90, 90); }, opacity: 0 },
        { y: 0, rotation: 0, opacity: 1, duration: 1.4, ease: 'bounce.out', stagger: 0.07 })
      .from('.silly-sub', { scale: 0, rotation: -8, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, '-=0.6')
      .from('.silly-hint', { y: 40, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.3')
      .add(function () {
        // Never stop wobbling
        letters.forEach(function (ch, i) {
          gsap.to(ch, {
            y: -10, rotation: i % 2 ? 6 : -6, duration: 0.55 + (i % 3) * 0.08,
            ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.08
          });
        });
      });

    // Poke a letter and it boings
    letters.forEach(function (ch) {
      ch.addEventListener('mouseenter', function () {
        gsap.fromTo(ch, { scaleX: 1.4, scaleY: 0.6 }, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.3)', overwrite: 'auto' });
      });
    });
  }

  // ---------- Gallery ----------
  Gallery.mount(document.getElementById('gallery'), 'silly', {
    sequence: ['pop', 'spin', 'rubber', 'tilt'],
    captionStyle: 'bounce',
    pairPortraits: true
  });

  // ---------- Footer ----------
  if (!reduced) {
    gsap.from(document.querySelectorAll('.page-end > *'), {
      y: 50, opacity: 0, rotation: function () { return rand(-8, 8); }, duration: 0.9, ease: 'back.out(2)', stagger: 0.12,
      scrollTrigger: { trigger: '.page-end', start: 'top 75%', toggleActions: 'play none none reverse' }
    });
  }
})();
