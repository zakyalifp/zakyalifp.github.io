/* ==========================================================================
   ACLS Simulator — pustaka ritme, generator gelombang & monitor (canvas)
   Tiga kanal: EKG lead II, pletismografi SpO2, kapnografi gelombang.
   ========================================================================== */
(function () {
  'use strict';
  var ACLS = window.ACLS = window.ACLS || {};

  /* --------------------------------------------------------------------
     Pustaka ritme
     kind : 'beats' (kompleks terorganisir) | 'vf' | 'flat'
     idg  : kelompok jawaban untuk identifikasi ritme (mode Mahir)
     -------------------------------------------------------------------- */
  var RHYTHMS = {
    sinus:        { label: 'Ritme sinus', idg: 'sinus', kind: 'beats', rate: 82, morph: 'narrow', p: true },
    sinus_tach:   { label: 'Sinus takikardia', idg: 'sinus', kind: 'beats', rate: 112, morph: 'narrow', p: true },
    sinus_brady:  { label: 'Sinus bradikardia', idg: 'sinus_brady', kind: 'beats', rate: 46, morph: 'narrow', p: true },
    stemi:        { label: 'Sinus + elevasi segmen ST', idg: 'sinus', kind: 'beats', rate: 100, morph: 'narrow', p: true, st: 0.34 },
    longqt:       { label: 'Sinus dengan QT memanjang', idg: 'sinus', kind: 'beats', rate: 88, morph: 'narrow', p: true, qtMul: 1.45 },
    vf_coarse:    { label: 'Fibrilasi ventrikel (VF) kasar', idg: 'vf', kind: 'vf', amp: 0.62 },
    vf_fine:      { label: 'Fibrilasi ventrikel (VF) halus', idg: 'vf', kind: 'vf', amp: 0.24 },
    vt:           { label: 'Takikardia ventrikel (VT) monomorfik', idg: 'vt', kind: 'beats', rate: 176, morph: 'vt' },
    torsades:     { label: 'Torsades de pointes (VT polimorfik)', idg: 'torsades', kind: 'beats', rate: 230, morph: 'vt', twist: true },
    asystole:     { label: 'Asistol', idg: 'asystole', kind: 'flat' },
    pause:        { label: 'Jeda / blok AV sesaat (efek adenosin)', idg: 'asystole', kind: 'flat', pRate: 90 },
    pea_narrow:   { label: 'Takikardia QRS sempit terorganisir', idg: 'sinus', kind: 'beats', rate: 128, morph: 'narrow', p: true, amp: 0.75 },
    idioventricular: { label: 'Ritme idioventrikular (QRS lebar lambat)', idg: 'wide_slow', kind: 'beats', rate: 34, morph: 'wide' },
    hyperk_slow:  { label: 'QRS sangat lebar & lambat (pola sinusoidal hiperkalemia)', idg: 'wide_slow', kind: 'beats', rate: 40, morph: 'hyperk' },
    hyperk:       { label: 'Sinus, QRS lebar + gelombang T runcing', idg: 'sinus', kind: 'beats', rate: 78, morph: 'hyperk', p: true },
    avb3:         { label: 'AV blok derajat 3 (total) dengan escape ventrikel', idg: 'avb3', kind: 'beats', rate: 34, morph: 'wide', pRate: 82 },
    svt:          { label: 'SVT — takikardia QRS sempit reguler', idg: 'svt', kind: 'beats', rate: 186, morph: 'narrow' },
    af:           { label: 'Fibrilasi atrium dengan respons ventrikel cepat', idg: 'af', kind: 'beats', rate: 164, morph: 'narrow', irregular: true, fib: true }
  };

  /* Pilihan jawaban identifikasi ritme (mode Mahir) */
  var RHYTHM_CHOICES = [
    { id: 'vf', label: 'Fibrilasi ventrikel (VF)' },
    { id: 'vt', label: 'VT monomorfik' },
    { id: 'torsades', label: 'VT polimorfik / Torsades' },
    { id: 'asystole', label: 'Asistol' },
    { id: 'sinus', label: 'Ritme sinus / sinus takikardia' },
    { id: 'sinus_brady', label: 'Sinus bradikardia' },
    { id: 'avb3', label: 'AV blok derajat 3' },
    { id: 'wide_slow', label: 'QRS lebar lambat (idioventrikular / hiperkalemia)' },
    { id: 'svt', label: 'SVT (QRS sempit reguler)' },
    { id: 'af', label: 'Fibrilasi atrium' }
  ];

  ACLS.RHYTHMS = RHYTHMS;
  ACLS.RHYTHM_CHOICES = RHYTHM_CHOICES;

  /* --------------------------------------------------------------------
     Fungsi bentuk gelombang
     -------------------------------------------------------------------- */
  function G(x, c, w) { var d = (x - c) / w; return Math.exp(-0.5 * d * d); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function plateau(x, a, b, s) { return sig((x - a) / s) * sig((b - x) / s); }

  // dt = waktu relatif terhadap puncak QRS (detik)
  function beatShape(dt, b) {
    var v = 0;
    var rr = Math.max(0.3, Math.min(b.rr, 1.6));
    var qm = b.qt || 1;
    var qt = 0.27 * Math.sqrt(rr) * qm;
    switch (b.m) {
      case 'narrow':
        if (b.p) v += 0.13 * G(dt, -0.16, 0.026);
        v += -0.09 * G(dt, -0.022, 0.007) + 1.0 * G(dt, 0, 0.010) - 0.26 * G(dt, 0.022, 0.008);
        v += 0.30 * G(dt, qt, 0.048 * qm);
        if (b.st) v += b.st * plateau(dt, 0.035, qt, 0.014);
        break;
      case 'wide':
        if (b.p) v += 0.12 * G(dt, -0.18, 0.028);
        v += 0.82 * G(dt, 0, 0.032) - 0.42 * G(dt, 0.075, 0.032) - 0.28 * G(dt, qt + 0.08, 0.07);
        break;
      case 'hyperk':
        if (b.p) v += 0.05 * G(dt, -0.2, 0.035);
        v += 0.72 * G(dt, 0, 0.042) - 0.34 * G(dt, 0.095, 0.04) + 0.78 * G(dt, qt * 0.95 + 0.03, 0.038);
        break;
      case 'paced':
        v += (Math.abs(dt + 0.04) < 0.005 ? 1.5 : 0);
        v += 0.9 * G(dt, 0.01, 0.035) - 0.4 * G(dt, 0.085, 0.035) - 0.3 * G(dt, qt + 0.08, 0.07);
        break;
      case 'vt':
        v += 1.1 * G(dt, 0, 0.045) - 0.75 * G(dt, 0.12, 0.055);
        break;
    }
    return v * (b.amp || 1);
  }

  /* --------------------------------------------------------------------
     Generator: menjadwalkan denyut & menghasilkan sampel tiap waktu t
     -------------------------------------------------------------------- */
  function Gen() {
    this.beats = []; this.ps = []; this.spikes = [];
    this.nb = 0.3; this.np = 0.1; this.ns = 0.1;
    this.id = 'sinus'; this.r = RHYTHMS.sinus; this.rate = 80;
    this.pacing = { on: false, rate: 70, capture: false };
    this.lastT = 0;
  }

  Gen.prototype.set = function (id, rate, t) {
    var r = RHYTHMS[id] || RHYTHMS.asystole;
    this.id = id; this.r = r; this.rate = rate || r.rate || 0;
    t = t || this.lastT;
    // hapus denyut yang sudah terjadwal di masa depan
    var last = -10;
    this.beats = this.beats.filter(function (b) { if (b.t <= t) { last = Math.max(last, b.t); return true; } return false; });
    this.ps = this.ps.filter(function (p) { return p <= t; });
    this.nb = Math.max(t + 0.2, last + 0.3);
    this.np = t + 0.15;
  };

  Gen.prototype.setPacing = function (on, rate, capture, t) {
    var changed = (on !== this.pacing.on) || (capture !== this.pacing.capture) || (rate !== this.pacing.rate);
    this.pacing = { on: on, rate: rate, capture: capture };
    if (changed) {
      t = t || this.lastT;
      var last = -10;
      this.beats = this.beats.filter(function (b) { if (b.t <= t) { last = Math.max(last, b.t); return true; } return false; });
      this.spikes = this.spikes.filter(function (s) { return s <= t; });
      this.nb = Math.max(t + 0.15, last + 0.3);
      this.ns = t + 0.15;
    }
  };

  Gen.prototype.schedule = function (t) {
    var horizon = t + 1.0, r = this.r;
    var paced = this.pacing.on, capture = paced && this.pacing.capture;
    if (r.kind === 'beats' || capture) {
      while (this.nb < horizon) {
        var rate = capture ? this.pacing.rate : this.rate;
        var rr = 60 / Math.max(rate, 5);
        if (!capture && r.irregular) rr *= 0.62 + Math.random() * 0.76;
        this.beats.push({ t: this.nb, m: capture ? 'paced' : r.morph, rr: rr, st: capture ? 0 : (r.st || 0), qt: r.qtMul || 1, p: !capture && r.p, amp: capture ? 1 : r.amp });
        this.nb += rr;
      }
    } else {
      this.nb = Math.max(this.nb, horizon);
    }
    if (r.pRate && !capture) {
      while (this.np < horizon) { this.ps.push(this.np); this.np += 60 / r.pRate; }
    } else { this.np = Math.max(this.np, horizon); }
    if (paced && !capture) {
      while (this.ns < horizon) { this.spikes.push(this.ns); this.ns += 60 / this.pacing.rate; }
    } else { this.ns = Math.max(this.ns, horizon); }
    var cut = t - 1.6;
    if (this.beats.length && this.beats[0].t < cut) this.beats = this.beats.filter(function (b) { return b.t >= cut; });
    if (this.ps.length && this.ps[0] < cut) this.ps = this.ps.filter(function (p) { return p >= cut; });
    if (this.spikes.length && this.spikes[0] < cut) this.spikes = this.spikes.filter(function (s) { return s >= cut; });
    this.lastT = t;
  };

  Gen.prototype.ecg = function (t) {
    var r = this.r, v = 0, i, dt;
    if (r.kind === 'vf') {
      var a = r.amp * (0.65 + 0.35 * Math.sin(2 * Math.PI * 0.23 * t + 1.3));
      v = a * (0.55 * Math.sin(2 * Math.PI * 4.3 * t) + 0.3 * Math.sin(2 * Math.PI * 6.1 * t + 0.7) +
               0.2 * Math.sin(2 * Math.PI * 2.9 * t + 2.1) + 0.12 * Math.sin(2 * Math.PI * 8.3 * t));
    } else if (r.kind === 'flat') {
      v = 0.025 * Math.sin(2 * Math.PI * 0.27 * t);
    }
    var bv = 0;
    for (i = 0; i < this.beats.length; i++) {
      dt = t - this.beats[i].t;
      if (dt > -0.3 && dt < 0.9) bv += beatShape(dt, this.beats[i]);
    }
    if (r.twist && !(this.pacing.on && this.pacing.capture)) bv *= 1.15 * Math.sin(2 * Math.PI * 0.16 * t);
    v += bv;
    for (i = 0; i < this.ps.length; i++) v += 0.14 * G(t - this.ps[i], 0, 0.028);
    for (i = 0; i < this.spikes.length; i++) if (Math.abs(t - this.spikes[i]) < 0.005) v += 1.5;
    if (r.fib) v += 0.045 * Math.sin(2 * Math.PI * 5.8 * t) + 0.03 * Math.sin(2 * Math.PI * 8.7 * t + 1);
    v += (Math.random() - 0.5) * 0.012;
    return v;
  };

  Gen.prototype.pleth = function (t, perf) {
    var v = 0;
    for (var i = 0; i < this.beats.length; i++) {
      var dt = t - this.beats[i].t;
      if (dt > 0 && dt < 1.1) v += 0.85 * G(dt, 0.26, 0.075) + 0.28 * G(dt, 0.46, 0.06);
    }
    return v * perf;
  };

  function cprWave(t, start) {
    var ph = ((t - start) * 110 / 60) % 1;
    if (ph < 0) ph += 1;
    return ph < 0.45 ? Math.sin(Math.PI * ph / 0.45) : -0.18 * Math.sin(Math.PI * (ph - 0.45) / 0.55);
  }

  function capnoWave(t, level, vInt) {
    var ph = t % vInt;
    if (ph < 0.9) return level * Math.exp(-ph / 0.07);
    return level * (1 - Math.exp(-(ph - 0.9) / 0.2));
  }

  /* --------------------------------------------------------------------
     Monitor: menggambar sapuan (sweep) seperti monitor sungguhan
     -------------------------------------------------------------------- */
  var COLORS = { bg: '#060d18', ecg: '#3ee67f', pleth: '#3fd3f7', co2: '#f6d74a', grid: 'rgba(120,150,190,0.07)' };

  function Monitor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.gen = new Gen();
    this.x = 0; this.tLast = 0; this.prev = null;
    this.onBeat = null;
    this.st = { pulse: false, perf: 1, cpr: false, cprStart: 0, capno: false, etco2: 0, vInt: 6 };
    this.resize();
  }

  Monitor.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w = this.c.clientWidth || 600, h = this.c.clientHeight || 260;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.pps = Math.max(60, w / 6);   // ±6 detik per layar
    this.clear();
  };

  Monitor.prototype.clear = function () {
    var ctx = this.ctx;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    this.x = 0; this.prev = null;
  };

  Monitor.prototype.lanes = function () {
    var h = this.h;
    return {
      ecg: { y: h * 0.32, s: h * 0.17 },
      pleth: { y: h * 0.78, s: h * 0.14 },
      co2: { y: h * 0.975, s: h * 0.16 }
    };
  };

  Monitor.prototype.sample = function (t) {
    var st = this.st, L = this.lanes();
    var e = this.gen.ecg(t);
    if (st.cpr) e += 0.95 * cprWave(t, st.cprStart);
    var p = 0;
    if (st.pulse) p = this.gen.pleth(t, st.perf);
    else if (st.cpr) p = 0.35 * Math.max(0, cprWave(t, st.cprStart));
    p += (Math.random() - 0.5) * 0.01;
    var c = st.capno ? capnoWave(t, Math.min(st.etco2, 60) / 50, st.vInt) : 0;
    return [L.ecg.y - e * L.ecg.s, L.pleth.y - p * L.pleth.s, L.co2.y - c * L.co2.s];
  };

  Monitor.prototype.draw = function (t) {
    var ctx = this.ctx;
    if (t < this.tLast || t - this.tLast > 1.5) { this.clear(); this.tLast = t - 0.02; }
    var prevT = this.tLast;
    this.gen.schedule(t);
    var n = Math.floor((t - this.tLast) * this.pps);
    if (n < 1) return;
    var cols = [COLORS.ecg, COLORS.pleth, COLORS.co2];
    if (!this.prev) this.prev = this.sample(this.tLast);
    var pts = [];
    for (var i = 1; i <= n; i++) pts.push(this.sample(this.tLast + i / this.pps));
    ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    for (var ch = 0; ch < 3; ch++) {
      ctx.strokeStyle = cols[ch];
      ctx.beginPath();
      var x = this.x, py = this.prev[ch];
      ctx.moveTo(x, py);
      for (var k = 0; k < pts.length; k++) {
        x += 1;
        if (x >= this.w) { ctx.stroke(); ctx.beginPath(); x = 0; ctx.moveTo(0, pts[k][ch]); continue; }
        ctx.lineTo(x, pts[k][ch]);
      }
      ctx.stroke();
    }
    this.x = (this.x + n) % this.w;
    this.prev = pts[pts.length - 1];
    // hapus area di depan garis sapuan
    ctx.fillStyle = COLORS.bg;
    var gap = 18;
    if (this.x + gap <= this.w) ctx.fillRect(this.x + 1, 0, gap, this.h);
    else { ctx.fillRect(this.x + 1, 0, this.w - this.x, this.h); ctx.fillRect(0, 0, gap - (this.w - this.x), this.h); }
    this.tLast += n / this.pps;
    // denyut yang terlewati (untuk bunyi beep)
    if (this.onBeat) {
      for (var b = 0; b < this.gen.beats.length; b++) {
        var bt = this.gen.beats[b].t;
        if (bt > prevT && bt <= this.tLast) this.onBeat(this.gen.beats[b]);
      }
    }
  };

  ACLS.Monitor = Monitor;
})();
