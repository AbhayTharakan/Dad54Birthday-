/*
 * Home page: fireworks intro, photo gallery, and the ending.
 */
(function () {
  'use strict';

  var reduced = Site.reduced;
  var rand = Site.rand;
  var PALETTE = ['#ffd166', '#ff5d8f', '#4cc9f0', '#80ed99', '#ff9f1c', '#b388ff'];

  // ---------- Intro ----------
  var intro = document.querySelector('.intro');
  var title = intro.querySelector('.intro-title');
  var num = intro.querySelector('.intro-54');
  var glow = intro.querySelector('.intro-glow');
  var flash = intro.querySelector('.intro-flash');
  var ring = intro.querySelector('.intro-ring');
  var cue = intro.querySelector('.scroll-cue-inner');
  var replay = intro.querySelector('.replay-btn');
  var fw = new Fireworks(intro.querySelector('.intro-canvas'));

  var letters = Site.splitChars(title);
  letters.forEach(function (ch, i) { ch.style.setProperty('--c', PALETTE[i % PALETTE.length]); });

  var tl = null;

  function showEnd() {
    gsap.to(cue, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
    replay.classList.add('is-visible');
  }

  function burstAt(node, opts) {
    var a = node.getBoundingClientRect(), b = intro.getBoundingClientRect();
    fw.burst(a.left + a.width / 2 - b.left, a.top + a.height / 2 - b.top, opts);
  }

  function play(delay) {
    if (tl) tl.kill();
    fw.clear();
    replay.classList.remove('is-visible');
    gsap.set(cue, { opacity: 0, y: 10 });

    if (reduced) {
      fw.scatter(140);
      tl = gsap.timeline()
        .fromTo(letters, { opacity: 0 }, { opacity: 1, duration: 1 })
        .fromTo(num, { opacity: 0 }, { opacity: 1, duration: 0.8 })
        .call(showEnd);
      return;
    }

    var w = fw.w, h = fw.h;
    tl = gsap.timeline({ delay: delay || 0.2 })
      // The big bang
      .call(function () { fw.burst(w / 2, h / 2, { count: 460, power: 1.25, confetti: 160 }); }, null, 0)
      .fromTo(flash, { scale: 0.2, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0)
      .fromTo(ring, { scale: 0.1, opacity: 0.9 }, { scale: 6, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0)

      // Letters fly in from everywhere and snap into place
      .fromTo(letters, {
        x: function () { return rand(-0.55, 0.55) * window.innerWidth; },
        y: function () { return rand(-0.5, 0.5) * window.innerHeight; },
        rotation: function () { return rand(-220, 220); },
        scale: 0,
        opacity: 0
      }, {
        x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
        duration: 1.1, ease: 'back.out(1.6)', stagger: { each: 0.035, from: 'random' }
      }, 0.3)
      .fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 1.3)
      .to(letters, { scale: 1.14, duration: 0.13, yoyo: true, repeat: 1, ease: 'power1.inOut', stagger: 0.02 }, 1.45)

      // Follow-up fireworks around the edges
      .call(function () { fw.burst(w * 0.18, h * 0.3, { count: 150, power: 0.7, confetti: 30 }); }, null, 0.75)
      .call(function () { fw.burst(w * 0.82, h * 0.28, { count: 150, power: 0.7, confetti: 30 }); }, null, 1.1)
      .call(function () { fw.burst(w * 0.3, h * 0.78, { count: 120, power: 0.6 }); }, null, 1.45)
      .call(function () { fw.burst(w * 0.72, h * 0.75, { count: 120, power: 0.6 }); }, null, 1.7)

      // 54!
      .fromTo(num, { scale: 0, rotation: -30, opacity: 0, y: -80 },
        { scale: 1, rotation: 0, opacity: 1, y: 0, duration: 1.4, ease: 'elastic.out(1, 0.4)' }, 2.1)
      .call(function () { burstAt(num, { count: 180, power: 0.55, colors: ['#ffd166', '#fff3c4', '#ff9f1c'] }); }, null, 2.2)
      .call(function () { fw.rain(130); }, null, 2.3)
      .call(showEnd, null, 3);
  }

  replay.addEventListener('click', function () { play(0.1); });
  play(Site.arriving ? 0.6 : 0.2);

  if (!reduced) {
    // Intro content drifts up and fades as you scroll away
    gsap.to(intro.querySelector('.intro-inner'), {
      yPercent: -25, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: intro, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to(intro.querySelector('.scroll-cue'), {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: intro, start: 'top top', end: '+=160', scrub: true }
    });
  }

  // ---------- Lead-in text ----------
  var lead = document.querySelector('.home-lead');
  var leadChars = Site.splitChars(lead.querySelector('.lead-title'));
  if (!reduced) {
    gsap.timeline({ scrollTrigger: { trigger: lead, start: 'top 75%', toggleActions: 'play none none reverse' } })
      .from(lead.querySelector('.eyebrow'), { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' })
      .from(leadChars, { yPercent: 80, opacity: 0, rotation: 8, duration: 0.7, ease: 'back.out(2)', stagger: 0.016 }, '-=0.3')
      .from(lead.querySelector('.lead-sub'), { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
  }

  // ---------- Gallery ----------
  Gallery.mount(document.getElementById('gallery'), 'home', {
    sequence: ['zoom', 'circle', 'tilt', 'diagonal']
  });

  // ---------- Ending ----------
  var ending = document.querySelector('.ending');
  var endFw = new Fireworks(ending.querySelector('.ending-canvas'));
  var endChars = Site.splitChars(ending.querySelector('.ending-title'));

  if (reduced) {
    endFw.scatter(90);
  } else {
    var celebrate = function () {
      var w = endFw.w, h = endFw.h;
      endFw.burst(w * 0.25, h * 0.35, { count: 160, power: 0.7, confetti: 40 });
      setTimeout(function () { endFw.burst(w * 0.75, h * 0.3, { count: 160, power: 0.7, confetti: 40 }); }, 350);
      setTimeout(function () { endFw.burst(w * 0.5, h * 0.55, { count: 220, power: 0.9, confetti: 60 }); }, 700);
      setTimeout(function () { endFw.rain(90); }, 900);
    };
    gsap.timeline({
      scrollTrigger: { trigger: ending, start: 'top 55%', toggleActions: 'play none none reverse', onEnter: celebrate }
    })
      .from(endChars, { y: 80, opacity: 0, scale: 0.4, rotation: function () { return rand(-30, 30); },
        duration: 0.9, ease: 'back.out(2)', stagger: 0.04 })
      .from(ending.querySelector('.ending-sign'), { y: 30, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.3')
      .from(ending.querySelector('.ending-heart'), { scale: 0, duration: 1, ease: 'elastic.out(1, 0.35)' }, '-=0.4');
  }
})();
