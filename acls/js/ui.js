/* ==========================================================================
   ACLS Simulator — antarmuka (beranda, simulasi, debrief, riwayat)
   ========================================================================== */
(function () {
  'use strict';
  var A = window.ACLS;
  var fmt = A.fmt;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var HIST_KEY = 'aclsSim.history.v1', PREF_KEY = 'aclsSim.prefs.v1';
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* abaikan */ } }

  var st = {
    level: 'pemula', sim: null, mon: null, scen: null, tab: 'cpr',
    raf: null, lastTs: 0, lastUi: 0, lastMetro: 0, lastAlarm: 0, logCount: 0, lastHint: ''
  };
  A._state = st;   // untuk debugging/pengujian dari konsol

  /* ==================================================================
     BERANDA
     ================================================================== */
  function renderHome() {
    var hist = load(HIST_KEY, []);
    var best = {};
    hist.forEach(function (h) { if (best[h.id] === undefined || h.score > best[h.id]) best[h.id] = h.score; });
    var html = '';
    A.CATEGORIES.forEach(function (c) {
      var items = A.SCENARIOS.filter(function (s) { return s.cat === c.id; });
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
  function openBrief(id) {
    var s = A.SCEN_BY_ID[id];
    if (!s) return;
    st.scen = s;
    var cat = A.CATEGORIES.filter(function (c) { return c.id === s.cat; })[0];
    $('#brief-cat').textContent = (cat ? cat.label : '') + ' · ' + s.diff;
    $('#brief-title').textContent = s.title;
    $('#brief-setting').textContent = s.setting;
    $('#brief-stem').textContent = s.stem;
    var ini = s.init;
    var v = ini.pulse
      ? [['Nadi', 'Teraba'], ['TD', ini.sbp + '/' + ini.dbp + ' mmHg'], ['SpO₂', ini.spo2 + '%'], ['Kesadaran', ini.consc]]
      : [['Nadi', 'Tidak teraba'], ['Napas', 'Tidak normal / gasping'], ['Kesadaran', 'Tidak responsif']];
    $('#brief-vitals').innerHTML = v.map(function (x) { return '<div><span class="muted small">' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('');
    $('#brief-obj').innerHTML = st.level === 'pemula'
      ? '<h3 class="card-title-sm">Tujuan pembelajaran</h3><ul class="obj">' + s.objectives.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>'
      : '';
    $('#brief-note').innerHTML = st.level === 'pemula'
      ? '<b>Mode Pemula:</b> nama ritme ditampilkan saat kompresi berhenti, kotak petunjuk aktif, umpan balik muncul di log, dan simulasi bisa dijeda.'
      : '<b>Mode Mahir:</b> Anda harus membaca ritme sendiri pada setiap analisis. Tidak ada petunjuk atau umpan balik sampai debrief. Waktu berjalan terus.';
    showModal('modal-brief');
  }

  /* ==================================================================
     SIMULASI
     ================================================================== */
  function startSim() {
    var s = st.scen;
    hideModal('modal-brief');
    A.Audio.init();
    if (st.raf) cancelAnimationFrame(st.raf);
    st.logCount = 0; st.lastHint = '';
    $('#log').innerHTML = '';
    $('#findings').innerHTML = '<p class="muted small">Belum ada pemeriksaan.</p>';
    $('#rid').hidden = true;
    $('#sim-title').textContent = s.title;
    $('#sim-level').textContent = st.level === 'mahir' ? 'Mahir' : 'Pemula';
    $('#sim-level').className = 'chip ' + (st.level === 'mahir' ? 'chip-hard' : '');
    $('#case-stem').textContent = s.stem;
    $('#btn-pause').hidden = st.level === 'mahir';
    $('#btn-pause').textContent = '⏸ Jeda';
    $('#sel-speed').value = '1';
    $('#sel-energy').value = '200';
    $$('[data-snd]').forEach(function (c) { c.checked = !!A.Audio.on[c.getAttribute('data-snd')]; });

    var sim = new A.Sim(s, st.level, {
      log: onLog,
      rhythm: function (id, rate) { if (st.mon) st.mon.gen.set(id, rate, sim.t); },
      reveal: onReveal,
      phase: function (p) { if (p === 'post') toast('ROSC tercapai', 'good'); },
      finding: renderFindings,
      update: function () { refresh(true); },
      jump: function () { if (st.mon) st.mon.clear(); },
      shock: function () { A.Audio.shock(); var f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); },
      pacing: syncPacing,
      cpr: function () { refresh(true); },
      end: showDebrief
    });
    st.sim = sim;
    showView('view-sim');
    st.mon = new A.Monitor($('#ecg'));
    st.mon.gen.set(sim.pt.rhythm, sim.pt.rate, 0);
    st.mon.onBeat = function () {
      if (!st.sim || st.sim.cpr.on || st.sim.speed > 2) return;
      A.Audio.beep(st.sim.pt.pulse ? st.sim.pt.spo2 : null);
    };
    buildTabs();
    renderActions();
    sim.obs('Skenario dimulai. ' + (sim.pt.pulse ? 'Pasien sadar/bernadi — nilai ABCDE & stabilitas.' : 'Pasien tidak responsif, nadi tidak teraba.'));
    refresh(true);
    st.lastTs = performance.now();
    st.raf = requestAnimationFrame(loop);
  }

  function loop(ts) {
    var sim = st.sim;
    if (!sim) return;
    var dt = Math.min(0.1, (ts - st.lastTs) / 1000);
    st.lastTs = ts;
    sim.tick(dt);
    if (!sim.ended) {
      var v = sim.vitals();
      var m = st.mon;
      m.st.pulse = sim.pt.pulse;
      m.st.perf = Math.max(0.25, Math.min(1, (sim.pt.sbp || 0) / 120));
      m.st.cpr = sim.cpr.on;
      m.st.cprStart = sim.cpr.startT;
      m.st.capno = sim.capno;
      m.st.etco2 = v.etco2 || 0;
      m.st.vInt = sim.phase === 'pre' ? 3.8 : sim.airway === 'adv' || sim.phase === 'post' ? 6 : 8;
      if (!sim.paused) m.draw(sim.t);
      // metronom & alarm (real-time, hanya kecepatan 1×)
      if (!sim.paused && sim.speed === 1) {
        if (sim.cpr.on && ts - st.lastMetro >= 545) { st.lastMetro = ts; A.Audio.click(); }
        if (sim.phase === 'arrest' && !sim.cpr.on && ts - st.lastAlarm > 4000) { st.lastAlarm = ts; A.Audio.alarm(); }
      }
      if (ts - st.lastUi > 200) { st.lastUi = ts; refresh(false); }
      st.raf = requestAnimationFrame(loop);
    }
  }

  function buildTabs() {
    var s = st.scen;
    var groups = A.GROUPS.filter(function (g) { return visibleActions(g.id).length; });
    if (!groups.some(function (g) { return g.id === st.tab; })) st.tab = 'cpr';
    $('#tabs').innerHTML = groups.map(function (g) {
      return '<button type="button" role="tab" class="tab' + (g.id === st.tab ? ' is-active' : '') + '" data-tab="' + g.id + '" aria-selected="' + (g.id === st.tab) + '">' + esc(g.label) + '</button>';
    }).join('');
    void s;
  }

  function visibleActions(group) {
    var sets = ['core'].concat(st.scen.sets || []);
    return A.ACTIONS.filter(function (a) {
      return a.group === group && a.sets.some(function (x) { return sets.indexOf(x) >= 0; });
    });
  }

  function renderActions() {
    var sim = st.sim;
    $('#action-grid').innerHTML = visibleActions(st.tab).map(function (a) {
      var n = sim && sim.doses[a.id] ? sim.doses[a.id].length : (sim && a.group !== 'drug' && sim.acts[a.id] ? 0 : 0);
      var label = a.dyn ? a.dyn(sim) : a.label;
      var cls = 'act' + (a.key ? ' act-key' : '') + (a.id === 'cpr' && sim.cpr.on ? ' is-on' : '') + (a.end ? ' act-end' : '');
      return '<button type="button" class="' + cls + '" data-act="' + a.id + '">' + esc(label) + (n ? '<span class="cnt">×' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function doAct(id) {
    var sim = st.sim;
    if (!sim || sim.ended) return;
    var a = A.ACTIONS_BY_ID[id];
    if (!a) return;
    if (a.end) { showModal('modal-end'); return; }
    if (a.modal === 'hst') { openHst(); return; }
    sim.doAction(id);
    renderActions();
  }

  /* ---------- tampilan periodik ---------- */
  function refresh(full) {
    var sim = st.sim;
    if (!sim || sim.ended) return;
    var v = sim.vitals(), r = sim.rhythm();
    $('#t-elapsed').textContent = fmt(sim.t);
    setVal('#v-hr', v.hr === null ? '--' : v.hr);
    setVal('#v-spo2', v.spo2 === null ? '--' : v.spo2);
    setVal('#v-bp', v.sbp === null ? '--/--' : v.sbp + '/' + v.dbp);
    setVal('#v-map', v.map === null ? 'MAP --' : 'MAP ' + v.map);
    setVal('#v-co2', v.etco2 === null ? '--' : v.etco2);
    $('#v-bp').parentNode.classList.toggle('alarm', v.map !== null && v.map < 65);
    $('#v-spo2').parentNode.classList.toggle('alarm', v.spo2 !== null && v.spo2 < 90);

    // label monitor
    var lbl = '';
    if (sim.cpr.on) lbl = 'Artefak kompresi — hentikan kompresi untuk menilai ritme';
    else if (sim.level === 'pemula') lbl = (sim.pace.on && sim.pace.capture ? 'Ritme pacu (capture)' : r.label) + (sim.phase === 'arrest' && r.kind === 'beats' && !sim.pt.pulse ? ' · cek nadi' : '');
    setVal('#mon-label', lbl);
    $('#mon-sync').hidden = !sim.defib.sync;
    $('#mon-pace').hidden = !sim.pace.on;
    $('#mon-pace').textContent = 'PACER ' + sim.pace.rate + ' ppm · ' + sim.pace.ma + ' mA';
    $('#mon-charge').hidden = !sim.defib.charged;

    // timer
    var inArrest = sim.arr.episodes > 0;
    var cyc = sim.cpr.on && sim.cpr.cycleStart !== null ? sim.t - sim.cpr.cycleStart : null;
    setVal('#t-cycle', cyc === null ? (inArrest && sim.phase === 'arrest' ? 'jeda' : '–') : fmt(cyc));
    var bar = $('#t-cycle-bar');
    bar.style.width = cyc === null ? '0%' : Math.min(100, cyc / 120 * 100) + '%';
    bar.className = cyc !== null && cyc >= 115 ? 'due' : '';
    var le = sim.lastDose('epi1');
    setVal('#t-epi', le === null ? '–' : fmt(sim.t - le));
    $('#t-epi').className = le !== null && sim.phase === 'arrest' && sim.t - le >= 180 ? 'due' : '';
    setVal('#t-shocks', String(sim.shocks.length));
    setVal('#t-ccf', inArrest && sim.arr.total > 5 ? Math.round(sim.arr.cprOn / sim.arr.total * 100) + '%' : '–');

    // tombol FF
    var ff = $('#btn-ff');
    if (sim.phase === 'arrest' && sim.cpr.on) { ff.textContent = '⏩ Akhir siklus'; ff.disabled = cyc === null || cyc >= 118; }
    else if (sim.phase === 'arrest') { ff.textContent = '⏩ +1 menit'; ff.disabled = true; ff.title = 'Tidak bisa lompat waktu saat kompresi berhenti'; }
    else { ff.textContent = '⏩ +1 menit'; ff.disabled = false; ff.title = 'Lompat waktu 1 menit'; }

    // defib
    var d = sim.defib;
    $('#btn-pads').disabled = d.pads;
    $('#btn-pads').textContent = d.pads ? 'Pads terpasang ✓' : 'Pasang pads';
    $('#btn-sync').textContent = 'SYNC: ' + (d.sync ? 'ON' : 'OFF');
    $('#btn-sync').setAttribute('aria-pressed', d.sync);
    $('#btn-sync').classList.toggle('is-on', d.sync);
    var charging = d.chargeDone !== null;
    $('#btn-charge').textContent = charging ? 'Charging…' : d.charged ? 'Terisi ' + d.energy + ' J' : 'Charge ' + d.energy + ' J';
    $('#btn-charge').disabled = !d.pads || charging || d.charged;
    $('#btn-shock').disabled = !d.charged;
    $('#btn-shock').classList.toggle('armed', d.charged);
    $('#btn-pace').textContent = 'Pacing: ' + (sim.pace.on ? 'ON' : 'OFF');
    $('#btn-pace').classList.toggle('is-on', sim.pace.on);
    $('#btn-pace').setAttribute('aria-pressed', sim.pace.on);
    $('#out-rate').textContent = sim.pace.rate;
    $('#out-ma').textContent = sim.pace.ma;
    setVal('#defib-status', !d.pads ? 'Pads belum terpasang' : charging ? 'Charging…' : d.charged ? 'SIAP SHOCK — ' + d.energy + ' J' : 'Pads terpasang · ' + d.energy + ' J' + (d.sync ? ' · SYNC' : ''));

    // status pasien
    var phaseLbl = { pre: 'Dengan nadi', arrest: 'HENTI JANTUNG', post: 'Pasca-ROSC' }[sim.phase];
    var rows = [
      ['Fase', '<span class="phase ph-' + sim.phase + '">' + phaseLbl + '</span>'],
      ['Kesadaran', esc(sim.pt.consc || '-')],
      ['Jalan napas', { none: 'Tanpa alat', bvm: 'BVM + O₂', adv: 'Advanced airway' }[sim.airway] + (sim.capno ? ' · kapnografi' : '') + (sim.o2 && sim.airway === 'none' ? ' · O₂' : '')],
      ['Akses', sim.iv ? 'IV/IO terpasang' : 'Belum ada'],
      ['RJP', sim.cpr.on ? '<b class="on">Kompresi berjalan</b>' : 'Tidak ada kompresi']
    ];
    var html = rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');
    var ptEl = $('#pt-status');
    if (ptEl.innerHTML !== html) ptEl.innerHTML = html;

    // petunjuk
    if (sim.level === 'pemula') {
      var h = st.scen.hint ? st.scen.hint(sim) : null;
      $('#hint').hidden = !h;
      if (h && h !== st.lastHint) { st.lastHint = h; $('#hint-text').textContent = h; }
    } else { $('#hint').hidden = true; }

    if (full) renderActions();
    else {
      var cb = $('[data-act="cpr"]');
      if (cb) { cb.classList.toggle('is-on', sim.cpr.on); var t = A.ACTIONS_BY_ID.cpr.dyn(sim); if (cb.textContent !== t) cb.textContent = t; }
    }
  }

  function setVal(sel, val) { var el = $(sel); if (el && el.textContent !== String(val)) el.textContent = val; }

  function syncPacing() {
    var sim = st.sim;
    if (!sim || !st.mon) return;
    st.mon.gen.setPacing(sim.pace.on, sim.pace.rate, sim.pace.capture, sim.t);
  }

  /* ---------- log ---------- */
  var HIDDEN_MAHIR = { good: 1, warn: 1, err: 1, tip: 1 };
  function onLog(e) {
    if (st.level === 'mahir' && HIDDEN_MAHIR[e.kind]) return;
    var li = document.createElement('li');
    li.className = 'lg lg-' + e.kind;
    li.innerHTML = '<span class="lg-t">' + fmt(e.t) + '</span><span class="lg-x">' + esc(e.text) + (e.teach ? '<small>' + esc(e.teach) + '</small>' : '') + '</span>';
    var log = $('#log');
    log.insertBefore(li, log.firstChild);
    st.logCount++;
    if (st.logCount > 160 && log.lastChild) log.removeChild(log.lastChild);
    if (e.kind === 'alert') toast(e.text, 'alert');
    else if (e.kind === 'err' && st.level === 'pemula') toast(e.text, 'err');
  }

  function renderFindings() {
    var sim = st.sim;
    if (!sim) return;
    $('#findings').innerHTML = sim.findings.map(function (f) {
      return '<div class="fd"><div class="fd-h"><b>' + esc(f.title) + '</b><span class="muted small">' + fmt(f.t) + '</span></div><p>' + esc(f.text) + '</p></div>';
    }).join('');
  }

  /* ---------- identifikasi ritme (Mahir) ---------- */
  function onReveal() {
    var sim = st.sim;
    if (sim.level !== 'mahir') return;
    var actual = sim.rhythm().idg;
    if (sim.pace.on && sim.pace.capture) return;
    var grid = $('#rid-grid');
    grid.innerHTML = A.RHYTHM_CHOICES.map(function (c) { return '<button type="button" class="btn btn-sm btn-ghost" data-rid="' + c.id + '">' + esc(c.label) + '</button>'; }).join('');
    grid.setAttribute('data-actual', actual);
    $('#rid').hidden = false;
  }

  function answerRid(id) {
    var sim = st.sim, grid = $('#rid-grid');
    var actual = grid.getAttribute('data-actual');
    var choice = A.RHYTHM_CHOICES.filter(function (c) { return c.id === id; })[0];
    sim.ids.push({ t: sim.t, actual: actual, answer: id, ok: id === actual });
    sim.act('Interpretasi ritme ketua tim: ' + (choice ? choice.label : id) + '.');
    if (id !== actual) {
      var act = A.RHYTHM_CHOICES.filter(function (c) { return c.id === actual; })[0];
      sim.pens.push({ t: sim.t, code: 'rid', text: 'Interpretasi ritme keliru: "' + (choice ? choice.label : id) + '" — seharusnya "' + (act ? act.label : actual) + '".', pts: 0, teach: 'Perhatikan keteraturan, lebar QRS, gelombang P, dan hubungan P–QRS.', kind: 'warn' });
    }
    $('#rid').hidden = true;
  }

  /* ---------- H & T ---------- */
  function openHst() {
    $('#hst-grid').innerHTML = A.HT_LIST.map(function (h, i) {
      return '<label class="chk hst-item"><input type="checkbox" value="' + esc(h) + '" id="hst' + i + '"> ' + esc(h) + '</label>';
    }).join('');
    showModal('modal-hst');
  }

  /* ==================================================================
     DEBRIEF
     ================================================================== */
  function showDebrief(res) {
    var sim = st.sim, s = st.scen;
    if (st.raf) cancelAnimationFrame(st.raf);
    hideModal('modal-end'); hideModal('modal-hst');
    var entry = { id: s.id, title: s.title, level: sim.level, score: res.score, grade: res.grade, gradeKey: res.gradeKey, date: new Date().toISOString(), duration: Math.round(res.duration) };
    var hist = load(HIST_KEY, []);
    hist.push(entry);
    if (hist.length > 60) hist = hist.slice(-60);
    save(HIST_KEY, hist);

    var deg = Math.round(res.score * 3.6);
    var h = '';
    h += '<div class="db-head"><div><p class="eyebrow">Debrief · ' + (sim.level === 'mahir' ? 'Mahir' : 'Pemula') + ' · ' + new Date().toLocaleString('id-ID') + '</p>' +
      '<h1>' + esc(s.title) + '</h1>' +
      '<p class="outcome ' + (res.outcome.ok ? 'ok' : 'bad') + '">' + esc(res.outcome.text) + ' <span class="muted small">Durasi skenario ' + fmt(res.duration) + (res.endReason === 'time' ? ' (batas waktu tercapai)' : '') + '.</span></p></div>' +
      '<div class="ring g-' + res.gradeKey + '" style="--deg:' + deg + 'deg"><div><b>' + res.score + '</b><span>/100</span></div></div></div>';
    h += '<div class="db-grade g-' + res.gradeKey + '"><b>' + esc(res.grade) + '</b><span>Skor kriteria ' + res.base + ' − penalti ' + res.penPts + ' = ' + res.score + '</span></div>';
    if (res.critFail.length) {
      h += '<div class="card crit-box"><h2 class="card-title">Tindakan kritis yang terlewat / belum tepat</h2><ul>' + res.critFail.map(function (c) { return '<li><b>' + esc(c.label) + '</b>' + (c.note ? ' — ' + esc(c.note) : '') + '</li>'; }).join('') + '</ul></div>';
    }
    if (res.metrics.length) {
      h += '<h2 class="section-title">Metrik kualitas resusitasi</h2><div class="metrics">' + res.metrics.map(function (m) {
        return '<div class="metric ' + (m.ok === undefined ? '' : m.ok ? 'ok' : 'bad') + '"><span class="muted small">' + esc(m.label) + '</span><b>' + esc(m.value) + '</b>' + (m.target ? '<span class="small">Target ' + esc(m.target) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    h += '<h2 class="section-title">Penilaian per kriteria</h2><div class="table-wrap"><table class="tbl crit"><thead><tr><th></th><th>Kriteria</th><th>Bobot</th><th>Catatan</th></tr></thead><tbody>' +
      res.criteria.map(function (c) {
        var ic = c.frac >= 1 ? '<span class="ic ok">✓</span>' : c.frac > 0 ? '<span class="ic part">◐</span>' : '<span class="ic bad">✗</span>';
        return '<tr><td>' + ic + '</td><td><b>' + esc(c.label) + '</b>' + (c.critical ? ' <span class="tag tag-crit">kritis</span>' : '') + (c.why ? '<small class="why">' + esc(c.why) + '</small>' : '') + '</td><td>' + Math.round(c.w * c.frac * 10) / 10 + '/' + c.w + '</td><td class="small">' + esc(c.note || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (res.pens.length) {
      h += '<h2 class="section-title">Kesalahan & catatan pembelajaran</h2><ul class="pens">' + res.pens.map(function (p) {
        return '<li class="pen pen-' + p.kind + '"><span class="lg-t">' + fmt(p.t) + '</span><div><b>' + esc(p.text) + '</b>' + (p.pts ? ' <span class="pts">−' + p.pts + '</span>' : '') + (p.teach ? '<p>' + esc(p.teach) + '</p>' : '') + '</div></li>';
      }).join('') + '</ul>';
    } else {
      h += '<p class="good-note">Tidak ada kesalahan tindakan yang tercatat. Kerja bagus!</p>';
    }
    h += '<h2 class="section-title">Timeline lengkap</h2><ol class="log log-full">' + res.log.map(function (e) {
      return '<li class="lg lg-' + e.kind + '"><span class="lg-t">' + fmt(e.t) + '</span><span class="lg-x">' + esc(e.text) + (e.teach ? '<small>' + esc(e.teach) + '</small>' : '') + '</span></li>';
    }).join('') + '</ol>';
    h += '<div class="db-actions no-print"><button type="button" class="btn btn-primary" id="db-retry">Ulangi skenario</button><button type="button" class="btn btn-ghost" id="db-home">Pilih skenario lain</button><button type="button" class="btn btn-ghost" id="db-print">Cetak / simpan PDF</button></div>';
    h += '<p class="muted small">Acuan: AHA Guidelines for CPR & ECC 2025. Skor bersifat formatif untuk latihan, bukan penilaian sertifikasi.</p>';
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
  function toast(text, kind) {
    var t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100);
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
      if (prefs.sound) A.Audio.on = { beep: !!prefs.sound.beep, metro: !!prefs.sound.metro, alarm: !!prefs.sound.alarm };
    }
    $$('input[name="level"]').forEach(function (r) { r.checked = r.value === st.level; });
    $('#pref-beep').checked = A.Audio.on.beep; $('#pref-metro').checked = A.Audio.on.metro; $('#pref-alarm').checked = A.Audio.on.alarm;
    function savePrefs() { save(PREF_KEY, { level: st.level, sound: A.Audio.on }); }

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'level') { st.level = t.value; savePrefs(); }
      if (t.id === 'pref-beep') { A.Audio.on.beep = t.checked; savePrefs(); }
      if (t.id === 'pref-metro') { A.Audio.on.metro = t.checked; savePrefs(); }
      if (t.id === 'pref-alarm') { A.Audio.on.alarm = t.checked; savePrefs(); }
      if (t.hasAttribute('data-snd')) { A.Audio.on[t.getAttribute('data-snd')] = t.checked; savePrefs(); }
      if (t.id === 'sel-speed' && st.sim) { st.sim.speed = Number(t.value) || 1; }
      if (t.id === 'sel-energy' && st.sim) { st.sim.setEnergy(Number(t.value)); }
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('button, [data-close]');
      if (!t) return;
      var sim = st.sim;
      if (t.hasAttribute('data-scen')) { openBrief(t.getAttribute('data-scen')); return; }
      if (t.hasAttribute('data-close')) { var m = t.closest('.modal'); if (m) m.hidden = true; return; }
      if (t.id === 'btn-start') { startSim(); return; }
      if (t.id === 'btn-clear-history') { if (window.confirm('Hapus seluruh riwayat latihan di perangkat ini?')) { save(HIST_KEY, []); renderHome(); } return; }
      if (t.id === 'db-retry') { openBrief(st.scen.id); return; }
      if (t.id === 'db-home') { goHome(); return; }
      if (t.id === 'db-print') { window.print(); return; }
      if (!sim || sim.ended) return;
      if (t.hasAttribute('data-tab')) { st.tab = t.getAttribute('data-tab'); buildTabs(); renderActions(); return; }
      if (t.hasAttribute('data-act')) { doAct(t.getAttribute('data-act')); return; }
      if (t.hasAttribute('data-rid')) { answerRid(t.getAttribute('data-rid')); return; }
      if (t.hasAttribute('data-pr')) { sim.paceRate(Number(t.getAttribute('data-pr'))); return; }
      if (t.hasAttribute('data-pm')) { sim.paceMa(Number(t.getAttribute('data-pm'))); return; }
      switch (t.id) {
        case 'btn-pads': sim.attachPads(); break;
        case 'btn-sync': sim.toggleSync(); break;
        case 'btn-charge': sim.charge(); break;
        case 'btn-shock': sim.shock(); break;
        case 'btn-dump': sim.dump(); break;
        case 'btn-pace': sim.togglePace(); break;
        case 'btn-end': showModal('modal-end'); break;
        case 'btn-end-confirm': hideModal('modal-end'); sim.end('manual'); break;
        case 'btn-pause':
          sim.paused = !sim.paused;
          t.textContent = sim.paused ? '▶ Lanjut' : '⏸ Jeda';
          document.body.classList.toggle('sim-paused', sim.paused);
          break;
        case 'btn-ff':
          if (sim.phase === 'arrest' && sim.cpr.on && sim.cpr.cycleStart !== null) sim.advance(Math.max(0, 120 - (sim.t - sim.cpr.cycleStart)));
          else if (sim.phase !== 'arrest') sim.advance(60);
          refresh(true);
          break;
        case 'btn-hst':
          var list = $$('#hst-grid input:checked').map(function (c) { return c.value; });
          hideModal('modal-hst');
          (sim.acts.hst = sim.acts.hst || []).push(sim.t);
          sim.hst(list);
          break;
      }
    });

    document.addEventListener('keydown', function (e) {
      var sim = st.sim;
      if (!sim || sim.ended || !$('#view-sim').classList.contains('is-active')) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (!$('#modal-brief').hidden || !$('#modal-end').hidden || !$('#modal-hst').hidden) return;
      var k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); doAct('cpr'); }
      else if (k === 'r') doAct('rhythm_check');
      else if (k === 'n') doAct('pulse_check');
      else if (k === 'c') sim.charge();
      else if (k === 's') sim.shock();
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (st.mon && st.sim && !st.sim.ended) st.mon.resize(); }, 150);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    renderHome();
  });
})();
