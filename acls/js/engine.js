/* ==========================================================================
   ACLS Simulator — mesin simulasi
   Menyimpan status pasien, RJP, defibrilator/pacing, obat, log, dan skor.
   Waktu simulasi (S.t) dalam detik; berjalan real-time × kecepatan.
   ========================================================================== */
(function () {
  'use strict';
  var ACLS = window.ACLS = window.ACLS || {};
  var R = ACLS.RHYTHMS;

  function fmt(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '–';
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  ACLS.fmt = fmt;

  var SHOCKABLE = { vf_coarse: 1, vf_fine: 1, vt: 1, torsades: 1 };
  var NO_R_WAVE = { vf_coarse: 1, vf_fine: 1, torsades: 1, asystole: 1, pause: 1 };
  ACLS.SHOCKABLE = SHOCKABLE;

  function Sim(scen, level, hooks) {
    var ini = scen.init;
    var r0 = R[ini.rhythm];
    this.scen = scen;
    this.level = level;                 // 'pemula' | 'mahir'
    this.hooks = hooks || {};
    this.t = 0; this.speed = 1; this.paused = false; this.ended = false;
    this.pt = {
      rhythm: ini.rhythm, rate: ini.rate || r0.rate || 0, pulse: !!ini.pulse,
      sbp: ini.sbp || 0, dbp: ini.dbp || 0, spo2: ini.spo2 || null, rr: ini.rr || 0,
      etco2: ini.etco2 || 38, consc: ini.consc || '', comatose: false, weight: ini.weight || 70
    };
    this.phase = this.pt.pulse ? 'pre' : 'arrest';   // 'pre' | 'arrest' | 'post'
    this.cpr = { on: false, startT: 0, cycleStart: null, first: null };
    this.arr = {
      active: false, start: null, total: 0, cprOn: 0, pauses: [], pauseStart: null, pauseReason: '',
      delays: [], firstComp: true, armed: true, pending: null, shockDelays: [], nsSince: null,
      epiDelays: [], episodes: 0, roscAt: null, recognized: null, vfPath: false, epShocks: 0
    };
    this.airway = ini.airway || 'none';    // 'none' | 'bvm' | 'adv'
    this.capno = !!ini.capno;
    this.o2 = !!ini.o2;
    this.iv = !!ini.iv;
    this.defib = { pads: !!ini.pads, energy: 200, sync: false, charged: false, chargeDone: null };
    this.pace = { on: false, rate: 70, ma: 0, capture: false };
    this.doses = {}; this.acts = {}; this.shocks = []; this.checks = []; this.ids = [];
    this.log = []; this.pens = []; this.timers = []; this.flags = {}; this.findings = [];
    this.penCount = {};
    if (!this.pt.pulse) this._startArrest();
  }

  var P = Sim.prototype;

  /* ---------------- util ---------------- */
  P.rhythm = function () { return R[this.pt.rhythm]; };
  P.isShockable = function () { return !!SHOCKABLE[this.pt.rhythm] && !this.pt.pulse; };
  P.isOrganized = function () { return this.rhythm().kind === 'beats'; };
  P.map = function () { return Math.round((this.pt.sbp + 2 * this.pt.dbp) / 3); };
  P.did = function (id) { return !!(this.acts[id] && this.acts[id].length); };
  P.didAfter = function (id, t0) {
    var a = this.acts[id] || [];
    for (var i = 0; i < a.length; i++) if (a[i] >= t0) return true;
    return false;
  };
  P.firstAct = function (id) { var a = this.acts[id]; return a && a.length ? a[0] : null; };
  P.dosesOf = function (id) { return this.doses[id] || []; };
  P.lastDose = function (id) { var d = this.doses[id]; return d && d.length ? d[d.length - 1] : null; };
  P.appShocks = function () { return this.shocks.filter(function (s) { return s.ok; }).length; };
  P.after = function (sec, fn) { this.timers.push({ at: this.t + sec, fn: fn }); };
  P.emit = function (name, a, b) { if (this.hooks[name]) this.hooks[name](a, b); };

  /* ---------------- log & penilaian ---------------- */
  P.addLog = function (text, kind, teach) {
    var e = { t: this.t, text: text, kind: kind || 'act', teach: teach || '' };
    this.log.push(e);
    this.emit('log', e);
    return e;
  };
  P.act = function (text) { return this.addLog(text, 'act'); };
  P.obs = function (text) { return this.addLog(text, 'obs'); };
  P.alert = function (text) { return this.addLog(text, 'alert'); };
  P.good = function (text, teach) { return this.addLog(text, 'good', teach); };
  P.tip = function (text, teach) { return this.addLog(text, 'tip', teach); };
  P.penalize = function (kind, code, text, pts, teach) {
    this.penCount[code] = (this.penCount[code] || 0) + 1;
    var p = this.penCount[code] <= 2 ? (pts || 0) : 0;  // kesalahan yang sama dihitung maks. 2x
    this.pens.push({ t: this.t, code: code, text: text, pts: p, teach: teach || '', kind: kind });
    this.addLog(text, kind, teach);
  };
  P.err = function (code, text, pts, teach) { this.penalize('err', code, text, pts, teach); };
  P.warn = function (code, text, pts, teach) { this.penalize('warn', code, text, pts, teach); };
  P.addFinding = function (title, text) {
    this.findings.unshift({ t: this.t, title: title, text: text });
    this.emit('finding');
  };

  /* ---------------- status henti jantung ---------------- */
  P._startArrest = function () {
    var a = this.arr;
    a.active = true; a.start = this.t; a.episodes++;
    a.pauseStart = this.cpr.on ? null : this.t;
    a.firstComp = !this.cpr.on;
    if (this.cpr.on) a.delays.push(0);
    a.armed = true; a.pending = null; a.nsSince = null; a.epShocks = 0;
    this.phase = 'arrest';
    this.pt.consc = 'Tidak responsif, tidak bernapas normal (gasping)';
  };

  P._endArrest = function () {
    var a = this.arr;
    a.active = false; a.roscAt = this.t;
  };

  P.setRhythm = function (id, rate) {
    var prevShockable = !!SHOCKABLE[this.pt.rhythm];
    this.pt.rhythm = id;
    this.pt.rate = rate || (R[id] && R[id].rate) || 0;
    if (!prevShockable && SHOCKABLE[id]) this.arr.armed = true;
    this.emit('rhythm', id, this.pt.rate);
  };

  P.setPulse = function (on) {
    if (on === this.pt.pulse) return;
    this.pt.pulse = on;
    if (!on) {
      this._startArrest();
      this.alert('Pasien mendadak tidak responsif — nadi karotis tidak teraba!');
      this.emit('phase', 'arrest');
    } else {
      this._endArrest();
    }
  };

  // ROSC sesungguhnya (pengguna baru tahu setelah cek nadi)
  P.rosc = function (o) {
    o = o || {};
    this.setRhythm(o.rhythm || 'sinus_tach', o.rate);
    this.setPulse(true);
    this.pt.sbp = o.sbp || 96; this.pt.dbp = o.dbp || 60; this.pt.spo2 = o.spo2 || 92;
    this.pt.etco2 = o.etco2 || 40;
    this.pt.comatose = o.comatose !== false;
    this.pt.consc = o.consc || 'Tidak sadar (GCS E1M2V1), napas spontan belum adekuat';
    this.flags.postHypo = this.map() < 65;
    this.flags.postStemi = !!o.stemi;
    if (this.capno && this.cpr.on) this.obs('Kapnografi: EtCO₂ naik mendadak menjadi ~' + this.pt.etco2 + ' mmHg.');
  };

  P.recognizeRosc = function () {
    this.phase = 'post';
    this.arr.recognized = this.t;
    this.arr.pauseStart = null;
    this.addLog('ROSC tercapai! Nadi teraba — mulai perawatan pasca-henti jantung.', 'rosc');
    if (this.scen.onRosc) this.scen.onRosc(this);
    this.emit('phase', 'post');
  };

  /* ---------------- waktu ---------------- */
  P.tick = function (dtReal) {
    if (this.paused || this.ended) return;
    var dt = dtReal * this.speed;
    while (dt > 0 && !this.ended) {
      var d = Math.min(dt, 0.25);
      this.step(d);
      dt -= d;
    }
  };

  P.step = function (dt) {
    var a = this.arr;
    this.t += dt;
    // Akuntansi henti jantung berlangsung sampai ROSC DIKENALI (sudut pandang tim)
    if (this.phase === 'arrest') {
      a.total += dt;
      if (this.cpr.on) a.cprOn += dt;
    }
    if (a.active) {
      // ritme shockable terlihat (kompresi berhenti) → mulai hitung waktu ke shock
      if (a.armed && this.isShockable() && !this.cpr.on) { a.pending = this.t; a.armed = false; a.vfPath = true; }
      if (a.nsSince === null && !this.isShockable() && !this.cpr.on) a.nsSince = this.t;
    }
    if (this.defib.chargeDone !== null && this.t >= this.defib.chargeDone) {
      this.defib.chargeDone = null; this.defib.charged = true;
      this.obs('Defibrilator terisi ' + this.defib.energy + ' J' + (this.defib.sync ? ' (SYNC)' : '') + ' — siap shock.');
      this.emit('update');
    }
    // pacing transkutan
    var cap = this.pace.on && this.defib.pads && this.pace.ma >= (this.scen.paceThreshold || 70) &&
              this.pt.pulse && this.isOrganized();
    if (cap !== this.pace.capture) {
      this.pace.capture = cap;
      if (cap) this.obs('Monitor: electrical capture pada ' + this.pace.ma + ' mA (setiap spike diikuti QRS lebar).');
      if (this.scen.onCapture) this.scen.onCapture(this, cap);
      this.emit('pacing');
    }
    // timer terjadwal
    if (this.timers.length) {
      var due = [], keep = [], self = this;
      this.timers.forEach(function (tm) { (tm.at <= self.t ? due : keep).push(tm); });
      this.timers = keep;
      due.sort(function (x, y) { return x.at - y.at; }).forEach(function (tm) { if (!self.ended) tm.fn(self); });
    }
    if (this.scen.onTick) this.scen.onTick(this, dt);
    if (!this.ended && this.t >= (this.scen.timeLimit || 1500)) this.end('time');
  };

  // Lompat waktu (fast-forward) — fisiologi & timer tetap diproses
  P.advance = function (sec) {
    var left = sec;
    while (left > 0 && !this.ended) { var d = Math.min(0.5, left); this.step(d); left -= d; }
    this.emit('jump');
  };

  /* ---------------- tindakan ---------------- */
  P.doAction = function (id, arg) {
    if (this.ended) return;
    var a = ACLS.ACTIONS_BY_ID[id];
    if (!a) return;
    (this.acts[id] = this.acts[id] || []).push(this.t);
    a.run(this, arg);
    if (this.scen.onAction && !this.ended) this.scen.onAction(this, id, arg);
    if (a.cost && !this.ended) this.advance(typeof a.cost === 'function' ? a.cost(this) : a.cost);
    this.emit('update');
  };

  // Memberi obat: cek akses IV/IO
  P.give = function (id, label) {
    if (!this.iv) {
      this.act('Upaya memberi ' + label + ' — gagal: belum ada akses IV/IO.');
      this.err('noaccess', 'Obat tidak bisa masuk: pasang akses IV/IO terlebih dahulu.', 3,
        'Pasang akses IV (atau IO bila IV sulit) sedini mungkin tanpa menghentikan kompresi.');
      return false;
    }
    (this.doses[id] = this.doses[id] || []).push(this.t);
    return true;
  };

  /* ---------------- RJP ---------------- */
  P.startCPR = function () {
    if (this.cpr.on) return;
    if (this.phase !== 'arrest' && this.pt.pulse) {
      this.act('Upaya memulai kompresi dada pada pasien yang memiliki nadi.');
      this.err('cpr_pulse', 'Kompresi dada pada pasien dengan nadi tidak diindikasikan.', 8,
        'RJP hanya untuk pasien tanpa nadi. Pastikan status nadi (≤10 detik) sebelum memulai kompresi.');
      return;
    }
    var a = this.arr;
    this.cpr.on = true; this.cpr.startT = this.t; this.cpr.cycleStart = this.t;
    if (this.cpr.first === null) this.cpr.first = this.t;
    if (this.phase === 'arrest' && a.pauseStart !== null) {
      var dur = this.t - a.pauseStart;
      if (a.firstComp) { a.delays.push(dur); a.firstComp = false; }
      else a.pauses.push({ start: a.pauseStart, dur: dur, reason: a.pauseReason });
      a.pauseStart = null;
    }
    this.act('Kompresi dada dimulai/dilanjutkan (100–120×/menit, kedalaman 5–6 cm).');
    this.emit('cpr', true);
  };

  P.stopCPR = function (reason) {
    if (!this.cpr.on) return;
    this.cpr.on = false;
    if (this.phase === 'arrest') { this.arr.pauseStart = this.t; this.arr.pauseReason = reason || 'jeda'; }
    this.act('Kompresi dihentikan — ' + (reason || 'jeda') + '.');
    this.emit('cpr', false);
  };

  P.rhythmCheck = function () {
    var wasOn = this.cpr.on;
    if (wasOn) this.stopCPR('analisis ritme');
    var cyc = this.cpr.cycleStart !== null && wasOn ? this.t - this.cpr.cycleStart : null;
    var prevArrestChecks = this.checks.filter(function (c) { return c.phase === 'arrest'; }).length;
    this.checks.push({ t: this.t, rhythm: this.pt.rhythm, cyc: prevArrestChecks === 0 ? null : cyc, phase: this.phase, pulse: this.pt.pulse });
    this.cpr.cycleStart = null;
    var r = this.rhythm();
    var txt = 'Analisis ritme dilakukan';
    if (this.level === 'pemula') {
      txt += ': ' + r.label;
      if (this.phase === 'arrest' && r.kind === 'beats' && !SHOCKABLE[this.pt.rhythm]) txt += ' → ritme terorganisir, cek nadi';
      if (this.phase === 'arrest' && this.isShockable()) txt += ' → SHOCKABLE';
    }
    this.act(txt + '.');
    if (this.phase === 'arrest' && cyc !== null && cyc < 90 && prevArrestChecks > 0) {
      this.warn('early_check', 'Analisis ritme setelah hanya ' + Math.round(cyc) + ' detik RJP — interupsi terlalu sering.', 2,
        'Lakukan RJP 2 menit penuh di antara analisis ritme agar perfusi koroner terjaga.');
    }
    this.emit('reveal');
    if (this.scen.onCheck) this.scen.onCheck(this);
  };

  P.pulseCheck = function () {
    if (this.cpr.on) this.stopCPR('cek nadi');
    var r = this.rhythm();
    var hr = this.pace.on && this.pace.capture ? this.pace.rate : this.pt.rate;
    if (this.pt.pulse) {
      this.act('Cek nadi: nadi karotis teraba, ±' + hr + '×/menit.');
      if (this.pace.on && this.pace.capture && !this.flags.mechCapture) {
        this.flags.mechCapture = true;
        this.obs('Nadi femoral teraba sesuai laju pacu → mechanical capture terkonfirmasi.');
      }
      if (this.phase === 'arrest') this.recognizeRosc();
    } else {
      var pea = this.phase === 'arrest' && r.kind === 'beats';
      this.act('Cek nadi: nadi karotis TIDAK teraba' + (pea && this.level === 'pemula' ? ' → PEA' : '') + '.');
      if (this.phase === 'arrest' && r.kind !== 'beats') {
        this.tip('Pada VF/asistol, cek nadi tidak diperlukan.', 'Ritme non-perfusi tidak menghasilkan nadi — langsung shock (VF/pVT) atau lanjutkan RJP (asistol) untuk meminimalkan jeda.');
      }
    }
    if (this.scen.onPulse) this.scen.onPulse(this);
  };

  /* ---------------- defibrilator ---------------- */
  P.attachPads = function () {
    if (this.defib.pads) return;
    this.defib.pads = true;
    this.act('Pads defibrilator dipasang (anterolateral)' + (this.cpr.on ? ' tanpa menghentikan kompresi' : '') + '.');
    this.emit('update');
  };

  P.setEnergy = function (j) {
    this.defib.energy = j;
    if (this.defib.charged || this.defib.chargeDone !== null) {
      this.defib.charged = false; this.defib.chargeDone = null;
      this.obs('Energi diubah ke ' + j + ' J — muatan sebelumnya dibuang, charge ulang.');
    }
    this.emit('update');
  };

  P.toggleSync = function () {
    this.defib.sync = !this.defib.sync;
    this.act('Mode SYNC ' + (this.defib.sync ? 'AKTIF (penanda di atas tiap gelombang R)' : 'NONAKTIF') + '.');
    this.emit('update');
  };

  P.charge = function () {
    if (!this.defib.pads) {
      this.act('Upaya charge — pads belum terpasang.');
      this.tip('Pasang pads dahulu.', 'Pasang pads segera setelah defibrilator tiba, tanpa menghentikan RJP.');
      return;
    }
    if (this.defib.charged || this.defib.chargeDone !== null) return;
    this.defib.chargeDone = this.t + 3;
    this.act('Charging ' + this.defib.energy + ' J' + (this.defib.sync ? ' (SYNC)' : '') + '…');
    if (this.cpr.on && this.phase === 'arrest') this.good('Charge saat kompresi masih berjalan — jeda pra-shock minimal.');
    this.emit('update');
  };

  P.dump = function () {
    if (!this.defib.charged && this.defib.chargeDone === null) return;
    this.defib.charged = false; this.defib.chargeDone = null;
    this.act('Muatan defibrilator dibuang (disarm).');
    this.emit('update');
  };

  P.shock = function () {
    var d = this.defib;
    if (!d.charged) { this.act('Tombol shock ditekan — defibrilator belum terisi.'); return; }
    if (d.sync && NO_R_WAVE[this.pt.rhythm]) {
      this.act('Tombol shock ditekan dalam mode SYNC — shock TIDAK keluar (tidak ada gelombang R yang terdeteksi).');
      this.err('sync_noR', 'Mode SYNC pada VF/VT polimorfik membuat shock tertunda/tidak keluar.', 4,
        'Pada VF dan VT polimorfik (torsades) tanpa nadi, matikan SYNC dan lakukan defibrilasi (unsynchronized).');
      return;
    }
    if (this.cpr.on) this.stopCPR('“Clear!” — semua menjauh untuk shock');
    d.charged = false;
    var s = { t: this.t, energy: d.energy, sync: d.sync, rhythm: this.pt.rhythm, pulse: this.pt.pulse, phase: this.phase, ok: false };
    this.shocks.push(s);
    var n = this.shocks.length;
    this.emit('shock');
    if (!this.pt.pulse) {
      this.act('Shock #' + n + ' diberikan: ' + d.energy + ' J' + (d.sync ? ' (SYNC)' : '') + '.');
      if (SHOCKABLE[this.pt.rhythm]) {
        s.ok = true; this.arr.epShocks++;
        if (this.arr.pending !== null) { this.arr.shockDelays.push(this.t - this.arr.pending); this.arr.pending = null; }
        if (d.energy < 120) this.warn('lowJ', 'Energi defibrilasi rendah (' + d.energy + ' J).', 2,
          'Defibrilator bifasik: gunakan energi sesuai rekomendasi pabrik (umumnya 120–200 J); bila tidak tahu, gunakan energi maksimal.');
        if (d.sync) this.warn('sync_pvt', 'Defibrilasi pVT dengan mode SYNC dapat menunda shock.', 1,
          'VT tanpa nadi diterapi sebagai VF: defibrilasi unsynchronized.');
        this.tip('Segera lanjutkan kompresi tanpa cek nadi/ritme.', 'Setelah shock, langsung RJP 2 menit — jangan menunggu melihat ritme.');
      } else {
        this.err('shock_ns', 'Shock pada ritme non-shockable (' + this.rhythm().label + ').', 10,
          'Asistol dan PEA tidak di-shock. Lanjutkan RJP, beri epinefrin sesegera mungkin, dan cari penyebab reversibel (H & T).');
      }
    } else {
      if (d.sync) {
        s.cv = true;
        this.act('Kardioversi tersinkronisasi ' + d.energy + ' J diberikan.');
        if (!this.flags.sedated && !this.flags.sedWarned) {
          this.flags.sedWarned = true;
          this.warn('nosedation', 'Kardioversi tanpa sedasi/analgesia.', 2,
            'Bila kondisi memungkinkan, berikan sedasi prosedural sebelum kardioversi — namun jangan menunda bila pasien sangat tidak stabil.');
        }
        var idg = this.rhythm().idg;
        if (idg === 'sinus' || idg === 'sinus_brady' || idg === 'avb3' || idg === 'wide_slow') {
          this.err('cv_wrong', 'Kardioversi pada ritme yang tidak memerlukan kardioversi.', 8,
            'Kardioversi tersinkronisasi hanya untuk takiaritmia (SVT, AF/flutter, VT monomorfik) dengan nadi yang tidak stabil.');
        }
      } else {
        s.unsync = true;
        this.act('Shock TIDAK tersinkronisasi ' + d.energy + ' J diberikan pada pasien yang memiliki nadi.');
        this.err('unsync', 'Shock unsynchronized pada pasien dengan nadi → risiko R-on-T memicu VF.', 10,
          'Untuk takikardia dengan nadi yang tidak stabil, aktifkan SYNC lalu lakukan kardioversi tersinkronisasi.');
      }
    }
    var handled = this.scen.onShock ? this.scen.onShock(this, s) : false;
    if (!handled && s.unsync) {
      this.setRhythm('vf_coarse');
      this.setPulse(false);
    }
    this.emit('update');
  };

  /* ---------------- pacing ---------------- */
  P.togglePace = function () {
    if (!this.defib.pads) {
      this.act('Upaya pacing — pads belum terpasang.');
      this.tip('Pasang pads dahulu.', 'Pacing transkutan memakai pads defibrilator.');
      return;
    }
    this.pace.on = !this.pace.on;
    this.act('Pacing transkutan ' + (this.pace.on ? 'DIMULAI (' + this.pace.rate + ' ppm, ' + this.pace.ma + ' mA)' : 'dihentikan') + '.');
    if (this.pace.on && this.phase === 'arrest') {
      this.err('pace_arrest', 'Pacing transkutan pada henti jantung tidak direkomendasikan.', 5,
        'Pacing tidak terbukti bermanfaat pada asistol/PEA. Fokus pada RJP berkualitas, epinefrin, dan H & T.');
    }
    if (this.pace.on) (this.acts.pace_on = this.acts.pace_on || []).push(this.t);
    this.emit('pacing');
    this.emit('update');
  };
  P.paceRate = function (d) { this.pace.rate = Math.max(30, Math.min(150, this.pace.rate + d)); this.emit('pacing'); this.emit('update'); };
  P.paceMa = function (d) { this.pace.ma = Math.max(0, Math.min(200, this.pace.ma + d)); this.emit('pacing'); this.emit('update'); };

  /* ---------------- H & T ---------------- */
  P.hst = function (list) {
    this.act('Penelusuran H & T: dicurigai ' + (list.length ? list.join(', ') : '(tidak ada yang dipilih)') + '.');
    var c = this.scen.causeLabel ? [].concat(this.scen.causeLabel) : null;
    if (c) {
      var hit = c.filter(function (x) { return list.indexOf(x) >= 0; });
      if (hit.length) { this.flags.causeSuspected = true; this.good('Penyebab yang tepat ikut dicurigai: ' + hit.join(', ') + '.'); }
      else this.tip('Penyebab utama kasus ini belum masuk daftar Anda.', 'Gunakan anamnesis, pemeriksaan fisik, lab POC, dan POCUS untuk mempersempit H & T.');
    }
    this.emit('update');
  };

  /* ---------------- tanda vital tampilan ---------------- */
  P.vitals = function () {
    var r = this.rhythm(), pt = this.pt, pulse = pt.pulse;
    var hr = null;
    if (!this.cpr.on) {
      if (this.pace.on && this.pace.capture) hr = this.pace.rate;
      else if (r.kind === 'beats') hr = pt.rate;
    }
    var et = null;
    if (this.capno) {
      if (pulse) et = this.cpr.on ? Math.max(pt.etco2, 40) : pt.etco2;
      else et = this.cpr.on ? (this.airway === 'adv' ? 18 : 15) : 4;
    }
    return {
      hr: hr,
      spo2: pulse && !this.cpr.on ? pt.spo2 : null,
      sbp: pulse ? pt.sbp : null, dbp: pulse ? pt.dbp : null, map: pulse ? this.map() : null,
      etco2: et
    };
  };

  /* ---------------- akhir & skor ---------------- */
  P.end = function (reason) {
    if (this.ended) return;
    if (this.phase === 'arrest' && this.arr.pauseStart !== null && !this.arr.firstComp) {
      this.arr.pauses.push({ start: this.arr.pauseStart, dur: this.t - this.arr.pauseStart, reason: 'akhir skenario' });
    }
    this.ended = true;
    this.endReason = reason;
    this.cpr.on = false;
    var res = ACLS.Score.compute(this);
    this.emit('end', res);
  };

  /* ==================================================================
     SKOR & METRIK
     ================================================================== */
  var Score = {};

  Score.arrestMetrics = function (S) {
    var a = S.arr, out = [];
    if (!a.episodes) return out;
    var ccf = a.total > 0 ? a.cprOn / a.total : 0;
    var longest = a.pauses.reduce(function (m, p) { return Math.max(m, p.dur); }, 0);
    var over10 = a.pauses.filter(function (p) { return p.dur > 10; }).length;
    var epi = S.dosesOf('epi1');
    var ints = [];
    for (var i = 1; i < epi.length; i++) ints.push(epi[i] - epi[i - 1]);
    var cyc = S.checks.filter(function (c) { return c.phase === 'arrest' && c.cyc !== null; }).map(function (c) { return c.cyc; });
    out.push({ label: 'Durasi henti jantung', value: fmt(a.total), target: '' });
    out.push({ label: 'Waktu sampai kompresi pertama', value: a.delays.length ? Math.round(a.delays[0]) + ' dtk' : 'tidak dilakukan', target: '≤10 dtk', ok: a.delays.length && a.delays[0] <= 10 });
    out.push({ label: 'Chest compression fraction (CCF)', value: Math.round(ccf * 100) + '%', target: '≥80%', ok: ccf >= 0.8 });
    out.push({ label: 'Jeda kompresi terlama', value: Math.round(longest) + ' dtk', target: '<10 dtk', ok: longest < 10 });
    out.push({ label: 'Jumlah jeda >10 detik', value: String(over10), target: '0', ok: over10 === 0 });
    if (a.vfPath) out.push({ label: 'Waktu ke shock pertama (sejak VF/pVT terlihat)', value: a.shockDelays.length ? Math.round(a.shockDelays[0]) + ' dtk' : 'tidak ada', target: '≤120 dtk', ok: a.shockDelays.length && a.shockDelays[0] <= 120 });
    out.push({ label: 'Shock tepat / total shock', value: S.appShocks() + ' / ' + S.shocks.filter(function (s) { return !s.pulse; }).length, target: '' });
    out.push({ label: 'Dosis epinefrin', value: epi.length + (ints.length ? ' (interval ' + ints.map(function (x) { return fmt(x); }).join(', ') + ')' : ''), target: 'tiap 3–5 mnt', ok: ints.every(function (x) { return x >= 170 && x <= 330; }) });
    out.push({ label: 'Durasi siklus RJP rata-rata', value: cyc.length ? fmt(cyc.reduce(function (s, x) { return s + x; }, 0) / cyc.length) : '–', target: '±2:00' });
    return out;
  };

  Score.compute = function (S) {
    var crit = (S.scen.criteria ? S.scen.criteria(S) : []).filter(Boolean);
    if (S.level === 'mahir' && S.ids.length) {
      var ok = S.ids.filter(function (x) { return x.ok; }).length;
      crit.push({ label: 'Identifikasi ritme pada analisis (' + ok + '/' + S.ids.length + ' benar)', w: 8, frac: ok / S.ids.length,
        why: 'Interpretasi ritme yang tepat menentukan cabang algoritma (shockable vs non-shockable).' });
    }
    var tot = 0, got = 0;
    crit.forEach(function (c) { c.frac = Math.max(0, Math.min(1, c.frac || 0)); tot += c.w; got += c.w * c.frac; });
    var base = tot ? 100 * got / tot : 0;
    var penPts = Math.min(40, S.pens.reduce(function (s, p) { return s + p.pts; }, 0));
    var score = Math.max(0, Math.round(base - penPts));
    var critFail = crit.filter(function (c) { return c.critical && c.frac < 1; });
    var grade, gradeKey;
    if (critFail.length) { grade = 'Belum lulus — ada tindakan kritis yang terlewat'; gradeKey = 'fail'; }
    else if (score >= 85) { grade = 'Sangat baik'; gradeKey = 'great'; }
    else if (score >= 70) { grade = 'Lulus'; gradeKey = 'pass'; }
    else { grade = 'Perlu latihan lagi'; gradeKey = 'fail'; }
    var outcome = S.scen.outcome ? S.scen.outcome(S) : Score.defaultOutcome(S);
    return {
      score: score, base: Math.round(base), penPts: penPts, grade: grade, gradeKey: gradeKey,
      criteria: crit, critFail: critFail, pens: S.pens.slice(), metrics: Score.arrestMetrics(S),
      outcome: outcome, duration: S.t, log: S.log.slice(), endReason: S.endReason
    };
  };

  Score.defaultOutcome = function (S) {
    if (S.arr.episodes) {
      if (S.phase === 'post') return { ok: true, text: 'ROSC tercapai pada menit ' + fmt(S.arr.recognized) + ' dan pasien diserahterimakan.' };
      if (S.pt.pulse && S.arr.roscAt !== null) return { ok: false, text: 'ROSC sebenarnya sudah terjadi (menit ' + fmt(S.arr.roscAt) + ') tetapi belum dikenali melalui cek nadi.' };
      return { ok: false, text: 'Skenario berakhir tanpa ROSC.' };
    }
    return { ok: true, text: 'Skenario selesai.' };
  };

  ACLS.Score = Score;
  ACLS.Sim = Sim;
})();
