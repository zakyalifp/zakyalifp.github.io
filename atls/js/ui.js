/* ==========================================================================
   ATLS Simulator — antarmuka (beranda, simulasi, modal, debrief, riwayat)
   ========================================================================== */
(function () {
  'use strict';
  var T = window.ATLS;
  var fmt = T.fmt;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r(x) { return Math.round(x); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var HIST_KEY = 'atlsSim.history.v1', PREF_KEY = 'atlsSim.prefs.v1';
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* abaikan */ } }

  T.Audio.on = { beep: true, metro: true, alarm: false };

  var st = { level: 'pemula', sim: null, mon: null, scen: null, tab: 'ps', raf: null, lastTs: 0, lastUi: 0, lastMetro: 0, lastAlarm: 0, logCount: 0, lastHint: '', choice: null, monWasOn: false };
  T._state = st;

  /* ==================================================================
     BERANDA
     ================================================================== */
  function renderHome() {
    var hist = load(HIST_KEY, []), best = {};
    hist.forEach(function (h) { if (best[h.id] === undefined || h.score > best[h.id]) best[h.id] = h.score; });
    var html = '';
    T.CATEGORIES.forEach(function (c) {
      var items = T.SCENARIOS.filter(function (s) { return s.cat === c.id; });
      if (!items.length) return;
      html += '<h2 class="section-title">' + esc(c.label) + '</h2><div class="scen-grid">';
      items.forEach(function (s) {
        html += '<button type="button" class="scen-card" data-scen="' + s.id + '">' +
          '<span class="scen-top"><span class="tag tag-' + s.cat + '">' + esc(s.badge) + '</span><span class="muted small">' + esc(s.diff) + ' · ' + esc(s.est) + '</span></span>' +
          '<strong class="scen-title">' + esc(s.title) + '</strong>' +
          '<span class="scen-stem">' + esc(s.stem) + '</span>' +
          '<span class="scen-foot">' + (best[s.id] !== undefined ? '<span class="best">Skor terbaik: ' + best[s.id] + '</span>' : '<span class="muted small">Belum dicoba</span>') +
          '<span class="go">Mulai →</span></span></button>';
      });
      html += '</div>';
    });
    $('#scenario-list').innerHTML = html;
    renderHistory(hist);
  }

  function renderHistory(hist) {
    var el = $('#history');
    if (!hist.length) { el.innerHTML = '<p class="muted small">Belum ada latihan yang tersimpan.</p>'; return; }
    var rows = hist.slice(-12).reverse().map(function (h) {
      var d = new Date(h.date);
      return '<tr><td>' + d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '</td>' +
        '<td>' + esc(h.title) + '</td><td>' + (h.level === 'mahir' ? 'Mahir' : 'Pemula') + '</td>' +
        '<td><b>' + h.score + '</b></td><td><span class="grade g-' + h.gradeKey + '">' + esc(h.grade.split(' — ')[0]) + '</span></td></tr>';
    }).join('');
    el.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Skenario</th><th>Level</th><th>Skor</th><th>Hasil</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* ==================================================================
     BRIEFING
     ================================================================== */
  function mistHtml(m) {
    if (!m) return '';
    return [['M', 'Mekanisme', m.M], ['I', 'Cedera', m.I], ['S', 'Tanda', m.S], ['T', 'Tindakan', m.T]].map(function (x) {
      return '<dt title="' + x[1] + '">' + x[0] + '</dt><dd>' + esc(x[2]) + '</dd>';
    }).join('');
  }
  function openBrief(id) {
    var s = T.SCEN_BY_ID[id];
    if (!s) return;
    st.scen = s;
    var cat = T.CATEGORIES.filter(function (c) { return c.id === s.cat; })[0];
    $('#brief-cat').textContent = (cat ? cat.label : '') + ' · ' + s.diff;
    $('#brief-title').textContent = s.title;
    $('#brief-setting').textContent = s.setting;
    $('#brief-stem').textContent = s.stem;
    $('#brief-mist').innerHTML = '<span class="bm-h">Laporan pra-RS (MIST)</span>' + mistHtml(s.mist);
    $('#brief-obj').innerHTML = st.level === 'pemula'
      ? '<h3 class="card-title-sm">Tujuan pembelajaran</h3><ul class="obj">' + s.objectives.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>'
      : '';
    $('#brief-note').innerHTML = st.level === 'pemula'
      ? '<b>Mode Pemula:</b> temuan disertai interpretasi (→), kotak petunjuk aktif, umpan balik muncul di log, perkiraan kelas syok ditampilkan, dan simulasi bisa dijeda. Tip: lakukan briefing tim (tab Definitif & tim) sebelum/sesaat pasien tiba.'
      : '<b>Mode Mahir:</b> temuan tanpa interpretasi, tanpa petunjuk atau umpan balik sampai debrief, waktu berjalan terus. Tetapkan diagnosis kerja sendiri.';
    showModal('modal-brief');
  }

  /* ==================================================================
     SIMULASI
     ================================================================== */
  function startSim() {
    var s = st.scen;
    hideModal('modal-brief');
    T.Audio.init();
    if (st.raf) cancelAnimationFrame(st.raf);
    st.logCount = 0; st.lastHint = ''; st.tab = 'ps'; st.monWasOn = false;
    $('#log').innerHTML = '';
    $('#findings').innerHTML = '<p class="muted small">Belum ada pemeriksaan.</p>';
    $('#sim-title').textContent = s.title;
    $('#sim-level').textContent = st.level === 'mahir' ? 'Mahir' : 'Pemula';
    $('#sim-level').className = 'chip ' + (st.level === 'mahir' ? 'chip-hard' : '');
    $('#case-stem').textContent = s.stem;
    $('#case-mist').innerHTML = mistHtml(s.mist);
    $('#case-setting').textContent = s.setting;
    $('#btn-pause').hidden = st.level === 'mahir';
    $('#btn-pause').textContent = '⏸ Jeda';
    document.body.classList.remove('sim-paused');
    $('#sel-speed').value = '1';
    $$('[data-snd]').forEach(function (c) { c.checked = !!T.Audio.on[c.getAttribute('data-snd')]; });

    var sim = new T.Sim(s, st.level, {
      log: onLog,
      rhythm: function (id, rate) { if (st.mon) st.mon.gen.set(id, rate, sim.t); },
      finding: renderFindings,
      update: function () { refresh(true); },
      jump: function () { if (st.mon) st.mon.clear(); },
      phase: function (p) { if (p === 'alive') toast('ROSC — nadi kembali', 'good'); },
      cpr: function () { refresh(true); },
      end: showDebrief
    });
    st.sim = sim;
    showView('view-sim');
    st.mon = new T.Monitor($('#ecg'));
    st.mon.gen.set('sinus', r(sim.v.hr), 0);
    st.mon.onBeat = function () {
      var S = st.sim;
      if (!S || !S.st.monitor || S.phase !== 'alive' || S.speed > 2) return;
      T.Audio.beep(S.v.spo2);
    };
    buildTabs(); renderActions();
    sim.obs('Pasien tiba di IGD. ' + (s.mist ? 'Laporan pra-RS: ' + s.mist.S : ''));
    refresh(true);
    st.lastTs = performance.now();
    st.raf = requestAnimationFrame(loop);
  }

  function loop(ts) {
    var S = st.sim;
    if (!S) return;
    var dt = Math.min(0.1, (ts - st.lastTs) / 1000);
    st.lastTs = ts;
    S.tick(dt);
    if (!S.ended) {
      var m = st.mon, on = S.st.monitor;
      if (on && !st.monWasOn) { m.clear(); st.monWasOn = true; }
      if (S.phase === 'alive' && m.gen.id === 'sinus') m.gen.rate = Math.max(20, S.v.hr);
      m.st.pulse = S.phase === 'alive';
      m.st.perf = Math.max(0.15, Math.min(1, S.v.sbp / 120));
      m.st.cpr = S.st.cpr;
      m.st.cprStart = S.flags.cprStart || 0;
      m.st.capno = S.st.capno;
      var v = S.vitals();
      m.st.etco2 = v.etco2 || 0;
      m.st.vInt = S.phase === 'alive' ? 60 / Math.max(6, S.v.rr) : 6;
      if (on && !S.paused) m.draw(S.t);
      if (!S.paused && S.speed === 1) {
        if (S.st.cpr && ts - st.lastMetro >= 545) { st.lastMetro = ts; T.Audio.click(); }
        var alarm = on && (S.phase !== 'alive' || S.v.sbp < 80 || S.v.spo2 < 90);
        if (alarm && ts - st.lastAlarm > 5000) { st.lastAlarm = ts; T.Audio.alarm(); }
      }
      if (ts - st.lastUi > 200) { st.lastUi = ts; refresh(false); }
      st.raf = requestAnimationFrame(loop);
    }
  }

  function visibleActions(group) {
    var sets = ['core'].concat(st.scen.sets || []);
    return T.ACTIONS.filter(function (a) { return a.group === group && a.sets.some(function (x) { return sets.indexOf(x) >= 0; }); });
  }
  function buildTabs() {
    var groups = T.GROUPS.filter(function (g) { return visibleActions(g.id).length; });
    if (!groups.some(function (g) { return g.id === st.tab; })) st.tab = 'ps';
    $('#tabs').innerHTML = groups.map(function (g) {
      return '<button type="button" role="tab" class="tab' + (g.id === st.tab ? ' is-active' : '') + '" data-tab="' + g.id + '" aria-selected="' + (g.id === st.tab) + '">' + esc(g.label) + '</button>';
    }).join('');
  }
  function isOn(S, id) {
    var x = S.st;
    switch (id) {
      case 'monitor': return x.monitor;
      case 'o2': return x.o2 && !S.ventilated();
      case 'bvm': return x.bvm && !S.secured();
      case 'cspine': return x.cspine;
      case 'jaw': return x.jaw;
      case 'iv': return x.iv;
      case 'io': return x.io;
      case 'warm': return x.warmed;
      case 'lud': return x.lud;
      case 'hob': return x.hob;
      case 'cpr': return x.cpr;
      case 'rsi': return x.airway === 'ett';
      case 'cric': case 'needle_cric': return x.airway === 'cric';
      case 'binder': return S.flags.binder !== undefined;
      case 'tourniquet': return S.flags.tqAt !== undefined;
      case 'mtp': return !!S.flags.mtp;
      case 'txa': return !!S.flags.txa;
      case 'pressor': return !!S.flags.pressor;
      case 'foley': return x.catheter;
    }
    return false;
  }
  function renderActions() {
    var S = st.sim;
    $('#action-grid').innerHTML = visibleActions(st.tab).map(function (a) {
      var n = S ? S.count(a.id) : 0;
      var label = a.dyn ? a.dyn(S) : a.label;
      var on = S && isOn(S, a.id);
      var cls = 'act' + (a.key ? ' act-key' : '') + (on ? ' is-on' : '') + (a.end ? ' act-end' : '');
      var showN = n && !on && /_assess$|^cryst$|^prbc$|^reassess$|^hyperosm$|^suction$|^pericardio$/.test(a.id);
      return '<button type="button" class="' + cls + '" data-act="' + a.id + '">' + esc(label) + (on ? ' ✓' : '') + (showN ? '<span class="cnt">×' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function doAct(id) {
    var S = st.sim;
    if (!S || S.ended) return;
    var a = T.ACTIONS_BY_ID[id];
    if (!a) return;
    if (a.end) { showModal('modal-end'); return; }
    if (a.side) { openSide(id); return; }
    if (a.modal) { openChoice(a.modal, id); return; }
    S.doAction(id);
    renderActions();
  }

  /* ---------- tampilan periodik ---------- */
  function setVal(sel, val) { var el = $(sel); if (el && el.textContent !== String(val)) el.textContent = val; }

  function refresh(full) {
    var S = st.sim;
    if (!S || S.ended) return;
    var v = S.vitals(), off = !!v.off;
    $('#t-elapsed').textContent = fmt(S.t);
    $('#mon-off').hidden = !off;
    document.body.classList.toggle('mon-dark', off);
    setVal('#v-hr', off || v.hr === null ? '--' : v.hr);
    setVal('#v-spo2', off || v.spo2 === null ? '--' : v.spo2);
    setVal('#v-bp', off || v.sbp === null ? '--/--' : v.sbp + '/' + v.dbp);
    setVal('#v-map', off || v.map === null ? 'MAP --' : 'MAP ' + v.map);
    setVal('#v-rr', off ? '--' : v.rr);
    setVal('#v-temp', off ? '--' : v.temp.toFixed(1));
    setVal('#v-co2', off || v.etco2 === null ? '--' : v.etco2);
    $('#v-bp').parentNode.classList.toggle('alarm', !off && (v.sbp === null || v.sbp < 90));
    $('#v-spo2').parentNode.classList.toggle('alarm', !off && (v.spo2 === null || v.spo2 < 90));
    $('#v-temp').parentNode.classList.toggle('alarm', !off && v.temp < 35.5);
    $('#v-hr').parentNode.classList.toggle('alarm', !off && v.hr !== null && v.hr > 130);
    var alarm = !off && (S.phase !== 'alive' || (v.sbp !== null && v.sbp < 80) || (v.spo2 !== null && v.spo2 < 90));
    $('#mon-alarm').hidden = !alarm;

    var lbl = '';
    if (!off) {
      if (S.st.cpr) lbl = 'Artefak kompresi';
      else if (S.phase === 'arrest') lbl = S.level === 'pemula' ? 'Aktivitas listrik tanpa nadi (PEA)' : '';
      else if (S.phase === 'dead') lbl = 'Asistol';
      else if (S.level === 'pemula') lbl = (S.v.hr > 100 ? 'Sinus takikardia' : S.v.hr < 60 ? 'Sinus bradikardia' : 'Ritme sinus') + (S.v.sbp < 55 ? ' · pleth lemah' : '');
    }
    setVal('#mon-label', lbl);

    setVal('#t-injury', fmt(S.sinceInjury()));
    $('#t-injury').className = S.sinceInjury() >= 3600 ? 'due' : '';
    setVal('#t-cryst', r(S.fl.crystOrd) + ' mL');
    $('#t-cryst').className = S.fl.crystOrd > (S.peds ? 20 * S.pt.weight : 1000) ? 'due' : '';
    var bl = S.fl.prbc ? (S.peds ? r(S.fl.bloodMl) + ' mL' : S.fl.prbc + ' PRC' + (S.fl.ffp ? ' · ' + S.fl.ffp + ' FFP' : '')) : S.flags.mtp ? 'MTP…' : '–';
    setVal('#t-blood', bl);
    if (S.p.ext && S.p.ext.site === 'limb') {
      setVal('#t-x-lbl', 'Tourniquet');
      setVal('#t-x', S.flags.tqAt !== undefined ? fmt(S.t - S.flags.tqAt) : 'belum');
    } else {
      setVal('#t-x-lbl', 'TXA');
      setVal('#t-x', S.flags.txa ? '✓ ' + fmt(S.flags.txaInjury) : 'belum');
    }

    // pelacak primary survey
    var L = S.letters(), keys = ['x', 'a', 'b', 'c', 'd', 'e'], names = { x: 'Perdarahan', a: 'Airway', b: 'Breathing', c: 'Sirkulasi', d: 'Disabilitas', e: 'Eksposur' };
    var nx = keys.filter(function (k) { return L[k] === null; })[0];
    var ps = keys.map(function (k) {
      return '<button type="button" class="ps-step' + (L[k] !== null ? ' done' : k === nx ? ' next' : '') + '" data-act="' + k + '_assess" title="' + names[k] + '"><b>' + k.toUpperCase() + '</b><span>' + (L[k] !== null ? fmt(L[k]) : names[k]) + '</span></button>';
    }).join('');
    var pt = $('#ps-track'); if (pt.innerHTML !== ps) pt.innerHTML = ps;

    // status pasien
    var rows = [];
    var phaseTxt = { alive: S.unstable() ? '<span class="phase ph-arrest">Tidak stabil</span>' : '<span class="phase ph-post">Relatif stabil</span>', arrest: '<span class="phase ph-arrest">HENTI JANTUNG</span>', dead: '<span class="phase ph-arrest">Meninggal</span>' }[S.phase];
    rows.push(['Kondisi', phaseTxt]);
    rows.push(['GCS', L.d !== null ? esc(S.gcsText()) : '<span class="muted">belum dinilai (D)</span>']);
    var aw = { native: 'Tanpa alat', opa: 'OPA', npa: 'NPA', ett: 'ETT + ventilator', cric: S.flags.needleCric ? 'Krikotiroidotomi jarum' : 'Krikotiroidotomi' }[S.st.airway];
    rows.push(['Jalan napas', aw + (S.st.jaw && !S.secured() ? ' + jaw thrust' : '') + (S.scen.blunt ? ' · servikal ' + (S.st.cspine ? '<b class="on">terproteksi</b>' : '<b class="key-bad">belum</b>') : '')]);
    rows.push(['Oksigen', S.secured() ? 'Ventilasi mekanik' : S.st.bvm ? 'BVM + O₂' : S.st.o2 ? 'NRM 15 L/mnt' : 'Udara bebas']);
    rows.push(['Akses', [S.st.iv ? 'IV ×2' : '', S.st.io ? 'IO' : ''].filter(Boolean).join(' + ') || 'Belum ada']);
    var inf = S.inf.length ? ' · <b class="on">infus berjalan</b>' : '';
    rows.push(['Cairan', r(S.fl.crystOrd) + ' mL kristaloid' + (S.fl.bloodMl ? ' · ' + r(S.fl.bloodMl) + ' mL darah' : '') + inf]);
    if (S.p.htx && S.p.htx.tube) rows.push(['WSD', r(S.p.htx.out) + ' mL (±' + r(S.bleedRates().htx * 60) + ' mL/jam)']);
    if (S.st.catheter) rows.push(['Urin', '±' + r(Math.max(0, Math.min(90, (S.v.sbp - 60) * 1.1)) * (S.frac > 0.3 ? 0.3 : 1)) + ' mL/jam']);
    var dev = [];
    if (S.flags.tqAt !== undefined) dev.push('tourniquet ' + fmt(S.flags.tqAt));
    if (S.flags.binder !== undefined) dev.push('pelvic binder');
    if (S.st.lud) dev.push('LUD');
    if (S.st.hob) dev.push('kepala 30°');
    if (S.st.warmed) dev.push('penghangat');
    if (S.st.gastric) dev.push(S.st.gastric.toUpperCase());
    if (dev.length) rows.push(['Terpasang', dev.join(', ')]);
    if (S.level === 'pemula' && S.phase === 'alive' && S.scen.hemo) {
      var cl = T.shockClass(Math.max(0, S.frac));
      rows.push(['Perkiraan syok', 'Kelas ' + ['I', 'II', 'III', 'IV'][cl - 1] + ' (±' + r(Math.max(0, S.frac) * 100) + '% EBV)']);
    }
    if (S.flags.dispo) rows.push(['Disposisi', esc(S.flags.dispo.label)]);
    var html = rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');
    var pe = $('#pt-status'); if (pe.innerHTML !== html) pe.innerHTML = html;

    // petunjuk
    if (S.level === 'pemula') {
      var h = S.scen.hint ? S.scen.hint(S) : null;
      $('#hint').hidden = !h;
      if (h && h !== st.lastHint) { st.lastHint = h; $('#hint-text').textContent = h; }
    } else $('#hint').hidden = true;

    // tombol FF
    var ff = $('#btn-ff');
    ff.disabled = S.phase !== 'alive';
    ff.title = S.phase !== 'alive' ? 'Tidak bisa lompat waktu saat henti jantung' : 'Lompat waktu 1 menit';

    if (full) renderActions();
  }

  /* ---------- log & temuan ---------- */
  var HIDDEN_MAHIR = { good: 1, warn: 1, err: 1, tip: 1 };
  function onLog(e) {
    if (st.level === 'mahir' && HIDDEN_MAHIR[e.kind]) return;
    var li = document.createElement('li');
    li.className = 'lg lg-' + e.kind;
    li.innerHTML = '<span class="lg-t">' + fmt(e.t) + '</span><span class="lg-x">' + esc(e.text) + (e.teach ? '<small>' + esc(e.teach) + '</small>' : '') + '</span>';
    var log = $('#log');
    log.insertBefore(li, log.firstChild);
    st.logCount++;
    if (st.logCount > 200 && log.lastChild) log.removeChild(log.lastChild);
    if (e.kind === 'alert') toast(e.text, 'alert');
    else if (e.kind === 'err' && st.level === 'pemula') toast(e.text, 'err');
  }
  function renderFindings() {
    var S = st.sim;
    if (!S) return;
    $('#findings').innerHTML = S.findings.map(function (f, i) {
      return '<div class="fd' + (i === 0 ? ' fd-new' : '') + '"><div class="fd-h"><b>' + esc(f.title) + '</b><span class="muted small">' + fmt(f.t) + '</span></div><p>' + esc(f.text) + '</p></div>';
    }).join('');
  }

  /* ==================================================================
     MODAL PILIHAN
     ================================================================== */
  function opt(type, name, id, label, checked) {
    return '<label class="opt"><input type="' + type + '" name="' + name + '" value="' + esc(id) + '"' + (checked ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }
  function openSide(id) {
    var a = T.ACTIONS_BY_ID[id];
    st.choice = { kind: 'side', id: id };
    $('#choice-title').textContent = (a.dyn ? a.dyn(st.sim) : a.label).replace('…', '');
    $('#choice-sub').textContent = 'Pilih sisi hemitoraks. Simulasi tetap berjalan.';
    $('#choice-body').innerHTML = '<div class="side-row">' + opt('radio', 'side', 'kanan', 'Kanan') + opt('radio', 'side', 'kiri', 'Kiri') + opt('radio', 'side', 'bilateral', 'Bilateral') + '</div>';
    $('#btn-choice').textContent = 'Kerjakan';
    showModal('modal-choice');
  }
  function openChoice(kind, id) {
    var S = st.sim, body = '';
    st.choice = { kind: kind, id: id };
    $('#btn-choice').textContent = 'Simpan';
    if (kind === 'dx') {
      $('#choice-title').textContent = 'Diagnosis kerja — cedera mengancam nyawa';
      $('#choice-sub').textContent = 'Centang semua cedera yang Anda tegakkan/curigai kuat saat ini. Dapat diperbarui kapan saja.';
      var cur = S.dx || [];
      body = '<div class="opt-list two">' + T.INJURIES.map(function (x) { return opt('checkbox', 'dx', x.id, x.label, cur.indexOf(x.id) >= 0); }).join('') + '</div>';
    } else if (kind === 'team') {
      $('#choice-title').textContent = 'Briefing tim trauma & pembagian peran';
      $('#choice-sub').textContent = 'Pilih butir yang Anda sampaikan saat briefing (idealnya sebelum/sesaat pasien tiba).';
      body = '<div class="opt-list">' + shuffle(T.TEAM_ITEMS).map(function (x) { return opt('checkbox', 'team', x.id, x.label, false); }).join('') + '</div>';
    } else if (kind === 'sbar') {
      $('#choice-title').textContent = 'Rujukan — komunikasi dokter-ke-dokter (SBAR)';
      $('#choice-sub').textContent = 'Ringkasan MIST otomatis di bawah. Pilih butir yang Anda sampaikan/lakukan, lalu pilih moda transportasi.';
      var ms = T.mistSummary(S).map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('');
      var all = [];
      T.SBAR_GROUPS.forEach(function (g) { all = all.concat(g.items); });
      body = '<dl class="brief-mist"><span class="bm-h">Ringkasan MIST pasien saat ini</span>' + ms + '</dl>' +
        '<p class="opt-h">Isi komunikasi & persiapan rujukan</p><div class="opt-list">' + shuffle(all).map(function (x) { return opt('checkbox', 'sbar', x.id, x.label, false); }).join('') + '</div>' +
        '<p class="opt-h">Moda transportasi & pendamping</p><div class="opt-list">' + shuffle(T.TRANSPORT).map(function (x) { return opt('radio', 'tr', x.id, x.label, false); }).join('') + '</div>';
      $('#btn-choice').textContent = 'Kirim & rujuk';
    } else if (kind === 'burn') {
      $('#choice-title').textContent = 'Estimasi luas luka bakar & cairan';
      $('#choice-sub').textContent = 'Gunakan temuan E (eksposur). Hitung hanya luka bakar derajat II–III.';
      body = '<div class="calc-box"><div class="nines"><span>Kepala & leher 9%</span><span>Tiap lengan 9%</span><span>Dada + perut (anterior) 18%</span><span>Punggung (posterior) 18%</span><span>Tiap tungkai 18%</span><span>Perineum 1%</span><span>Telapak tangan pasien ≈1%</span></div>' +
        '<label class="num">%TBSA (derajat II–III)<input type="number" id="burn-tbsa" min="1" max="100" step="0.5" value=""></label>' +
        '<div class="calc-out" id="burn-out">Berat badan ' + S.pt.weight + ' kg · formula ATLS: RL 2 mL × kgBB × %TBSA (½ dalam 8 jam pertama sejak cedera).</div></div>';
      $('#btn-choice').textContent = 'Mulai infus RL';
    }
    $('#choice-body').innerHTML = body;
    showModal('modal-choice');
    if (kind === 'burn') {
      var inp = $('#burn-tbsa');
      inp.addEventListener('input', function () {
        var t = Number(inp.value) || 0, w = S.pt.weight, tot = 2 * w * t;
        $('#burn-out').innerHTML = t > 0 ? '24 jam: <b>' + r(tot) + ' mL</b> RL · 8 jam pertama: <b>' + r(tot / 2) + ' mL</b> (<b>' + r(tot / 16) + ' mL/jam</b>) · 16 jam berikutnya: <b>' + r(tot / 32) + ' mL/jam</b>. Titrasi ke urin output 0,5 mL/kg/jam (±' + r(0.5 * w) + ' mL/jam).' : 'Masukkan %TBSA.';
      });
      inp.focus();
    }
  }
  function submitChoice() {
    var S = st.sim, c = st.choice;
    if (!S || S.ended || !c) { hideModal('modal-choice'); return; }
    var vals = function (name) { return $$('#choice-body input[name="' + name + '"]:checked').map(function (x) { return x.value; }); };
    if (c.kind === 'side') {
      var sd = vals('side')[0];
      if (!sd) { toast('Pilih sisi terlebih dahulu', 'err'); return; }
      hideModal('modal-choice'); S.doAction(c.id, sd);
    } else if (c.kind === 'dx') {
      hideModal('modal-choice'); S.doAction('dx', vals('dx'));
    } else if (c.kind === 'team') {
      hideModal('modal-choice'); S.doAction('team', T.scoreTeam(vals('team')));
    } else if (c.kind === 'sbar') {
      var tr = vals('tr')[0];
      if (!tr) { toast('Pilih moda transportasi', 'err'); return; }
      hideModal('modal-choice'); S.doAction('transfer', T.scoreSbar(vals('sbar'), tr));
    } else if (c.kind === 'burn') {
      var t = Number($('#burn-tbsa').value);
      if (!(t > 0 && t <= 100)) { toast('Masukkan %TBSA yang valid', 'err'); return; }
      hideModal('modal-choice'); S.doAction('burncalc', { tbsa: t });
    }
    st.choice = null;
    renderActions();
  }

  /* ==================================================================
     DEBRIEF
     ================================================================== */
  function keyList(items, picked) {
    return '<ul class="key-list">' + items.map(function (x) {
      var p = picked.indexOf(x.id) >= 0;
      var cls = x.ok ? (p ? 'key-ok' : 'key-miss') : (p ? 'key-bad' : '');
      var ic = x.ok ? (p ? '✓' : '○') : (p ? '✗' : '·');
      return '<li class="' + cls + '">' + ic + ' ' + esc(x.label) + (x.ok ? '' : ' <span class="muted small">(tidak tepat)</span>') + '</li>';
    }).join('') + '</ul>';
  }

  function showDebrief(res) {
    var S = st.sim, s = st.scen;
    if (st.raf) cancelAnimationFrame(st.raf);
    hideModal('modal-end'); hideModal('modal-choice');
    var entry = { id: s.id, title: s.title, level: S.level, score: res.score, grade: res.grade, gradeKey: res.gradeKey, date: new Date().toISOString(), duration: r(res.duration) };
    var hist = load(HIST_KEY, []);
    hist.push(entry);
    if (hist.length > 60) hist = hist.slice(-60);
    save(HIST_KEY, hist);

    var deg = r(res.score * 3.6), h = '';
    var reason = { time: ' (batas waktu tercapai)', death: '', dispo: '', manual: '' }[res.endReason] || '';
    h += '<div class="db-head"><div><p class="eyebrow">Debrief · ' + (S.level === 'mahir' ? 'Mahir' : 'Pemula') + ' · ' + new Date().toLocaleString('id-ID') + '</p>' +
      '<h1>' + esc(s.title) + '</h1>' +
      '<p class="outcome ' + (res.outcome.ok ? 'ok' : 'bad') + '">' + esc(res.outcome.text) + ' <span class="muted small">Durasi ' + fmt(res.duration) + reason + '.</span></p></div>' +
      '<div class="ring g-' + res.gradeKey + '" style="--deg:' + deg + 'deg"><div><b>' + res.score + '</b><span>/100</span></div></div></div>';
    h += '<div class="db-grade g-' + res.gradeKey + '"><b>' + esc(res.grade) + '</b><span>Skor kriteria ' + res.base + ' − penalti ' + res.penPts + ' = ' + res.score + '</span></div>';
    if (res.critFail.length) {
      h += '<div class="card crit-box"><h2 class="card-title">Tindakan kritis yang terlewat / belum tepat</h2><ul>' + res.critFail.map(function (c) { return '<li><b>' + esc(c.label) + '</b>' + (c.note ? ' — ' + esc(c.note) : '') + '</li>'; }).join('') + '</ul></div>';
    }
    h += '<h2 class="section-title">Metrik resusitasi trauma</h2><div class="metrics">' + res.metrics.map(function (m) {
      return '<div class="metric ' + (m.ok === undefined ? '' : m.ok ? 'ok' : 'bad') + '"><span class="muted small">' + esc(m.label) + '</span><b>' + esc(m.value) + '</b>' + (m.target ? '<span class="small">Target ' + esc(m.target) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
    h += '<h2 class="section-title">Penilaian per kriteria</h2><div class="table-wrap"><table class="tbl crit"><thead><tr><th></th><th>Kriteria</th><th>Bobot</th><th>Catatan</th></tr></thead><tbody>' +
      res.criteria.map(function (c) {
        var ic = c.frac >= 1 ? '<span class="ic ok">✓</span>' : c.frac > 0 ? '<span class="ic part">◐</span>' : '<span class="ic bad">✗</span>';
        return '<tr><td>' + ic + '</td><td><b>' + esc(c.label) + '</b>' + (c.critical ? ' <span class="tag tag-crit">kritis</span>' : '') + (c.why ? '<small class="why">' + esc(c.why) + '</small>' : '') + '</td><td>' + Math.round(c.w * c.frac * 10) / 10 + '/' + c.w + '</td><td class="small">' + esc(c.note || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    // kunci jawaban
    var truth = s.injuries || [], dx = S.dx || [];
    var dxItems = T.INJURIES.filter(function (x) { return truth.indexOf(x.id) >= 0 || dx.indexOf(x.id) >= 0; }).map(function (x) { return { id: x.id, label: x.label, ok: truth.indexOf(x.id) >= 0 }; });
    h += '<h2 class="section-title">Kunci diagnosis kerja</h2><div class="card compact">' + (S.dx ? '' : '<p class="small muted">Diagnosis kerja tidak ditetapkan selama simulasi.</p>') + keyList(dxItems, dx) + '</div>';
    if (S.brief || S.sbar) {
      h += '<div class="two-cards" style="margin-top:12px">';
      if (S.brief) h += '<div class="card compact"><h3 class="card-title-sm">Briefing tim (' + r(S.brief.frac * 100) + '%)</h3>' + keyList(T.TEAM_ITEMS, S.brief.picked) + '</div>';
      if (S.sbar) {
        var all = []; T.SBAR_GROUPS.forEach(function (g) { all = all.concat(g.items); });
        h += '<div class="card compact"><h3 class="card-title-sm">Rujukan SBAR (' + r(S.sbar.frac * 100) + '%)</h3>' + keyList(all, S.sbar.picked) + '<p class="opt-h">Transportasi</p>' + keyList(T.TRANSPORT, [S.sbar.transport]) + '</div>';
      }
      h += '</div>';
    }
    if (res.pens.length) {
      h += '<h2 class="section-title">Kesalahan & catatan pembelajaran</h2><ul class="pens">' + res.pens.map(function (p) {
        return '<li class="pen pen-' + p.kind + '"><span class="lg-t">' + fmt(p.t) + '</span><div><b>' + esc(p.text) + '</b>' + (p.pts ? ' <span class="pts">−' + p.pts + '</span>' : '') + (p.teach ? '<p>' + esc(p.teach) + '</p>' : '') + '</div></li>';
      }).join('') + '</ul>';
    } else h += '<p class="good-note" style="margin-top:14px">Tidak ada kesalahan tindakan yang tercatat. Kerja bagus!</p>';
    h += '<h2 class="section-title">Timeline lengkap</h2><ol class="log log-full">' + res.log.map(function (e) {
      return '<li class="lg lg-' + e.kind + '"><span class="lg-t">' + fmt(e.t) + '</span><span class="lg-x">' + esc(e.text) + (e.teach ? '<small>' + esc(e.teach) + '</small>' : '') + '</span></li>';
    }).join('') + '</ol>';
    h += '<div class="db-actions no-print"><button type="button" class="btn btn-primary" id="db-retry">Ulangi skenario</button><button type="button" class="btn btn-ghost" id="db-home">Pilih skenario lain</button><button type="button" class="btn btn-ghost" id="db-print">Cetak / simpan PDF</button><a class="btn btn-ghost" href="referensi.html">Ringkasan ATLS</a></div>';
    h += '<p class="muted small">Acuan: prinsip ATLS® edisi ke-11 (American College of Surgeons). Skor bersifat formatif untuk latihan, bukan penilaian sertifikasi.</p>';
    $('#debrief').innerHTML = h;
    showView('view-debrief');
    window.scrollTo(0, 0);
  }

  /* ==================================================================
     UTIL VIEW / MODAL / TOAST
     ================================================================== */
  function showView(id) {
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === id); });
    document.body.classList.toggle('in-sim', id === 'view-sim');
  }
  function showModal(id) { $('#' + id).hidden = false; }
  function hideModal(id) { $('#' + id).hidden = true; }
  function anyModal() { return !$('#modal-brief').hidden || !$('#modal-end').hidden || !$('#modal-choice').hidden; }
  function toast(text, kind) {
    var t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2800);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3300);
  }
  function goHome() {
    if (st.raf) cancelAnimationFrame(st.raf);
    st.sim = null;
    renderHome();
    showView('view-home');
  }

  /* ==================================================================
     EVENT
     ================================================================== */
  function bind() {
    var prefs = load(PREF_KEY, null);
    if (prefs) {
      st.level = prefs.level === 'mahir' ? 'mahir' : 'pemula';
      if (prefs.sound) { T.Audio.on.beep = !!prefs.sound.beep; T.Audio.on.alarm = !!prefs.sound.alarm; }
    }
    $$('input[name="level"]').forEach(function (x) { x.checked = x.value === st.level; });
    $('#pref-beep').checked = T.Audio.on.beep; $('#pref-alarm').checked = T.Audio.on.alarm;
    function savePrefs() { save(PREF_KEY, { level: st.level, sound: { beep: T.Audio.on.beep, alarm: T.Audio.on.alarm } }); }

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'level') { st.level = t.value; savePrefs(); }
      if (t.id === 'pref-beep') { T.Audio.on.beep = t.checked; savePrefs(); }
      if (t.id === 'pref-alarm') { T.Audio.on.alarm = t.checked; savePrefs(); }
      if (t.hasAttribute('data-snd')) { T.Audio.on[t.getAttribute('data-snd')] = t.checked; savePrefs(); }
      if (t.id === 'sel-speed' && st.sim) st.sim.speed = Number(t.value) || 1;
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('button, [data-close]');
      if (!t) return;
      var S = st.sim;
      if (t.hasAttribute('data-scen')) { openBrief(t.getAttribute('data-scen')); return; }
      if (t.hasAttribute('data-close')) { var m = t.closest('.modal'); if (m) m.hidden = true; st.choice = null; return; }
      if (t.id === 'btn-start') { startSim(); return; }
      if (t.id === 'btn-clear-history') { if (window.confirm('Hapus seluruh riwayat latihan di perangkat ini?')) { save(HIST_KEY, []); renderHome(); } return; }
      if (t.id === 'db-retry') { openBrief(st.scen.id); return; }
      if (t.id === 'db-home') { goHome(); return; }
      if (t.id === 'db-print') { window.print(); return; }
      if (!S || S.ended) return;
      if (t.id === 'btn-choice') { submitChoice(); return; }
      if (t.hasAttribute('data-tab')) { st.tab = t.getAttribute('data-tab'); buildTabs(); renderActions(); return; }
      if (t.hasAttribute('data-act')) { doAct(t.getAttribute('data-act')); return; }
      switch (t.id) {
        case 'btn-end': showModal('modal-end'); break;
        case 'btn-end-confirm': hideModal('modal-end'); S.end('manual'); break;
        case 'btn-pause':
          S.paused = !S.paused;
          t.textContent = S.paused ? '▶ Lanjut' : '⏸ Jeda';
          document.body.classList.toggle('sim-paused', S.paused);
          break;
        case 'btn-ff':
          if (S.phase === 'alive') { S.advance(60); refresh(true); }
          break;
      }
    });

    document.addEventListener('keydown', function (e) {
      var S = st.sim;
      if (e.key === 'Escape') { $$('.modal').forEach(function (m) { m.hidden = true; }); st.choice = null; return; }
      if (!S || S.ended || !$('#view-sim').classList.contains('is-active')) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (anyModal()) return;
      var k = e.key.toLowerCase();
      if ('xabcde'.indexOf(k) >= 0 && k.length === 1) doAct(k + '_assess');
      else if (k === 'r') doAct('reassess');
      else if (k === 'm') doAct('monitor');
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (st.mon && st.sim && !st.sim.ended) st.mon.resize(); }, 150);
    });
  }

  document.addEventListener('DOMContentLoaded', function () { bind(); renderHome(); });
})();
