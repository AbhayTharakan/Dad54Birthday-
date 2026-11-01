/*
 * Lightweight canvas fireworks + confetti.
 *   var fw = new Fireworks(canvas);
 *   fw.burst(x, y, { count, power, confetti, colors });
 *   fw.rain(count);   // confetti falling from the top
 *   fw.scatter(count) // one static frame (for reduced motion)
 *   fw.clear();
 * The loop only runs while particles are alive and the canvas is on screen.
 */
(function () {
  'use strict';

  var COLORS = ['#ffd166', '#ff5d8f', '#4cc9f0', '#80ed99', '#f72585', '#ffffff', '#ff9f1c', '#b388ff'];
  var MAX = 2600;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function Fireworks(canvas, opts) {
    opts = opts || {};
    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colors = opts.colors || COLORS;
    this.sparks = [];
    this.bits = [];
    this.running = false;
    this.visible = true;
    this.w = 0;
    this.h = 0;
    this._tick = this._tick.bind(this);
    this.resize();

    window.addEventListener('resize', function () { self.resize(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self._start();
      }).observe(canvas);
    }
  }

  Fireworks.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    // Ignore tiny height changes from mobile address bars (resizing clears the canvas)
    if (Math.abs(r.width - this.w) < 1 && Math.abs(r.height - this.h) < 120) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  };

  Fireworks.prototype.burst = function (x, y, opts) {
    opts = opts || {};
    var n = opts.count || 150;
    var size = Math.min(this.w, this.h);
    var power = (opts.power || 1) * size * 1.4;
    var palette = opts.colors || this.colors;
    var i, a, s;

    for (i = 0; i < n && this.sparks.length < MAX; i++) {
      a = Math.random() * Math.PI * 2;
      s = power * (0.2 + Math.pow(Math.random(), 0.55) * 0.8);
      this.sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        age: 0, life: rand(1, 2.1),
        size: rand(1.4, 3),
        color: pick(palette)
      });
    }
    for (i = 0; i < (opts.confetti || 0) && this.bits.length < MAX; i++) {
      a = Math.random() * Math.PI * 2;
      s = power * rand(0.15, 0.7);
      this.bits.push(this._bit(x, y, Math.cos(a) * s, Math.sin(a) * s - size * 0.3, palette));
    }
    this._start();
  };

  Fireworks.prototype.rain = function (count) {
    for (var i = 0; i < count && this.bits.length < MAX; i++) {
      var b = this._bit(rand(0, this.w), rand(-this.h * 0.4, -10), rand(-40, 40), rand(40, 140), this.colors);
      b.life = rand(4, 6.5);
      this.bits.push(b);
    }
    this._start();
  };

  Fireworks.prototype.scatter = function (count) {
    this.clear();
    for (var i = 0; i < count; i++) {
      this.bits.push(this._bit(rand(0, this.w), rand(0, this.h), 0, 0, this.colors));
    }
    this._draw();
    this.bits.length = 0;
  };

  Fireworks.prototype.clear = function () {
    this.sparks.length = 0;
    this.bits.length = 0;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Fireworks.prototype._bit = function (x, y, vx, vy, palette) {
    return {
      x: x, y: y, vx: vx, vy: vy,
      age: 0, life: rand(2.5, 4.5),
      w: rand(6, 11), h: rand(3, 6),
      rot: rand(0, Math.PI * 2), spin: rand(-8, 8),
      flip: rand(0, Math.PI * 2), flipSpeed: rand(4, 10),
      sway: rand(0, Math.PI * 2),
      color: pick(palette)
    };
  };

  Fireworks.prototype._start = function () {
    if (this.running || !this.visible || !(this.sparks.length || this.bits.length)) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  };

  Fireworks.prototype._tick = function (now) {
    var dt = Math.min((now - this._last) / 1000, 1 / 30);
    this._last = now;
    this._update(dt);
    this._draw();
    if (this.visible && (this.sparks.length || this.bits.length)) {
      requestAnimationFrame(this._tick);
    } else {
      this.running = false;
    }
  };

  Fireworks.prototype._update = function (dt) {
    var size = Math.min(this.w, this.h) || 600;
    var g = size * 0.45;
    var sparkDrag = Math.pow(0.12, dt);
    var bitDrag = Math.pow(0.3, dt);
    var arr, p, i;

    arr = this.sparks;
    for (i = arr.length - 1; i >= 0; i--) {
      p = arr[i];
      p.age += dt;
      if (p.age >= p.life) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
      p.vx *= sparkDrag;
      p.vy = p.vy * sparkDrag + g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    arr = this.bits;
    for (i = arr.length - 1; i >= 0; i--) {
      p = arr[i];
      p.age += dt;
      if (p.age >= p.life || p.y > this.h + 30) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
      p.vx *= bitDrag;
      p.vy = p.vy * bitDrag + g * 0.5 * dt; // drag alone settles this to a gentle fall
      p.x += (p.vx + Math.sin(p.age * 3 + p.sway) * 40) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.flip += p.flipSpeed * dt;
    }
  };

  Fireworks.prototype._draw = function () {
    var ctx = this.ctx, dpr = this.dpr;
    var arr, p, i, t, a;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // Sparks: additive streaks
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    arr = this.sparks;
    for (i = 0; i < arr.length; i++) {
      p = arr[i];
      t = p.age / p.life;
      a = 1 - t * t;
      if (t > 0.55) a *= 0.45 + Math.random() * 0.55; // twinkle as they die
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Confetti: flipping rectangles
    ctx.globalCompositeOperation = 'source-over';
    arr = this.bits;
    for (i = 0; i < arr.length; i++) {
      p = arr[i];
      t = p.age / p.life;
      ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
      ctx.fillStyle = p.color;
      var c = Math.cos(p.rot), s = Math.sin(p.rot), f = Math.cos(p.flip);
      ctx.setTransform(dpr * c, dpr * s, -dpr * s * f, dpr * c * f, dpr * p.x, dpr * p.y);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.globalAlpha = 1;
  };

  window.Fireworks = Fireworks;
})();
