/* ==========================================================================
   ATLS Simulator — mesin simulasi trauma
   Model fisiologi sederhana: volume darah & kelas syok (I–IV), sumber
   perdarahan, syok obstruktif (tension, tamponade), jalan napas, cedera otak
   (TIK/herniasi), syok neurogenik, luka bakar, kehamilan, dan hipotermia.
   Waktu simulasi (S.t) dalam detik; berjalan real-time × kecepatan.
   Acuan prinsip: ATLS® edisi ke-11 (American College of Surgeons, 2025).
   ========================================================================== */
(function () {
  'use strict';
  var T = window.ATLS = window.ATLS || {};

  function fmt(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '–';
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    }
    return pts[pts.length - 1][1];
  }
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function r0(x) { return Math.round(x); }
  T.fmt = fmt; T.clamp = clamp; T.lerp = lerp;

  /* Respons hemodinamik terhadap fraksi kehilangan volume efektif (deficit / EBV) */
  var CURVE = {
    adult: { hr: [[0, 0], [0.15, 10], [0.30, 34], [0.40, 54], [0.50, 68], [0.65, 78]],
             sbp: [[0, 0], [0.15, 0], [0.30, -8], [0.40, -35], [0.50, -62], [0.60, -92]],
             dbp: [[0, 0], [0.15, 6], [0.30, 3], [0.40, -18], [0.50, -34], [0.60, -50]] },
    child: { hr: [[0, 0], [0.15, 18], [0.30, 42], [0.40, 60], [0.50, 72]],
             sbp: [[0, 0], [0.25, 0], [0.35, -8], [0.45, -40], [0.55, -72]],
             dbp: [[0, 0], [0.25, 4], [0.35, -2], [0.45, -24], [0.55, -40]] }
  };
  var BD = [[0, -1], [0.15, -2.5], [0.30, -6], [0.40, -10], [0.50, -14], [0.65, -18]];

  function shockClass(fr) { return fr < 0.15 ? 1 : fr <= 0.30 ? 2 : fr <= 0.40 ? 3 : 4; }
  T.shockClass = shockClass;

  /* ==================================================================
     Sim
     ================================================================== */
  function Sim(scen, level, hooks) {
    var ini = scen.init;
    this.scen = scen; this.level = level; this.hooks = hooks || {};
    this.t = 0; this.speed = 1; this.paused = false; this.ended = false;
    this.peds = !!scen.peds;
    this.fac = scen.facility || {};
    this.p = clone(scen.problems);
    var p = this.p;
    this.pt = {
      age: ini.age, weight: ini.weight, sex: ini.sex,
      hr0: ini.hr0, sbp0: ini.sbp0, dbp0: ini.dbp0, rr0: ini.rr0, spo2b: ini.spo2 || 98,
      ebv: ini.weight * (this.peds ? 80 : 70) * (p.preg ? 1.4 : 1)
    };
    this.loss = ini.loss || 0;
    this.fl = { cryst: 0, crystOrd: 0, bloodMl: 0, prbc: 0, ffp: 0, plt: 0, firstBlood: null };
    this.inf = [];
    this.st = {
      monitor: false, iv: false, io: false, o2: false, bvm: false, jaw: false,
      airway: 'native', cspine: !!ini.cspine, exposed: false, warmed: false,
      capno: false, hob: false, catheter: false, gastric: '', cpr: false, lud: false, ventHyper: false
    };
    if (p.tbi) p.tbi.icp0 = p.tbi.icp;
    this.temp = ini.temp || 36.4;
    this.phase = 'alive';
    this.arr = { start: null, episodes: 0, total: 0, roscAt: null, lowSince: null, okSince: null, cause: '' };
    this.acts = {}; this.log = []; this.pens = []; this.penCount = {}; this.findings = []; this.timers = [];
    this.flags = {}; this.fix = {};
    this.dx = null; this.sbar = null; this.brief = null; this.burnCalc = null;
    this.tg = {}; this.v = {};
    this.compute();
    this.v = { hr: this.tg.hr, sbp: this.tg.sbp, dbp: this.tg.dbp, spo2: this.tg.spo2, rr: this.tg.rr };
    this.min = { sbp: this.v.sbp, spo2: this.v.spo2, temp: this.temp, maxFrac: Math.max(0, this.frac) };
    this.lastStable = null;
  }
  var P = Sim.prototype;

  /* ---------------- util ---------------- */
  P.did = function (id) { return !!(this.acts[id] && this.acts[id].length); };
  P.didAfter = function (id, t0) { var a = this.acts[id] || []; for (var i = 0; i < a.length; i++) if (a[i] >= t0) return true; return false; };
  P.firstAct = function (id) { var a = this.acts[id]; return a && a.length ? a[0] : null; };
  P.lastAct = function (id) { var a = this.acts[id]; return a && a.length ? a[a.length - 1] : null; };
  P.count = function (id) { return (this.acts[id] || []).length; };
  P.after = function (sec, fn) { this.timers.push({ at: this.t + sec, fn: fn }); };
  P.emit = function (name, a, b) { if (this.hooks[name]) this.hooks[name](a, b); };
  P.setFix = function (k) { if (this.fix[k] === undefined) this.fix[k] = this.t; };
  P.access = function () { return this.st.iv || this.st.io; };
  P.secured = function () { return this.st.airway === 'ett' || this.st.airway === 'cric'; };
  P.ventilated = function () { return this.secured() || this.st.bvm; };
  P.map = function () { return r0((this.v.sbp + 2 * this.v.dbp) / 3); };
  P.sinceInjury = function () { return (this.scen.init.injuryAgo || 0) + this.t; };
  P.letters = function () {
    var o = {}, self = this;
    ['x', 'a', 'b', 'c', 'd', 'e'].forEach(function (k) { o[k] = self.firstAct(k + '_assess'); });
    return o;
  };
  P.psDone = function () { var L = this.letters(); return L.x !== null && L.a !== null && L.b !== null && L.c !== null && L.d !== null && L.e !== null; };
  P.dose = function (mlKg, maxMl) { var v = mlKg * this.pt.weight; return maxMl ? Math.min(v, maxMl) : v; };

  /* ---------------- log & penilaian ---------------- */
  P.addLog = function (text, kind, teach) {
    var e = { t: this.t, text: text, kind: kind || 'act', teach: teach || '' };
    this.log.push(e); this.emit('log', e); return e;
  };
  P.act = function (x) { return this.addLog(x, 'act'); };
  P.obs = function (x) { return this.addLog(x, 'obs'); };
  P.alert = function (x) { return this.addLog(x, 'alert'); };
  P.good = function (x, teach) { return this.addLog(x, 'good', teach); };
  P.tip = function (x, teach) { return this.addLog(x, 'tip', teach); };
  P.penalize = function (kind, code, text, pts, teach) {
    this.penCount[code] = (this.penCount[code] || 0) + 1;
    var p = this.penCount[code] <= 2 ? (pts || 0) : 0;
    this.pens.push({ t: this.t, code: code, text: text, pts: p, teach: teach || '', kind: kind });
    this.addLog(text, kind, teach);
  };
  P.err = function (c, x, pts, teach) { this.penalize('err', c, x, pts, teach); };
  P.warn = function (c, x, pts, teach) { this.penalize('warn', c, x, pts, teach); };
  P.addFinding = function (title, text) { this.findings.unshift({ t: this.t, title: title, text: text }); this.emit('finding'); };

  /* ---------------- status klinis turunan ---------------- */
  P.tensionSev = function () {
    var tn = this.p.tension;
    return tn ? clamp(tn.s, 0, 1) : 0;
  };
  P.airwaySev = function () {
    var a = this.p.airway;
    if (!a || this.secured()) return 0;
    var s = a.sev;
    if (a.type === 'gcs') {
      if (this.st.airway === 'opa' || this.st.airway === 'npa') s *= 0.25;
      else if (this.st.jaw) s *= 0.5;
    } else if (this.st.jaw) s *= 0.88;
    return clamp(s, 0, 1);
  };
  P.gcs = function () {
    var g = this.scen.init.gcs, e = g[0], v = g[1], m = g[2], tb = this.p.tbi;
    if (tb) {
      var d = tb.icp - tb.icp0;
      m -= r0(d * 6); e -= r0(d * 3.5); v -= r0(d * 4.5);
    }
    var sbp = this.v.sbp === undefined ? this.pt.sbp0 : this.v.sbp, sp = this.v.spo2 === undefined ? 97 : this.v.spo2;
    if (sbp < 75) { e -= 1; v -= 1; }
    if (sbp < 60) { e -= 2; v -= 2; m -= 1; }
    if (sp < 85) { e -= 1; v -= 1; }
    if (this.phase !== 'alive') { e = 1; v = 1; m = 1; }
    e = clamp(e, 1, 4); v = clamp(v, 1, 5); m = clamp(m, 1, 6);
    return { e: e, v: v, m: m, total: e + v + m, tube: this.secured(), sed: this.flags.rsiAt !== undefined };
  };
  P.gcsText = function () {
    var g = this.gcs();
    if (g.sed) return 'Tersedasi/terintubasi (GCS pra-intubasi ' + this.flags.gcsPreRsi + ')';
    return 'E' + g.e + 'V' + g.v + 'M' + g.m + ' = ' + g.total;
  };
  P.pupils = function () {
    var tb = this.p.tbi;
    if (this.phase !== 'alive') return 'Midriasis bilateral, refleks cahaya (−)';
    if (!tb) return 'Isokor 3 mm, refleks cahaya (+/+)';
    if (tb.icp >= 0.9) return 'Midriasis bilateral 6–7 mm, refleks cahaya (−/−)';
    if (tb.icp >= 0.58) return 'Anisokor — pupil ' + tb.side + ' 6 mm refleks (−), sisi lain 3 mm refleks (+)';
    if (tb.icp >= 0.45) return 'Pupil ' + tb.side + ' 4 mm refleks melambat, sisi lain 3 mm (+)';
    return 'Isokor 3 mm, refleks cahaya (+/+)';
  };
  P.bleedRates = function () {
    var p = this.p, out = {};
    var press = this.phase === 'alive' ? clamp(this.v.sbp / 100, 0.25, 1.25) : 0.12;
    var k = press * this.coag();
    if (p.ext) out.ext = p.ext.rate * (1 - (p.ext.ctrl || 0)) * press;
    if (p.pelvis) out.pelvis = p.pelvis.rate * (1 - (p.pelvis.ctrl || 0)) * k;
    if (p.abdo) out.abdo = p.abdo.rate * (1 - (p.abdo.ctrl || 0)) * k;
    if (p.htx) out.htx = p.htx.rate * (1 - (p.htx.ctrl || 0)) * k;
    if (p.femur) out.femur = p.femur.rate * (1 - (p.femur.ctrl || 0)) * k;
    if (p.preg && p.preg.abrupt) out.preg = p.preg.abrupt * (1 - (p.preg.ctrl || 0)) * k;
    return out;
  };
  P.totalBleed = function () { var b = this.bleedRates(), s = 0; for (var k in b) s += b[k]; return s; };
  P.coag = function () {
    var c = 1, f = this.fl;
    if (this.temp < 35) c += 0.35; else if (this.temp < 36) c += 0.15;
    c += Math.min(0.5, Math.max(0, f.cryst - 1000) / 3000);
    if (f.prbc >= 4 && f.ffp < f.prbc * 0.5) c += 0.2;
    if (this.flags.txa) c -= 0.2;
    if (this.p.anticoag && !this.flags.reversed) c += 0.3;
    return Math.max(0.6, c);
  };
  P.hemorrhagic = function () { return this.min.maxFrac >= 0.15 || this.totalBleed() > 8; };
  P.unstable = function () {
    return this.phase !== 'alive' || this.v.sbp < (this.peds ? 70 + 2 * this.pt.age : 90) || this.tensionSev() > 0.25 ||
      (this.p.tamp && this.p.tamp.s > 0.3) || this.airwaySev() > 0.4 || this.frac > 0.3;
  };

  /* ---------------- fisiologi: target tanda vital ---------------- */
  P.compute = function () {
    var pt = this.pt, p = this.p, f = this.fl, st = this.st;
    var eff = f.bloodMl + f.cryst * (p.burn ? 0.8 : 0.3);
    var frac = (this.loss - eff) / pt.ebv;
    this.frac = frac;
    var fr = Math.max(0, frac), C = this.peds ? CURVE.child : CURVE.adult;
    var hr = pt.hr0 + lerp(C.hr, fr) * (p.neuro ? 0.2 : 1);
    var sbp = pt.sbp0 + lerp(C.sbp, fr);
    var dbp = pt.dbp0 + lerp(C.dbp, fr);
    if (frac < 0) { sbp += Math.min(14, -frac * 70); dbp += Math.min(7, -frac * 35); }
    if (p.betaBlock) hr = Math.min(hr, 74 + fr * 30);
    var ten = this.tensionSev();
    if (ten > 0) { sbp -= 85 * ten * ten; dbp -= 40 * ten * ten; hr += 28 * ten; }
    if (p.tamp) { var s = clamp(p.tamp.s, 0, 1); sbp -= 82 * s * s; dbp -= 28 * s * s; hr += 30 * s; sbp += clamp(eff / 80, 0, 12) * s; }
    if (p.neuro) {
      if (this.flags.pressor) { sbp += 30; dbp += 15; hr += 6; }
      if (this.t < (this.flags.atropineUntil || -1)) hr += 22;
    }
    if (p.tbi && p.tbi.icp > 0.55 && fr < 0.3) {
      var c = clamp((p.tbi.icp - 0.55) / 0.45, 0, 1);
      sbp += 42 * c; dbp += 12 * c; hr -= 30 * c;
    }
    if (p.preg && p.preg.ga >= 20 && !st.lud) { sbp -= 18; dbp -= 8; hr += 8; }
    if (this.flags.rsiDipUntil && this.t < this.flags.rsiDipUntil) { sbp -= 14; dbp -= 8; }
    // respirasi
    var aw = this.airwaySev(), awDef = 45 * aw * aw + 10 * aw, lung = 0;
    if (ten > 0) lung += 22 * ten;
    if (p.htx) lung += Math.min(15, p.htx.vol / 100);
    if (p.open && !p.open.sealed && !p.open.tube) lung += 12;
    if (p.flail) lung += p.flail.analg ? 5 : 9;
    if (p.resp) lung += p.resp.def;
    if (p.burn && p.burn.circChest && !this.flags.eschar) lung += 7;
    var ox = this.secured() ? 0.85 : st.bvm ? 0.65 : st.o2 ? 0.5 : 0;
    var spo2 = pt.spo2b - lung * (1 - ox) - awDef + (ox ? (100 - pt.spo2b) * 0.8 : 0);
    if (this.flags.apnea && !this.ventilated()) spo2 = 40;
    if (sbp < 70) spo2 -= (70 - sbp) * 0.25;
    if (this.phase !== 'alive' && !this.ventilated()) spo2 = 40;
    spo2 = clamp(spo2, 40, 100);
    var rr = pt.rr0 + fr * 26 + ten * 14 + (p.htx ? Math.min(8, p.htx.vol / 200) : 0) + (p.flail ? (p.flail.analg ? 3 : 9) : 0) + aw * 8 + (p.open && !p.open.sealed ? 6 : 0);
    if (p.resp) rr += p.resp.def * 0.5;
    if (this.secured()) rr = st.ventHyper ? 20 : 14;
    if (p.tbi && p.tbi.icp >= 0.85 && !this.secured()) rr = 8;
    this.tg = { hr: clamp(hr, 30, 190), sbp: Math.max(0, sbp), dbp: Math.max(0, Math.min(dbp, sbp - 12)), spo2: spo2, rr: clamp(rr, 4, 50) };
  };

  P.smooth = function (dt) {
    var v = this.v, tg = this.tg;
    function ap(k, tau) { v[k] += (tg[k] - v[k]) * (1 - Math.exp(-dt / tau)); }
    ap('hr', 9); ap('sbp', 11); ap('dbp', 11); ap('spo2', 14); ap('rr', 8);
  };

  /* ---------------- waktu ---------------- */
  P.tick = function (dtReal) {
    if (this.paused || this.ended) return;
    var dt = dtReal * this.speed;
    while (dt > 0 && !this.ended) { var d = Math.min(dt, 0.25); this.step(d); dt -= d; }
  };
  P.advance = function (sec) {
    var left = sec;
    while (left > 0 && !this.ended) { var d = Math.min(0.5, left); this.step(d); left -= d; }
    this.emit('jump');
  };

  P.step = function (dt) {
    var m = dt / 60, p = this.p, st = this.st;
    this.t += dt;
    // --- infus berjalan
    for (var i = 0; i < this.inf.length; i++) {
      var q = this.inf[i];
      var d = Math.min(q.ml, q.rate * m);
      q.ml -= d;
      if (q.kind === 'cryst' || q.kind === 'burn') this.fl.cryst += d; else this.fl.bloodMl += d;
      if (!st.warmed) this.temp -= d / 1000 * (q.kind === 'cryst' ? 0.25 : 0.45) * (this.peds ? 2.2 : 1);
    }
    this.inf = this.inf.filter(function (q) { return q.ml > 0.5; });
    // --- perdarahan
    var b = this.bleedRates(), tot = 0;
    for (var k in b) tot += b[k];
    this.loss += tot * m;
    if (p.htx) p.htx.vol += b.htx * m * (p.htx.tube ? 0 : 1);
    if (p.htx && p.htx.tube) p.htx.out += b.htx * m;
    if (p.abdo && p.abdo.decay) p.abdo.rate *= Math.pow(p.abdo.decay, m);
    if (p.burn) this.loss += (2 * this.pt.weight * p.burn.tbsa / 2) / 480 * m;
    // --- progresi
    if (p.tension) {
      var ppv = this.ventilated() ? 2.5 : 1;
      if (!p.tension.tube) p.tension.s = clamp(p.tension.s + (p.tension.relieved ? p.tension.regrow || 0 : p.tension.grow) * ppv * m, 0, 1);
    }
    if (p.tamp && !p.tamp.definitive) p.tamp.s = clamp(p.tamp.s + (p.tamp.tapped ? p.tamp.regrow : p.tamp.grow) * m, 0, 1);
    if (p.airway && !this.secured()) p.airway.sev = clamp(p.airway.sev + p.airway.grow * m, 0, 1);
    if (p.resp) p.resp.def = Math.min(p.resp.max || 22, p.resp.def + p.resp.grow * m);
    if (p.tbi) {
      var tb = p.tbi;
      if (tb.evacuated) tb.icp = Math.max(0.2, tb.icp - 0.06 * m);
      else if (this.phase === 'alive') {
        var mult = (this.v.spo2 < 90 ? 2.5 : 1) * (this.v.sbp < (tb.sbpMin || 100) ? 2.2 : 1) * (p.anticoag && !this.flags.reversed ? 1.8 : 1);
        tb.icp = clamp(tb.icp + tb.grow * mult * m, 0, 1);
      }
      if (this.phase === 'alive' && !this.flags.gcs8 && this.gcs().total <= 8 && !this.secured()) {
        this.flags.gcs8 = this.t;
        if (!p.airway) p.airway = { type: 'gcs', sev: 0.3, grow: 0.02 };
      }
    }
    if (p.preg) {
      var distress = this.v.sbp < 95 || this.v.spo2 < 94 || (p.preg.ga >= 20 && !st.lud);
      this.flags.fetalBad = (this.flags.fetalBad || 0) + (distress ? dt : -dt * 0.5);
      this.flags.fetalBad = clamp(this.flags.fetalBad, 0, 900);
    }
    // --- suhu
    var tk = this.peds ? 1.8 : 1;
    if (p.burn) tk *= 2;
    if (p.neuro) tk *= 1.4;
    if (st.warmed) this.temp = Math.min(37.0, this.temp + 0.03 * m);
    else if (st.exposed) this.temp -= 0.045 * tk * m;
    else this.temp -= 0.008 * tk * m;
    // --- fisiologi
    this.compute();
    this.smooth(dt);
    this.checkArrest(dt);
    // --- timer
    if (this.timers.length) {
      var due = [], keep = [], self = this;
      this.timers.forEach(function (tm) { (tm.at <= self.t ? due : keep).push(tm); });
      this.timers = keep;
      due.sort(function (x, y) { return x.at - y.at; }).forEach(function (tm) { if (!self.ended) tm.fn(self); });
    }
    if (this.scen.onTick && !this.ended) this.scen.onTick(this, dt);
    // --- catat minimum
    if (this.phase === 'alive') {
      this.min.sbp = Math.min(this.min.sbp, this.v.sbp);
      this.min.spo2 = Math.min(this.min.spo2, this.v.spo2);
    }
    this.min.temp = Math.min(this.min.temp, this.temp);
    this.min.maxFrac = Math.max(this.min.maxFrac, this.frac);
    if (!this.ended && this.t >= (this.scen.timeLimit || 1800)) this.end('time');
  };

  /* ---------------- henti jantung traumatik ---------------- */
  P.checkArrest = function (dt) {
    var a = this.arr, tg = this.tg;
    if (this.phase === 'alive') {
      var hern = this.p.tbi && this.p.tbi.icp >= 1;
      if (this.v.spo2 < 58) a.lowSince = a.lowSince === null ? this.t : a.lowSince; else a.lowSince = null;
      var cause = this.v.sbp < 42 ? (this.tensionSev() > 0.6 ? 'tension' : this.p.tamp && this.p.tamp.s > 0.7 ? 'tamponade' : 'hipovolemia')
        : (a.lowSince !== null && this.t - a.lowSince > 40) ? 'hipoksia' : hern ? 'herniasi' : '';
      if (cause) this.startArrest(cause);
    } else if (this.phase === 'arrest') {
      a.total += dt;
      var hern2 = this.p.tbi && this.p.tbi.icp >= 1;
      if (!hern2 && tg.sbp >= 62 && tg.spo2 >= 75) {
        a.okSince = a.okSince === null ? this.t : a.okSince;
        if (this.t - a.okSince >= 20) this.rosc();
      } else a.okSince = null;
      var lim = hern2 ? 150 : 480;
      if (this.phase === 'arrest' && this.t - a.start > lim) this.die();
    }
  };
  P.startArrest = function (cause) {
    var a = this.arr;
    this.phase = 'arrest'; a.start = this.t; a.episodes++; a.okSince = null; a.cause = cause;
    if (cause === 'hipoksia' || cause === 'herniasi') this.flags.apnea = true;
    this.emit('rhythm', cause === 'herniasi' ? 'idioventricular' : 'pea_narrow', cause === 'herniasi' ? 34 : r0(Math.max(60, this.v.hr)));
    this.alert('HENTI JANTUNG TRAUMATIK — nadi sentral tidak teraba (PEA)' + (this.level === 'pemula' ? '. Penyebab dominan: ' + cause : '') + '.');
    if (this.scen.onArrest) this.scen.onArrest(this);
    this.emit('phase', 'arrest');
  };
  P.rosc = function () {
    this.phase = 'alive'; this.arr.roscAt = this.t; this.arr.lowSince = null;
    this.flags.apnea = false;
    this.v.sbp = this.tg.sbp * 0.85; this.v.dbp = this.tg.dbp * 0.85; this.v.hr = this.tg.hr; this.v.spo2 = Math.max(70, this.tg.spo2 - 10);
    if (this.st.cpr) { this.st.cpr = false; this.emit('cpr', false); }
    this.emit('rhythm', 'sinus', r0(this.tg.hr));
    this.addLog('ROSC — nadi karotis kembali teraba setelah penyebab reversibel diatasi.', 'rosc');
    this.emit('phase', 'alive');
  };
  P.die = function () {
    this.phase = 'dead';
    this.emit('rhythm', 'asystole', 0);
    this.alert('Pasien dinyatakan meninggal — henti jantung tidak teratasi.');
    var self = this;
    this.after(4, function () { self.end('death'); });
  };

  /* ---------------- infus ---------------- */
  P.infuse = function (kind, ml, rate) {
    this.inf.push({ kind: kind, ml: ml, rate: rate });
    if (kind === 'cryst') this.fl.crystOrd += ml;
    else if (this.fl.firstBlood === null) this.fl.firstBlood = this.t;
  };
  P.needAccess = function (label) {
    if (this.access()) return true;
    this.act('Upaya memberi ' + label + ' — gagal: belum ada akses vaskular.');
    this.err('noaccess', 'Belum ada akses IV/IO — obat & cairan tidak bisa masuk.', 3, 'Pasang 2 jalur IV besar (≥18G) atau IO bila IV sulit, sekaligus ambil sampel darah & crossmatch.');
    return false;
  };

  /* ---------------- tindakan ---------------- */
  P.doAction = function (id, arg) {
    if (this.ended) return;
    var a = T.ACTIONS_BY_ID[id];
    if (!a) return;
    (this.acts[id] = this.acts[id] || []).push(this.t);
    a.run(this, arg);
    if (this.scen.onAction && !this.ended) this.scen.onAction(this, id, arg);
    var c = typeof a.cost === 'function' ? a.cost(this, arg) : a.cost;
    if (c && !this.ended) this.advance(c);
    this.emit('update');
  };

  /* ---------------- tanda vital tampilan ---------------- */
  P.vitals = function () {
    var st = this.st;
    if (!st.monitor) return { off: true };
    var t1 = Math.round(this.temp * 10) / 10;
    if (this.phase === 'alive') {
      var sb = r0(this.v.sbp), lowPerf = sb < 55;
      var et = st.capno ? r0(38 * clamp(this.v.sbp / 110, 0.35, 1.05) - (st.ventHyper ? 7 : 0)) : null;
      return { hr: r0(this.v.hr), spo2: lowPerf ? null : r0(this.v.spo2), sbp: sb, dbp: r0(this.v.dbp), map: this.map(), rr: r0(this.v.rr), temp: t1, etco2: et };
    }
    if (this.phase === 'arrest') {
      return { hr: st.cpr ? null : r0(Math.max(30, this.v.hr * 0.8)), spo2: null, sbp: null, dbp: null, map: null, rr: this.secured() ? 14 : 0, temp: t1, etco2: st.capno ? (st.cpr ? 13 : 5) : null, arrest: true };
    }
    return { hr: 0, spo2: null, sbp: null, dbp: null, map: null, rr: 0, temp: t1, etco2: st.capno ? 0 : null, arrest: true };
  };

  P.labs = function () {
    var fr = Math.max(0, this.frac), f = this.fl, p = this.p;
    var bd = lerp(BD, fr), hb0 = this.scen.init.hb || 14;
    var hb = hb0 - (f.cryst / 1000) * 1.3 - fr * 3 + f.prbc * 0.45 - (this.loss > 1500 ? 0.8 : 0);
    var lac = 1.1 + fr * 14 + (this.phase !== 'alive' ? 4 : 0);
    var ph = 7.40 + bd * 0.012;
    var out = 'pH ' + ph.toFixed(2) + ' · BD ' + bd.toFixed(1) + ' · laktat ' + lac.toFixed(1) + ' mmol/L · Hb ' + Math.max(4, hb).toFixed(1) + ' g/dL';
    var inr = p.anticoag ? (this.flags.reversed ? 1.4 : 3.4) : (this.coag() > 1.35 ? 1.6 : 1.1);
    out += ' · INR ' + inr.toFixed(1);
    if (f.prbc >= 4) out += ' · Ca²⁺ ion ' + (this.flags.calcium ? '1,12' : '0,88 (rendah)') + ' mmol/L';
    if (p.burn) out += ' · COHb ' + (this.st.o2 || this.secured() ? Math.max(8, p.burn.co - r0(this.t / 60)) : p.burn.co) + '% (tinggi)';
    out += '. Golongan darah & crossmatch dikirim.';
    if (this.pt.sex === 'P' && this.pt.age >= 12 && this.pt.age <= 50) out += p.preg ? ' β-hCG (+).' + (p.preg.rhNeg ? ' Rhesus NEGATIF.' : '') : ' β-hCG (−).';
    return out;
  };

  /* ---------------- akhir ---------------- */
  P.end = function (reason) {
    if (this.ended) return;
    this.ended = true; this.endReason = reason; this.st.cpr = false;
    var res = T.Score.compute(this);
    this.emit('end', res);
  };

  /* ==================================================================
     SKOR & METRIK
     ================================================================== */
  var Score = {};
  Score.metrics = function (S) {
    var L = S.letters(), out = [];
    var psEnd = S.psDone() ? Math.max(L.x, L.a, L.b, L.c, L.d, L.e) : null;
    out.push({ label: 'Primary survey X→E lengkap', value: psEnd !== null ? fmt(psEnd) : 'tidak lengkap', target: '≤10 menit', ok: psEnd !== null && psEnd <= 600 });
    var labels = { ext: 'Kontrol perdarahan eksternal', airway: 'Jalan napas aman', tension: 'Dekompresi tension', open: 'Balut oklusif luka terbuka', htx: 'Chest tube hemotoraks', tamp: 'Dekompresi tamponade', pelvis: 'Pelvic binder', lud: 'Pergeseran uterus ke kiri', icp: 'Terapi hiperosmolar', reverse: 'Reversal antikoagulan', pressor: 'Vasopresor (syok neurogenik)' };
    for (var k in labels) {
      var need = k === 'ext' ? S.p.ext : k === 'airway' ? S.scen.problems.airway : k === 'tension' ? S.scen.problems.tension : k === 'open' ? S.p.open : k === 'htx' ? S.p.htx : k === 'tamp' ? S.p.tamp : k === 'pelvis' ? S.p.pelvis : k === 'lud' ? S.p.preg : k === 'icp' ? (S.p.tbi && S.p.tbi.icp0 >= 0.5) : k === 'reverse' ? S.p.anticoag : k === 'pressor' ? S.p.neuro : null;
      if (need) out.push({ label: labels[k], value: S.fix[k] !== undefined ? fmt(S.fix[k]) : 'tidak dilakukan', target: '', ok: S.fix[k] !== undefined });
    }
    var lim = S.peds ? 20 * S.pt.weight : 1000;
    out.push({ label: 'Kristaloid total', value: r0(S.fl.crystOrd) + ' mL', target: '≤' + r0(lim) + ' mL', ok: S.fl.crystOrd <= lim });
    out.push({ label: 'Produk darah (PRC / FFP / TC)', value: S.fl.prbc + ' / ' + S.fl.ffp + ' / ' + S.fl.plt + (S.peds ? ' (mL/kg dosis)' : ' unit'), target: '' });
    if (S.fl.firstBlood !== null) out.push({ label: 'Darah pertama', value: fmt(S.fl.firstBlood), target: '' });
    if (S.flags.txaAt !== undefined) out.push({ label: 'Asam traneksamat (sejak cedera)', value: fmt(S.flags.txaInjury), target: '≤3 jam', ok: S.flags.txaInjury <= 10800 });
    out.push({ label: 'Estimasi kehilangan darah total', value: r0(S.loss) + ' mL (' + r0(S.loss / S.pt.ebv * 100) + '% EBV)', target: '' });
    out.push({ label: 'Kelas syok terberat', value: 'Kelas ' + ['I', 'II', 'III', 'IV'][shockClass(S.min.maxFrac) - 1], target: '' });
    out.push({ label: 'TD sistolik terendah', value: r0(S.min.sbp) + ' mmHg', target: '' });
    out.push({ label: 'SpO₂ terendah', value: r0(S.min.spo2) + '%', target: '≥90%', ok: S.min.spo2 >= 90 });
    out.push({ label: 'Suhu terendah', value: S.min.temp.toFixed(1) + ' °C', target: '≥35,5 °C', ok: S.min.temp >= 35.5 });
    if (S.flags.dispo) out.push({ label: 'Keputusan definitif / rujukan', value: fmt(S.flags.dispo.t) + ' — ' + S.flags.dispo.label, target: '' });
    if (S.arr.episodes) out.push({ label: 'Henti jantung traumatik', value: S.arr.episodes + '× (total ' + fmt(S.arr.total) + ')', target: '0', ok: false });
    return out;
  };

  Score.compute = function (S) {
    var crit = T.criteriaFor(S).filter(Boolean);
    var tot = 0, got = 0;
    crit.forEach(function (c) { c.frac = clamp(c.frac || 0, 0, 1); tot += c.w; got += c.w * c.frac; });
    var base = tot ? 100 * got / tot : 0;
    var penPts = Math.min(40, S.pens.reduce(function (s, p) { return s + p.pts; }, 0));
    var score = Math.max(0, r0(base - penPts));
    var critFail = crit.filter(function (c) { return c.critical && c.frac < 1; });
    var grade, gk;
    if (S.phase !== 'alive') { grade = 'Belum lulus — pasien tidak selamat'; gk = 'fail'; }
    else if (critFail.length) { grade = 'Belum lulus — ada tindakan kritis yang terlewat'; gk = 'fail'; }
    else if (score >= 85) { grade = 'Sangat baik'; gk = 'great'; }
    else if (score >= 70) { grade = 'Lulus'; gk = 'pass'; }
    else { grade = 'Perlu latihan lagi'; gk = 'fail'; }
    return {
      score: score, base: r0(base), penPts: penPts, grade: grade, gradeKey: gk, criteria: crit, critFail: critFail,
      pens: S.pens.slice(), metrics: Score.metrics(S), outcome: T.outcomeFor(S), duration: S.t, log: S.log.slice(), endReason: S.endReason
    };
  };

  T.Score = Score;
  T.Sim = Sim;
})();
