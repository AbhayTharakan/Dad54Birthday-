/*
 * Reusable scroll-driven photo gallery.
 *
 *   Gallery.mount(containerEl, 'home', {
 *     sequence: ['zoom', 'parallax', ...],   // layouts to rotate through
 *     captionStyle: 'words' | 'stamp' | 'bounce' | 'steam',
 *     pairPortraits: true                    // optional: portraits side by side, landscapes alone
 *   });
 *
 * Photos come from window.PHOTOS[category] (images/photos.js). Entries with
 * type: 'video' become muted, looping videos with a sound button.
 * Single-photo layouts: zoom, circle, diagonal, parallax, tilt, pop, spin, rubber, cloche, toss, fill
 * Multi-photo layouts:  horizontal, crossfade, stack
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DEFAULT_SEQUENCE = ['zoom', 'parallax', 'circle', 'horizontal', 'tilt', 'crossfade', 'diagonal', 'stack'];
  var GROUPS = {
    horizontal: { min: 3, max: 5 },
    crossfade: { min: 2, max: 3 },
    stack: { min: 3, max: 6 }
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // ---------- Lazy loading ----------
  // Sections are observed well ahead of the viewport; when one gets close,
  // every image inside it (e.g. a whole horizontal row) starts loading.
  var observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadImages(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '150% 0px 150% 0px' })
    : null;

  function loadImages(root) {
    var vids = root.querySelectorAll('video[data-src]');
    for (var v = 0; v < vids.length; v++) {
      (function (vid) {
        vid.addEventListener('loadeddata', function () { vid.classList.add('is-loaded'); }, { once: true });
        vid.poster = vid.getAttribute('data-poster') || '';
        vid.src = vid.getAttribute('data-src');
        vid.removeAttribute('data-src');
        if (videoObserver) videoObserver.observe(vid);
      })(vids[v]);
    }
    var imgs = root.querySelectorAll('img[data-src]');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var done = function () { img.classList.add('is-loaded'); };
        img.addEventListener('load', function () {
          if (img.decode) img.decode().then(done, done); else done();
        }, { once: true });
        img.addEventListener('error', done, { once: true });
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      })(imgs[i]);
    }
  }

  function lazy(sec) {
    if (observer) observer.observe(sec); else loadImages(sec);
  }

  // ---------- Videos ----------
  // Muted autoplay while on screen (browsers allow that), paused off screen.
  // The sound button unmutes one video at a time.
  var videoObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var vid = entry.target;
          if (entry.isIntersecting) {
            if (!reduced || !vid.muted) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
          } else {
            vid.pause();
          }
        });
      }, { threshold: 0.5 })
    : null;

  function soundButton(vid) {
    var btn = el('button', 'g-sound');
    btn.type = 'button';
    var sync = function () {
      btn.textContent = vid.muted ? '🔇' : '🔊';
      btn.setAttribute('aria-label', vid.muted ? 'Turn sound on' : 'Turn sound off');
      btn.classList.toggle('is-on', !vid.muted);
    };
    btn.addEventListener('click', function () {
      var turnOn = vid.muted;
      if (turnOn) {
        document.querySelectorAll('.g-media video').forEach(function (other) {
          if (other !== vid && !other.muted) { other.muted = true; other.dispatchEvent(new Event('volumechange')); }
        });
      }
      vid.muted = !turnOn;
      if (turnOn) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
    });
    vid.addEventListener('volumechange', sync);
    sync();
    return btn;
  }

  // ---------- Building blocks ----------
  function caption(text, style) {
    var cap = el('figcaption', 'g-cap');
    if (style === 'stamp') {
      cap.textContent = text;
      return cap;
    }
    text.split(/\s+/).forEach(function (word) {
      if (!word) return;
      var w = el('span', 'w', cap);
      el('span', 'wi', w).textContent = word;
      cap.appendChild(document.createTextNode(' '));
    });
    return cap;
  }

  function frame(photo, o, extraCls, withCaption) {
    var fig = el('figure', 'g-frame' + (extraCls ? ' ' + extraCls : ''));
    var w = photo.width || 4, h = photo.height || 3;
    fig.style.setProperty('--ar', (w / h).toFixed(4));
    fig.style.setProperty('--tilt', rand(-4, 4).toFixed(1) + 'deg');

    var media = el('div', 'g-media', fig);
    if (photo.type === 'video') {
      var vid = el('video', '', media);
      vid.setAttribute('data-src', photo.src);
      if (photo.poster) vid.setAttribute('data-poster', photo.poster);
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      vid.setAttribute('aria-label', photo.caption || 'Video of Dad');
      media.appendChild(soundButton(vid));
    } else {
      var img = el('img', '', media);
      img.setAttribute('data-src', photo.src);
      img.alt = photo.caption || 'Photo of Dad';
      img.decoding = 'async';
      img.width = w;
      img.height = h;
    }

    if (photo.caption && withCaption !== false) {
      var cap = fig.appendChild(caption(photo.caption, o.captionStyle));
      cap.classList.add('stamp-' + (o.n++ % 3));
    }
    return fig;
  }

  function capOf(node) { return node.querySelector('.g-cap'); }
  function imgOf(node) { return node.querySelector('.g-media img, .g-media video'); }

  function revealCaption(cap, style, st) {
    if (!cap || reduced) return;
    st = Object.assign({ start: 'top 75%', toggleActions: 'play none none reverse' }, st);

    if (style === 'stamp') {
      gsap.fromTo(cap, { scale: 2.6, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.42, ease: 'power4.in', scrollTrigger: st
      });
    } else if (style === 'steam') {
      // Words drift up out of a blur, like steam off a plate
      gsap.fromTo(cap.querySelectorAll('.wi'), { y: 34, opacity: 0, filter: 'blur(8px)' }, {
        y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out', stagger: 0.07, scrollTrigger: st
      });
    } else if (style === 'bounce') {
      gsap.fromTo(cap.querySelectorAll('.wi'),
        { y: -40, opacity: 0, rotation: function () { return rand(-35, 35); } },
        { y: 0, opacity: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.45)', stagger: 0.06, scrollTrigger: st });
    } else {
      gsap.fromTo(cap.querySelectorAll('.wi'), { yPercent: 110, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.05, scrollTrigger: st
      });
    }
  }

  // Scrubbed tween across the section's entry, used by several layouts
  function entering(sec, start, end) {
    return { trigger: sec, start: start || 'top bottom', end: end || 'center center', scrub: true };
  }

  // Toggle-style trigger for the playful one-shot animations
  function popIn(sec) {
    return { trigger: sec, start: 'top 70%', toggleActions: 'play none none reverse' };
  }

  // ---------- Layouts ----------
  var LAYOUTS = {

    // Image starts zoomed in and settles as the frame grows
    zoom: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.timeline({ scrollTrigger: entering(sec) })
        .fromTo(f, { scale: 0.72 }, { scale: 1, ease: 'none' }, 0)
        .fromTo(imgOf(f), { scale: 1.6 }, { scale: 1, ease: 'none' }, 0);
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Circle iris opens from the centre
    circle: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.timeline({ scrollTrigger: entering(sec, 'top 85%') })
        .fromTo(f.querySelector('.g-media'),
          { clipPath: 'circle(0% at 50% 50%)' },
          { clipPath: 'circle(75% at 50% 50%)', ease: 'none' }, 0)
        .fromTo(imgOf(f), { scale: 1.35 }, { scale: 1, ease: 'none' }, 0);
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Diagonal wipe from the top-left corner
    diagonal: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.timeline({ scrollTrigger: entering(sec, 'top 85%') })
        .fromTo(f.querySelector('.g-media'),
          { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%)' },
          { clipPath: 'polygon(0% 0%, 200% 0%, 0% 200%)', ease: 'none' }, 0)
        .fromTo(f, { x: -60 }, { x: 0, ease: 'none' }, 0);
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Photo, caption and a giant number all move at different speeds
    parallax: function (sec, p, o) {
      if (o.count % 2) sec.classList.add('g-flip');
      var num = el('div', 'g-num', sec);
      num.textContent = pad(o.index + 1);
      num.setAttribute('aria-hidden', 'true');

      var f = sec.appendChild(frame(p[0], o, null, false));
      var text = null, cap = null;
      if (p[0].caption) {
        text = el('div', 'g-text', sec);
        cap = text.appendChild(caption(p[0].caption, o.captionStyle));
        cap.className += ' g-cap--big stamp-' + (o.n++ % 3);
      } else {
        sec.classList.add('no-text');
      }

      // On phones the photo and caption stack vertically, so keep the drift small
      var amp = function (px) { return function () { return px * (window.innerWidth < 760 ? 0.35 : 1); }; };
      var tl = gsap.timeline({
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      })
        .fromTo(f, { y: amp(90) }, { y: amp(-90), ease: 'none' }, 0)
        .fromTo(imgOf(f), { yPercent: -8, scale: 1.2 }, { yPercent: 8, scale: 1.2, ease: 'none' }, 0)
        .fromTo(num, { yPercent: -45 }, { yPercent: 45, ease: 'none' }, 0);
      if (text) tl.fromTo(text, { y: amp(170) }, { y: amp(-170), ease: 'none' }, 0);
      revealCaption(cap, o.captionStyle, { trigger: text });
    },

    // 3D flip up into place
    tilt: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      var dir = o.count % 2 ? 1 : -1;
      gsap.fromTo(f,
        { rotationX: 50, rotationY: 28 * dir, y: 120, opacity: 0, transformPerspective: 1100 },
        { rotationX: 0, rotationY: 0, y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: entering(sec, 'top 90%', 'center 55%') });
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Pinned row that scrolls sideways
    horizontal: function (sec, p, o) {
      var track = el('div', 'g-htrack', sec);
      var cards = p.map(function (ph) { return track.appendChild(frame(ph, o, 'g-hcard')); });
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };

      var tween = gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: function () { return '+=' + Math.max(dist(), 1); },
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      cards.forEach(function (c) {
        gsap.fromTo(imgOf(c), { xPercent: -6, scale: 1.15 }, {
          xPercent: 6, scale: 1.15, ease: 'none',
          scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
        revealCaption(capOf(c), o.captionStyle, { trigger: c, containerAnimation: tween, start: 'left 75%' });
      });
    },

    // Pinned: each photo crossfades into the next
    crossfade: function (sec, p, o) {
      var layers = p.map(function (ph) {
        var l = el('div', 'g-layer', sec);
        l.appendChild(frame(ph, o));
        return l;
      });
      gsap.set(layers.slice(1), { opacity: 0 });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: function () { return '+=' + window.innerHeight * (layers.length - 1); },
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true
        }
      });
      tl.to({}, { duration: 0.3 });
      for (var i = 1; i < layers.length; i++) {
        tl.to(layers[i - 1], { opacity: 0, scale: 0.9, duration: 1 })
          .fromTo(layers[i], { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 1 }, '<')
          .to({}, { duration: 0.3 });
      }
      revealCaption(capOf(layers[0]), o.captionStyle, { trigger: sec });
    },

    // Pinned: a messy pile of polaroids spreads into a grid
    stack: function (sec, p, o) {
      var pile = el('div', 'g-pile', sec);
      var cards = p.map(function (ph, i) {
        var c = frame(ph, o, 'g-polaroid');
        var ar = (ph.width || 4) / (ph.height || 3);
        c.style.setProperty('--wf', ar >= 1 ? 1 : Math.max(0.72, ar).toFixed(3));
        c.style.zIndex = i + 1;
        return pile.appendChild(c);
      });
      var startRot = cards.map(function () { return rand(-14, 14); });
      var endRot = cards.map(function () { return rand(-7, 7); });
      var pos = [];

      function layout() {
        var vw = window.innerWidth, vh = window.innerHeight, n = cards.length;
        var cols = vw / vh > 1.25 ? Math.min(n, n === 4 ? 4 : 3) : Math.min(n, 2);
        var rows = Math.ceil(n / cols);
        var cw = 0, ch = 0, gap = 26;
        cards.forEach(function (c) { cw = Math.max(cw, c.offsetWidth); ch = Math.max(ch, c.offsetHeight); });
        var s = Math.min(1, (vw * 0.94) / (cols * (cw + gap)), (vh * 0.82) / (rows * (ch + gap)));
        pos = cards.map(function (c, i) {
          var row = Math.floor(i / cols), col = i % cols;
          var inRow = row === rows - 1 ? n - row * cols : cols;
          return {
            x: (col - (inRow - 1) / 2) * (cw + gap) * s,
            y: (row - (rows - 1) / 2) * (ch + gap) * s,
            s: s
          };
        });
      }
      layout();
      ScrollTrigger.addEventListener('refreshInit', layout);

      gsap.set(cards, { xPercent: -50, yPercent: -50 });
      gsap.fromTo(pile, { y: 220, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: entering(sec, 'top 85%', 'top top') });

      gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: function () { return '+=' + window.innerHeight * 1.3; },
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true
        }
      })
        .fromTo(cards,
          { x: 0, y: function (i) { return -i * 4; }, rotation: function (i) { return startRot[i]; }, scale: 1 },
          {
            x: function (i) { return pos[i].x; },
            y: function (i) { return pos[i].y; },
            rotation: function (i) { return endRot[i]; },
            scale: function (i) { return pos[i].s; },
            ease: 'power2.inOut', stagger: 0.12, duration: 1
          }, 0.15)
        .to({}, { duration: 0.3 });

      cards.forEach(function (c) {
        revealCaption(capOf(c), o.captionStyle, { trigger: sec, start: 'top 40%' });
      });
    },

    // Two portrait photos side by side (stacked on phones); each frame
    // gets its own trigger so it still animates when they're stacked
    pair: function (sec, p, o) {
      var row = el('div', 'g-pairrow', sec);
      var fs = p.map(function (ph) { return row.appendChild(frame(ph, o)); });
      if (reduced) {
        fs.forEach(function (f) {
          gsap.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.8, scrollTrigger: { trigger: f, start: 'top 85%' } });
        });
        return;
      }
      var st = function (f, i) { return entering(f, i ? 'top 85%' : 'top 95%', i ? 'center 50%' : 'center 60%'); };
      var v = o.pairs++ % 3;
      fs.forEach(function (f, i) {
        var side = i ? 1 : -1;
        if (v === 0) {
          // Slide in from opposite sides
          gsap.fromTo(f, { xPercent: 60 * side, rotation: 10 * side, opacity: 0 },
            { xPercent: 0, rotation: 0, opacity: 1, ease: 'power2.out', scrollTrigger: st(f, i) });
        } else if (v === 1) {
          // Flip up one after the other
          gsap.fromTo(f, { rotationX: 55, rotationY: 20 * side, y: 140, opacity: 0, transformPerspective: 1100 },
            { rotationX: 0, rotationY: 0, y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: st(f, i) });
        } else {
          // Twin circle irises
          gsap.timeline({ scrollTrigger: st(f, i) })
            .fromTo(f.querySelector('.g-media'),
              { clipPath: 'circle(0% at 50% 50%)' },
              { clipPath: 'circle(75% at 50% 50%)', ease: 'none' }, 0)
            .fromTo(imgOf(f), { scale: 1.35 }, { scale: 1, ease: 'none' }, 0);
        }
        revealCaption(capOf(f), o.captionStyle, { trigger: f });
      });
    },

    // Playful one-shots (silly page) -----------------------------
    pop: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.fromTo(f, { scale: 0, rotation: -25 }, {
        scale: 1, rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.45)', scrollTrigger: popIn(sec)
      });
      revealCaption(capOf(f), o.captionStyle, { trigger: f, start: 'top 60%' });
    },

    spin: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.fromTo(f, { scale: 0.1, rotation: -540, opacity: 0 }, {
        scale: 1, rotation: 0, opacity: 1, duration: 1.3, ease: 'back.out(1.5)', scrollTrigger: popIn(sec)
      });
      revealCaption(capOf(f), o.captionStyle, { trigger: f, start: 'top 60%' });
    },

    rubber: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.timeline({ scrollTrigger: popIn(sec) })
        .fromTo(f, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'power2.out' })
        .to(f, {
          keyframes: [
            { scaleX: 1.25, scaleY: 0.75 },
            { scaleX: 0.75, scaleY: 1.25 },
            { scaleX: 1.15, scaleY: 0.85 },
            { scaleX: 0.95, scaleY: 1.05 },
            { scaleX: 1.05, scaleY: 0.95 },
            { scaleX: 1, scaleY: 1 }
          ],
          duration: 0.9,
          ease: 'none'
        });
      revealCaption(capOf(f), o.captionStyle, { trigger: f, start: 'top 60%' });
    },

    // Food page ------------------------------------------------
    // A silver serving dome lifts off to reveal the photo
    cloche: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      var media = f.querySelector('.g-media');
      var dome = el('div', 'g-dome', media);
      dome.setAttribute('aria-hidden', 'true');
      gsap.timeline({ scrollTrigger: entering(sec, 'top 75%', 'center 55%') })
        .fromTo(dome, { yPercent: 0, rotation: 0 }, { yPercent: -125, rotation: -14, ease: 'power1.inOut' }, 0)
        .fromTo(imgOf(f), { scale: 1.25 }, { scale: 1, ease: 'none' }, 0);
      gsap.fromTo(f, { y: 80, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: entering(sec, 'top bottom', 'top 60%') });
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Pancake flip: tossed up from below, flipping over on the way
    toss: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.fromTo(f,
        { y: 260, rotationX: -360, scale: 0.6, opacity: 0, transformPerspective: 1200 },
        { y: 0, rotationX: 0, scale: 1, opacity: 1, ease: 'power2.out', scrollTrigger: entering(sec, 'top 95%', 'center 55%') });
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Fills up from the bottom like a glass being poured
    fill: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.timeline({ scrollTrigger: entering(sec, 'top 85%') })
        .fromTo(f.querySelector('.g-media'),
          { clipPath: 'inset(100% 0% 0% 0% round 14px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none' }, 0)
        .fromTo(imgOf(f), { yPercent: 12, scale: 1.2 }, { yPercent: 0, scale: 1, ease: 'none' }, 0)
        .fromTo(f, { rotation: -3 }, { rotation: 0, ease: 'none' }, 0);
      revealCaption(capOf(f), o.captionStyle, { trigger: f });
    },

    // Reduced-motion fallback: a plain fade, no pinning or scrubbing
    fade: function (sec, p, o) {
      var f = sec.appendChild(frame(p[0], o));
      gsap.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.8, scrollTrigger: { trigger: sec, start: 'top 80%' } });
    }
  };

  function firstSingle(seq) {
    for (var i = 0; i < seq.length; i++) if (!GROUPS[seq[i]] && LAYOUTS[seq[i]]) return seq[i];
    return 'zoom';
  }

  function isPortrait(p) { return (p.height || 3) > (p.width || 4) * 1.05; }

  // Group photos into units: each landscape photo on its own, portraits in
  // pairs. A lone portrait is paired with the next portrait further down,
  // so two portraits split by landscapes still end up side by side.
  function pairUp(photos) {
    var units = [], used = [];
    photos.forEach(function (p, i) {
      if (used[i]) return;
      used[i] = true;
      if (isPortrait(p)) {
        for (var j = i + 1; j < photos.length; j++) {
          if (!used[j] && isPortrait(photos[j])) {
            used[j] = true;
            units.push([p, photos[j]]);
            return;
          }
        }
      }
      units.push([p]);
    });
    return units;
  }

  function mount(container, category, opts) {
    opts = Object.assign({ sequence: DEFAULT_SEQUENCE, captionStyle: 'words' }, opts);
    var photos = ((window.PHOTOS || {})[category] || []).filter(function (p) { return p && p.src; });

    if (!photos.length) {
      var empty = el('div', 'g-empty', container);
      empty.innerHTML = '<p>No photos here yet.<br>Add some to <code>raw-photos/' + category +
        '</code> and run <code>python scripts/process_photos.py</code>.</p>';
      return;
    }

    var seq = reduced ? ['fade'] : opts.sequence.filter(function (t) { return LAYOUTS[t]; });
    var o = { captionStyle: opts.captionStyle, index: 0, count: 0, n: 0, pairs: 0 };
    var i = 0, k = 0, skips = 0;

    function add(type, items) {
      var sec = el('section', 'g-sec g-' + type, container);
      o.index = i;
      LAYOUTS[type](sec, items, o);
      lazy(sec);
      i += items.length;
      o.count++;
    }

    // Portraits side by side, landscapes alone, single-photo transitions only
    if (opts.pairPortraits) {
      var singles = seq.filter(function (t) { return !GROUPS[t]; });
      if (!singles.length) singles = ['zoom'];
      pairUp(photos).forEach(function (unit) {
        add(unit.length === 2 ? 'pair' : singles[k++ % singles.length], unit);
      });
      ScrollTrigger.refresh();
      return;
    }

    while (i < photos.length) {
      var type = seq[k++ % seq.length];
      var group = GROUPS[type], take = 1;
      if (group) {
        var left = photos.length - i;
        if (left < group.min) {
          if (++skips < seq.length) continue;
          type = firstSingle(seq);
        } else {
          take = Math.min(group.max, left);
        }
      }
      skips = 0;
      add(type, photos.slice(i, i + take));
    }

    ScrollTrigger.refresh();
  }

  window.Gallery = { mount: mount };
})();
