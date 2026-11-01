/* ==========================================================================
   ATLS Simulator — skenario kasus, kriteria penilaian, petunjuk (Pemula),
   serta isi modal briefing tim & SBAR.
   Acuan prinsip: ATLS® Student Course Manual edisi ke-11 (ACS, 2025).
   ========================================================================== */
(function () {
  'use strict';
  var T = window.ATLS;
  var fmt = T.fmt;
  function r(x) { return Math.round(x); }

  function item(label, w, frac, o) {
    o = o || {};
    return { label: label, w: w, frac: typeof frac === 'boolean' ? (frac ? 1 : 0) : (frac || 0), critical: !!o.critical, note: o.note || '', why: o.why || '' };
  }
  function within(t, lim) { return t !== null && t !== undefined && t <= lim; }
  function tScore(t, full, half) { return t === null || t === undefined ? 0 : t <= full ? 1 : t <= half ? 0.5 : 0.25; }
  function at(t) { return t === null || t === undefined ? 'Tidak dilakukan' : 'Pada ' + fmt(t); }

  /* ------------------------------------------------------------------
     Fasilitas
     ------------------------------------------------------------------ */
  var FAC = {
    center: { surgeon: true, surgeonOnSite: true, or: true, blood: true, ct: true, angio: true, neurosurg: true, icu: true, obgyn: true },
    rsudB: { surgeon: true, surgeonOnSite: true, or: true, blood: true, ct: true, angio: false, neurosurg: false, icu: true, obgyn: true, referTo: 'RSUP (trauma center)' },
    rsudC: { surgeon: true, surgeonOnSite: false, or: true, blood: true, ct: false, angio: false, neurosurg: false, icu: false, obgyn: true, referTo: 'RSUD tipe B' },
    puskesmas: { surgeon: false, or: false, blood: false, ct: false, angio: false, neurosurg: false, icu: false, obgyn: false, referTo: 'RSUD (±40 menit)', transferDelay: 300 }
  };
  function fac(base, extra) { var o = {}, k; for (k in FAC[base]) o[k] = FAC[base][k]; for (k in (extra || {})) o[k] = extra[k]; return o; }

  /* ------------------------------------------------------------------
     Kriteria umum
     ------------------------------------------------------------------ */
  function first() {
    var m = null;
    for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; if (v !== null && v !== undefined && (m === null || v < m)) m = v; }
    return m;
  }
  var DISPO_LABEL = { or_lap: 'laparotomi', or_thor: 'torakotomi', angio: 'kontrol perdarahan pelvis', crani: 'kraniotomi', or_cs: 'seksio sesarea', admit: 'rawat ICU/HCU', transfer: 'rujukan' };

  function coreCriteria(S) {
    var out = [], L = S.letters(), sc = S.scen, f = S.fl;
    var keys = ['x', 'a', 'b', 'c', 'd', 'e'];
    var done = keys.filter(function (k) { return L[k] !== null; });
    var ordered = done.length === 6 && L.x <= L.a && L.a <= L.b && L.b <= L.c && L.c <= L.d && L.d <= L.e;
    out.push(item('Primary survey xABCDE lengkap & berurutan', 8, done.length / 6 * 0.6 + (ordered ? 0.4 : 0),
      { note: done.length + '/6 komponen' + (done.length === 6 ? (ordered ? ', berurutan' : ', tidak berurutan') : ''), why: 'Prioritas: perdarahan eksternal masif → jalan napas + servikal → napas → sirkulasi → disabilitas → eksposur. Atasi masalah saat ditemukan sebelum lanjut.' }));
    out.push(item('Monitor & pulse oximetry ≤2 menit', 2, within(S.flags.monAt, 120), { note: at(S.flags.monAt) }));
    if (sc.blunt) {
      var cs = S.firstAct('cspine');
      out.push(item('Restriksi gerak servikal (trauma tumpul)', 4, sc.init.cspine ? 1 : cs !== null && cs <= 180 ? 1 : cs !== null ? 0.5 : 0,
        { note: sc.init.cspine ? 'Sudah terpasang pra-RS' : at(cs), why: 'Anggap ada cedera servikal pada trauma tumpul multipel/di atas klavikula sampai disingkirkan.' }));
    }
    var o2 = first(S.firstAct('o2'), S.firstAct('bvm'), S.flags.rsiAt);
    out.push(item('Oksigen aliran tinggi dini (≤3 menit)', 3, tScore(o2, 180, 360), { note: at(o2) }));
    out.push(item('Akses vaskular (2 IV besar / IO) ≤5 menit', 4, tScore(S.flags.ivAt, 300, 600), { note: at(S.flags.ivAt) }));
    out.push(item('Pemeriksaan lab & crossmatch', 2, S.did('labs')));
    if (sc.hemo) {
      var lim = S.peds ? 20 * S.pt.weight : 1000;
      out.push(item('Kristaloid dibatasi (≤' + r(lim) + ' mL)', 5, f.crystOrd <= lim ? 1 : f.crystOrd <= 2 * lim ? 0.4 : 0,
        { note: r(f.crystOrd) + ' mL', why: 'Resusitasi hemostatik: kristaloid berlebih → koagulopati dilusional, asidosis, hipotermia.' }));
      if (S.fac.blood) {
        var fb = f.firstBlood;
        out.push(item('Produk darah dini pada syok hemoragik', 8, fb === null ? 0 : fb <= (sc.bloodBy || 600) ? 1 : 0.5,
          { critical: !!sc.bloodCritical, note: fb === null ? 'Tidak diberikan' : 'Darah pertama ' + fmt(fb), why: 'Syok kelas III–IV membutuhkan produk darah segera — jangan menunggu kristaloid gagal.' }));
      }
      out.push(item('Asam traneksamat ≤3 jam sejak cedera', 5, !!S.flags.txa && S.flags.txaInjury <= 10800,
        { note: S.flags.txa ? fmt(S.flags.txaInjury) + ' sejak cedera' : 'Tidak diberikan', why: 'TXA 1 g dalam 10 menit lalu 1 g/8 jam menurunkan kematian akibat perdarahan bila ≤3 jam.' }));
      if (f.prbc >= 4 && !S.peds) {
        out.push(item('Kalsium saat transfusi masif', 2, !!S.flags.calcium));
        out.push(item('Rasio plasma : PRC seimbang (≥1:2)', 3, f.ffp >= f.prbc * 0.5, { note: f.ffp + ' FFP : ' + f.prbc + ' PRC' }));
      }
    }
    out.push(item('Cegah hipotermia (eksposur → selimut/cairan hangat)', 5, (S.st.exposed ? 0.3 : 0) + (S.st.warmed ? 0.4 : 0) + (S.min.temp >= 35.5 ? 0.3 : 0),
      { note: 'Suhu terendah ' + S.min.temp.toFixed(1) + ' °C', why: 'Hipotermia memperburuk koagulopati (trias letal: hipotermia, asidosis, koagulopati).' }));
    var adj = [S.did('efast'), S.did('cxr')].concat(sc.blunt ? [S.did('pxr')] : []);
    out.push(item('Adjuvan primary survey (eFAST, foto toraks' + (sc.blunt ? ', foto pelvis' : '') + ')', 4, adj.filter(Boolean).length / adj.length));
    var fixT = []; for (var k in S.fix) fixT.push(S.fix[k]);
    var f0 = fixT.length ? Math.min.apply(null, fixT) : null;
    out.push(item('Reevaluasi setelah intervensi', 3, f0 === null ? S.did('reassess') : S.didAfter('reassess', f0), { why: 'Setiap intervensi diikuti penilaian ulang ABCDE — kenali respons cepat/sementara/tanpa respons.' }));
    out.push(item('Tidak mengirim pasien tidak stabil ke CT', 6, !S.penCount.ct_unstable, { critical: true }));
    var stableEnd = !S.unstable(), dk = S.flags.dispo ? S.flags.dispo.kind : '';
    var toOR = ['or_lap', 'or_thor', 'angio', 'or_cs', 'crani'].indexOf(dk) >= 0;
    if (sc.secondary !== false && (S.did('secondary') || (stableEnd && !toOR))) {
      out.push(item('Survei sekunder setelah pasien stabil', 3, S.did('secondary') ? (S.penCount.secondary_early ? 0.5 : 1) : 0));
    }
    var truth = sc.injuries || [];
    if (truth.length) {
      var dx = S.dx || [];
      var hit = dx.filter(function (x) { return truth.indexOf(x) >= 0; }).length, wrong = dx.length - hit;
      out.push(item('Diagnosis kerja cedera mengancam nyawa', 6, Math.max(0, (hit - 0.5 * wrong) / truth.length),
        { note: S.dx ? hit + '/' + truth.length + ' tepat' + (wrong ? ', ' + wrong + ' tidak sesuai' : '') : 'Tidak ditetapkan',
          why: 'Jawaban: ' + truth.map(function (id) { return T.INJ_BY_ID[id].label; }).join(', ') + '.' }));
    }
    out.push(item('Briefing tim & pembagian peran', 2, S.brief ? S.brief.frac : 0, { note: S.brief ? Math.round(S.brief.frac * 100) + '%' : 'Tidak dilakukan' }));
    var d = S.flags.dispo, okK = sc.definitive || [];
    var good = d && okK.indexOf(d.kind) >= 0;
    out.push(item('Tata laksana definitif / rujukan tepat & tepat waktu', 10, good ? (d.t <= (sc.dispoBy || 1200) ? 1 : 0.5) : 0,
      { critical: true, note: d ? d.label + ' — ' + fmt(d.t) : 'Belum diputuskan', why: 'Target: ' + okK.map(function (k) { return DISPO_LABEL[k]; }).join(' / ') + ' dalam ≤' + fmt(sc.dispoBy || 1200) + '.' }));
    if (d && d.kind === 'transfer') out.push(item('Rujukan terstruktur (SBAR, dokter-ke-dokter, pendamping)', 5, S.sbar ? S.sbar.frac : 0, { note: S.sbar ? Math.round(S.sbar.frac * 100) + '%' : '' }));
    out.push(item('Pasien hidup sampai akhir skenario', 10, S.phase === 'alive', { critical: true, note: S.arr.episodes ? 'Henti jantung ' + S.arr.episodes + '×' : '' }));
    return out;
  }

  T.criteriaFor = function (S) {
    var extra = S.scen.extra ? S.scen.extra(S) : [];
    return extra.concat(coreCriteria(S));
  };

  T.outcomeFor = function (S) {
    if (S.phase === 'dead') return { ok: false, text: 'Pasien meninggal — henti jantung traumatik (' + S.arr.cause + ') tidak teratasi.' };
    if (S.phase === 'arrest') return { ok: false, text: 'Skenario berakhir saat pasien dalam henti jantung.' };
    var d = S.flags.dispo;
    if (S.endReason === 'dispo' && d) return { ok: true, text: 'Pasien hidup dan diberangkatkan: ' + d.label + '.' };
    if (d) return { ok: !S.unstable(), text: 'Pasien hidup; disposisi diputuskan (' + d.label + ') tetapi belum berangkat.' };
    return S.unstable() ? { ok: false, text: 'Pasien hidup tetapi masih tidak stabil dan tata laksana definitif belum diputuskan.' }
      : { ok: true, text: 'Pasien hidup dan relatif stabil, namun disposisi belum diputuskan.' };
  };

  /* ------------------------------------------------------------------
     Petunjuk (mode Pemula) — mengikuti prioritas xABCDE
     ------------------------------------------------------------------ */
  function hint(S) {
    var p = S.p, st = S.st, L = S.letters(), sc = S.scen, f = S.fl;
    if (S.phase === 'arrest') {
      if (!S.ventilated()) return 'HENTI JANTUNG TRAUMATIK: oksigenasi & ventilasi segera (BVM atau intubasi).';
      if (p.tension && !p.tension.relieved && !p.tension.tube) return 'Henti jantung traumatik: dekompresi dada (bilateral bila ragu) — torakostomi jari/jarum.';
      if (p.tamp && p.tamp.s > 0.4) return 'Curiga tamponade: perikardiosentesis segera (atau torakotomi oleh ahli bedah).';
      if (S.frac > 0.35) return 'Hipovolemia: kendalikan perdarahan + transfusi darah/MTP secepatnya (pelvic binder bila fraktur pelvis).';
      return 'Atasi penyebab reversibel (hipoksia, hipovolemia, tension, tamponade); kompresi dada bila sumber daya memungkinkan.';
    }
    if (sc.hintPre) { var hp = sc.hintPre(S); if (hp) return hp; }
    if (L.x === null) return 'Mulai primary survey: X — cari & kendalikan perdarahan eksternal masif (tombol X).';
    var x = p.ext;
    if (x && (x.ctrl || 0) < 1) {
      if (x.site === 'limb') return 'Perdarahan ekstremitas masif: pasang TOURNIQUET proksimal luka sekarang.';
      if ((x.ctrl || 0) < 0.6) return 'Tekan langsung / wound packing pada sumber perdarahan eksternal.';
    }
    if (!st.monitor) return 'Pasang monitor (EKG, SpO₂, TD) — anggota tim mengerjakannya paralel.';
    if (L.a === null) return 'A — nilai jalan napas sambil melindungi tulang servikal.';
    if (sc.blunt && !st.cspine) return 'Trauma tumpul berenergi tinggi: pasang restriksi gerak servikal (MILS + collar).';
    var a = p.airway;
    if (a && !S.secured() && S.airwaySev() > 0.1) {
      if (S.flags.ettFailed !== undefined) return 'Intubasi gagal (CICO) — lakukan krikotiroidotomi ' + (S.peds && S.pt.age < 12 ? 'JARUM' : 'BEDAH') + ' sekarang.';
      if (a.type === 'blood' && a.sev > 0.3) return 'Darah di orofaring: suction rigid + jaw thrust SEKARANG.';
      if (a.type === 'gcs' && !st.jaw && st.airway === 'native') return 'Lidah jatuh: jaw thrust / OPA sementara.';
      return a.type === 'edema' ? 'Tanda cedera inhalasi — intubasi DINI sebelum edema menutup jalan napas.' : 'Jalan napas tidak aman — pasang jalan napas definitif (RSI dengan MILS).';
    }
    if (!S.secured() && S.gcs().total <= 8) return 'GCS ≤8 — pasang jalan napas definitif (RSI dengan MILS).';
    if (!st.o2 && !S.ventilated()) return 'Berikan O₂ aliran tinggi via NRM 10–15 L/menit.';
    if (L.b === null) return 'B — nilai napas & ventilasi: inspeksi, trakea, auskultasi, perkusi.';
    var tn = p.tension;
    if (tn && !tn.tube) {
      if (!tn.relieved && tn.s > 0.15) return tn.needleTried ? 'Dekompresi jarum gagal — lakukan torakostomi jari ' + tn.side + '.' : 'Tension pneumothorax ' + tn.side + ': dekompresi SEGERA (jarum/torakostomi jari) — jangan menunggu foto toraks.';
      if (tn.relieved) return 'Dekompresi berhasil — pasang chest tube ' + tn.side + '.';
    }
    if (p.open && !p.open.sealed) return 'Open pneumothorax: tutup luka dengan balut oklusif 3 sisi / vented chest seal.';
    if (p.open && !p.open.tube) return 'Pasang chest tube ' + p.open.side + ' (jauh dari luka).';
    if (p.htx && !p.htx.tube && p.htx.vol > 400) return 'Hemotoraks ' + p.htx.side + ': pasang chest tube 28–32 Fr sekarang.';
    if (p.flail && !p.flail.analg && S.access()) return 'Flail chest: analgesia adekuat untuk memperbaiki ventilasi.';
    if (L.c === null) return 'C — nilai sirkulasi: nadi, kulit, CRT, vena leher; cari sumber perdarahan (dada, abdomen, pelvis, femur, eksternal).';
    if (!S.access()) return S.flags.ivFailed !== undefined ? 'IV gagal — pasang akses intraoseus (IO) sekarang.' : 'Pasang 2 jalur IV besar (atau IO) + ambil sampel darah/crossmatch.';
    if (p.pelvis && S.flags.binder === undefined) return 'Fraktur pelvis tidak stabil: pasang pelvic binder setinggi trokanter mayor.';
    if (p.tamp && p.tamp.s > 0.25 && !S.did('efast')) return 'Hipotensi + vena leher distensi: lakukan eFAST (cari efusi perikard).';
    if (p.tamp && !p.tamp.definitive) {
      if (!S.flags.dispo) return 'Tamponade: hubungi ahli bedah & putuskan torakotomi/pericardial window segera.';
      if (p.tamp.s > 0.45) return 'Tamponade memburuk sebelum OK siap — perikardiosentesis sebagai jembatan.';
    }
    var shock = S.frac > 0.2 || S.v.sbp < (S.peds ? 70 + 2 * S.pt.age : 90);
    if (sc.hemo && shock) {
      if (S.fac.blood && f.firstBlood === null) return S.peds ? 'Syok hemoragik anak: kristaloid maks 20 mL/kg, lalu PRC 10–20 mL/kg.' : 'Syok hemoragik: berikan produk darah (PRC) — jangan menunggu kristaloid gagal.';
      if (!S.flags.txa) return 'Berikan asam traneksamat (≤3 jam sejak cedera).';
      if (S.fac.blood && S.frac > 0.33 && !S.flags.mtp) return 'Perdarahan masif: aktifkan protokol transfusi masif (1:1:1).';
      if (!S.fac.blood && f.crystOrd < 1000) return 'Tanpa darah: kristaloid hangat maks 1 L, kendalikan perdarahan, rujuk segera.';
    }
    if (sc.hemo && !S.flags.txa && S.hemorrhagic()) return 'Berikan asam traneksamat (≤3 jam sejak cedera).';
    if (f.prbc >= 4 && !S.flags.calcium && !S.peds) return 'Transfusi masif: berikan kalsium & pantau Ca²⁺ terionisasi.';
    if (p.femur && !p.femur.ctrl && !p.betaBlock) return 'Fraktur femur: pasang bidai traksi.';
    if (L.d === null) return 'D — nilai GCS, pupil & tanda lateralisasi; cek gula darah.';
    var tb = p.tbi;
    if (tb && !tb.evacuated && tb.icp >= 0.58 && S.count('hyperosm') === 0) return 'Tanda herniasi (anisokor): terapi hiperosmolar (NaCl 3%/mannitol), elevasi kepala 30°, hubungi bedah saraf.';
    if (p.neuro) {
      if (!S.did('efast')) return 'Hipotensi + bradikardia: singkirkan perdarahan dulu (eFAST, foto toraks & pelvis).';
      if (!S.flags.pressor) return 'Syok neurogenik: kristaloid secukupnya lalu vasopresor (norepinefrin).';
      if (S.v.hr < 50 && !(S.flags.atropineUntil > S.t)) return 'Bradikardia simtomatik: atropin 0,5–1 mg IV.';
    }
    if (L.e === null) return 'E — buka seluruh pakaian, periksa seluruh tubuh, lalu cegah hipotermia.';
    if (!st.warmed) return 'Cegah hipotermia: selimut hangat + cairan/darah hangat.';
    if (!S.did('efast')) return 'Adjuvan: eFAST.';
    if (!S.did('labs')) return 'Lab: darah lengkap, crossmatch, AGD/laktat/BD (β-hCG pada perempuan usia subur).';
    if (!S.did('cxr')) return 'Adjuvan: foto toraks AP.';
    if (sc.blunt && !S.did('pxr')) return 'Adjuvan: foto pelvis AP.';
    if (!S.dx) return 'Tetapkan diagnosis kerja (tab Primary survey → Diagnosis kerja).';
    if (sc.hintLate) { var hl = sc.hintLate(S); if (hl) return hl; }
    if (!S.flags.dispo) return sc.dispoHint || 'Putuskan tata laksana definitif / rujukan.';
    var fixT = []; for (var k in S.fix) fixT.push(S.fix[k]);
    if (fixT.length && !S.didAfter('reassess', Math.max.apply(null, fixT))) return 'Reevaluasi ABCDE setelah intervensi terakhir.';
    if (!S.unstable() && !S.did('secondary') && sc.secondary !== false) return 'Pasien relatif stabil — survei sekunder (AMPLE + head-to-toe) sambil menunggu disposisi.';
    return 'Lanjutkan pemantauan & resusitasi sampai pasien berangkat / diserahterimakan.';
  }

  /* ==================================================================
     SKENARIO
     ================================================================== */
  var LIST = [];

  /* 1. Tension pneumothorax ------------------------------------------- */
  LIST.push({
    id: 'tension', cat: 'thorax', badge: 'Toraks', title: 'Tension pneumothorax pasca-KLL', diff: 'Dasar', est: '8–12 menit',
    setting: 'IGD RSUD tipe B — dokter bedah on-site, OK, bank darah, CT scan.',
    facility: fac('rsudB'),
    mist: { M: 'Pengendara motor ditabrak mobil dari samping ±25 menit lalu, dada kanan membentur trotoar.', I: 'Nyeri dada kanan, sesak makin berat.', S: 'N 110, TD 118/76, RR 30, SpO₂ 90% (udara bebas).', T: 'Collar servikal, O₂ kanul 4 L/mnt.' },
    stem: 'Laki-laki 28 tahun, pengendara motor ditabrak mobil. Tiba dengan collar servikal, gelisah, sesak, memegangi dada kanan.',
    objectives: ['Primary survey xABCDE berurutan', 'Kenali tension pneumothorax secara KLINIS — dekompresi tanpa menunggu foto toraks', 'Chest tube setelah dekompresi', 'Hindari ventilasi tekanan positif sebelum dekompresi'],
    blunt: true,
    init: { age: 28, sex: 'L', weight: 70, hr0: 86, sbp0: 124, dbp0: 78, rr0: 18, spo2: 97, temp: 36.5, gcs: [4, 5, 6], loss: 350, injuryAgo: 1500, cspine: true, gds: 118, hb: 14.5 },
    problems: { tension: { side: 'kanan', s: 0.55, grow: 0.05 } },
    injuries: ['tension'], definitive: ['admit'], dispoBy: 1500,
    dispoHint: 'Pasien stabil setelah chest tube — rawat ICU/HCU bedah (CT bila perlu setelah stabil).',
    find: {
      e: 'Jejas & krepitasi dinding dada kanan anterolateral, abrasi bahu & lengan kanan. Tidak ada luka lain.',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: makan 3 jam lalu. E: ditabrak mobil dari samping, terlempar ±3 m.',
      secondary: 'Nyeri tekan kosta 4–6 kanan (curiga fraktur), abrasi ekstremitas atas kanan. Tidak ada defisit neurologis. Pelvis & ekstremitas bawah normal.',
      ct: 'CT toraks: chest tube kanan in situ, pneumotoraks residual minimal, fraktur kosta 4–6 kanan, kontusio paru ringan. CT kepala, servikal & abdomen normal.'
    },
    extra: function (S) {
      var b = S.firstAct('b_assess'), fx = S.fix.tension;
      return [
        item('Dekompresi tension ≤3 menit sejak B dinilai', 14, fx === undefined ? 0 : b !== null && fx - b <= 180 ? 1 : 0.5, { critical: true, note: at(fx), why: 'Tension pneumothorax menyebabkan syok obstruktif yang cepat fatal; diagnosis klinis.' }),
        item('Tidak menunggu foto toraks untuk tension', 6, !S.penCount.cxr_tension),
        item('Chest tube setelah dekompresi', 8, !!S.p.tension.tube, { note: S.p.tension.tube ? '' : 'Belum dipasang' }),
        item('Dekompresi pada sisi yang benar', 4, !S.penCount.needle_wrong && !S.penCount.finger_wrong)
      ];
    },
    timeLimit: 1800
  });

  /* 2. Hemotoraks masif ----------------------------------------------- */
  LIST.push({
    id: 'mhtx', cat: 'thorax', badge: 'Toraks', title: 'Hemotoraks masif — luka tusuk dada', diff: 'Menengah', est: '10–15 menit',
    setting: 'IGD RSUD tipe B — dokter bedah on-site, OK siap, bank darah dengan protokol transfusi masif.',
    facility: fac('rsudB'),
    mist: { M: 'Luka tusuk pisau dada kiri ±20 menit lalu (perkelahian).', I: 'Luka tusuk 2 cm di ICS 5 linea aksilaris anterior kiri.', S: 'N 124, TD 98/64, RR 28, SpO₂ 91%.', T: 'Kasa tekan, O₂ NRM.' },
    stem: 'Laki-laki 32 tahun, luka tusuk dada kiri. Pucat, sesak, gelisah, kulit dingin.',
    objectives: ['Kenali hemotoraks masif: redup, suara napas hilang, vena leher kolaps, syok', 'Chest tube 28–32 Fr segera', 'Output awal ≥1.500 mL atau >200 mL/jam → torakotomi', 'Resusitasi hemostatik: darah dini, MTP, TXA, batasi kristaloid'],
    blunt: false, hemo: true, bloodCritical: true, bloodBy: 600,
    init: { age: 32, sex: 'L', weight: 65, hr0: 84, sbp0: 122, dbp0: 78, rr0: 18, spo2: 97, temp: 36.3, gcs: [4, 5, 6], loss: 1750, injuryAgo: 1200, gds: 126, hb: 14.2 },
    problems: { htx: { side: 'kiri', vol: 1550, rate: 50, tube: false, out: 0 } },
    injuries: ['massive_htx'], definitive: ['or_thor'], dispoBy: 1200,
    dispoHint: 'Output WSD ≥1.500 mL → torakotomi di OK (lanjutkan resusitasi hemostatik).',
    find: {
      x: 'Luka tusuk kecil dada kiri, perdarahan eksternal minimal.',
      e: 'Luka tusuk 2 cm ICS 5 linea aksilaris anterior kiri. Tidak ada luka lain di bagian depan.',
      back: 'Punggung: tidak ada luka tusuk tambahan.',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: 4 jam lalu. E: ditusuk pisau ±15 cm.',
      secondary: 'Tidak ada luka tambahan. Abdomen supel.',
      ct: 'CT toraks: hemotoraks kiri dengan ekstravasasi kontras aktif dari arteri interkostal & laserasi lobus inferior kiri.'
    },
    extra: function (S) {
      var tube = S.fix.htx, d = S.flags.dispo;
      return [
        item('Chest tube kiri ≤6 menit', 12, tube === undefined ? 0 : tube <= 360 ? 1 : 0.5, { critical: true, note: at(tube) }),
        item('Mengenali indikasi torakotomi dari output WSD', 8, d && d.kind === 'or_thor' ? (tube !== undefined && d.t >= tube ? 1 : 0.5) : 0, { why: 'Output awal ≥1.500 mL, atau >200 mL/jam selama 2–4 jam, atau butuh transfusi berulang → torakotomi.' }),
        item('Aktivasi protokol transfusi masif', 5, !!S.flags.mtp),
        item('Tidak dekompresi jarum tanpa tension', 3, !S.penCount.needle_wrong)
      ];
    },
    timeLimit: 1800
  });

  /* 3. Tamponade ------------------------------------------------------- */
  LIST.push({
    id: 'tamponade', cat: 'thorax', badge: 'Toraks', title: 'Tamponade jantung — luka tusuk prekordial', diff: 'Lanjut', est: '10–15 menit',
    setting: 'IGD RSUD tipe C — dokter bedah on-call perlu ±12 menit untuk tiba & menyiapkan OK; bank darah terbatas; tidak ada CT.',
    facility: fac('rsudC', { orDelay: 720 }), pericardioOk: true,
    mist: { M: 'Luka tusuk obeng di dada kiri ±15 menit lalu.', I: 'Luka tusuk 1,5 cm parasternal kiri ICS 4.', S: 'N 112, TD 100/80, RR 24, SpO₂ 96%.', T: 'Kasa tekan, O₂.' },
    stem: 'Laki-laki 24 tahun, luka tusuk di parasternal kiri ICS 4 (zona "kotak" prekordial). Gelisah, pucat, vena leher menonjol.',
    objectives: ['Kenali trias Beck & pulsus paradoksus', 'eFAST untuk efusi perikard', 'Hubungi ahli bedah segera — terapi definitif torakotomi/pericardial window', 'Perikardiosentesis sebagai jembatan bila memburuk sebelum OK siap'],
    blunt: false, hemo: false,
    init: { age: 24, sex: 'L', weight: 60, hr0: 88, sbp0: 120, dbp0: 76, rr0: 20, spo2: 97, temp: 36.6, gcs: [4, 5, 6], loss: 400, injuryAgo: 900, gds: 110, hb: 14 },
    problems: { tamp: { s: 0.5, grow: 0.035, regrow: 0.045 } },
    injuries: ['tamponade'], definitive: ['or_thor'], dispoBy: 600,
    find: {
      x: 'Luka tusuk kecil prekordial, perdarahan eksternal minimal.',
      e: 'Luka tusuk 1,5 cm parasternal kiri ICS 4. Tidak ada luka lain.',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: 2 jam lalu. E: ditusuk obeng.',
      secondary: 'Tidak ada cedera tambahan.',
      ecg: 'voltase rendah'
    },
    extra: function (S) {
      var ef = S.firstAct('efast'), d = S.flags.dispo, pc = S.fix.tamp;
      return [
        item('eFAST ≤5 menit (efusi perikard)', 8, tScore(ef, 300, 480), { note: at(ef) }),
        item('Keputusan torakotomi/pericardial window ≤10 menit', 10, d && d.kind === 'or_thor' ? (d.t <= 600 ? 1 : 0.5) : 0, { critical: true, note: d ? fmt(d.t) : 'Tidak diputuskan' }),
        item('Perikardiosentesis sebagai jembatan saat memburuk', 8, pc !== undefined ? 1 : S.min.sbp >= 75 ? 1 : 0, { note: pc !== undefined ? at(pc) : S.min.sbp >= 75 ? 'Tidak diperlukan (hemodinamik terjaga)' : 'Tidak dilakukan meski hipotensi berat', why: 'Bila ahli bedah belum tersedia dan pasien memburuk, aspirasi perikard dapat menyelamatkan nyawa sementara.' })
      ];
    },
    timeLimit: 1800
  });

  /* 4. Open pneumothorax ---------------------------------------------- */
  LIST.push({
    id: 'open_ptx', cat: 'thorax', badge: 'Toraks', title: 'Open pneumothorax — luka terbuka dinding dada', diff: 'Dasar', est: '8–12 menit',
    setting: 'IGD RSUD tipe B — dokter bedah on-site, OK, bank darah, CT.',
    facility: fac('rsudB'),
    mist: { M: 'Pekerja bangunan jatuh dari lantai 2 (±4 m) menimpa besi beton ±25 menit lalu.', I: 'Luka terbuka dada kanan, sesak.', S: 'N 104, TD 128/80, RR 32, SpO₂ 86%.', T: 'Kasa ditempel di luka.' },
    stem: 'Laki-laki 40 tahun, jatuh dari ketinggian menimpa besi. Luka dada kanan berbunyi saat bernapas, sesak berat.',
    objectives: ['Kenali open pneumothorax ("sucking chest wound")', 'Balut 3 sisi / vented chest seal — bukan balut rapat 4 sisi', 'Chest tube di lokasi jauh dari luka', 'Restriksi servikal pada jatuh dari ketinggian'],
    blunt: true,
    init: { age: 40, sex: 'L', weight: 75, hr0: 90, sbp0: 130, dbp0: 82, rr0: 18, spo2: 97, temp: 36.4, gcs: [4, 5, 6], loss: 500, injuryAgo: 1500, cspine: false, gds: 132, hb: 14.8 },
    problems: { open: { side: 'kanan', sealed: false }, htx: { side: 'kanan', vol: 250, rate: 3, tube: false, out: 0 } },
    injuries: ['open_ptx'], definitive: ['admit'], dispoBy: 1500,
    dispoHint: 'Stabil setelah balut & chest tube — rawat ICU/HCU bedah untuk debridemen & penutupan luka.',
    find: {
      x: 'Luka dada kanan merembes darah, tidak menyembur.',
      e: 'Luka terbuka ±4 cm ICS 6 linea midaksila kanan; abrasi punggung & lengan kanan.',
      back: 'Punggung: jejas regio skapula kanan, tidak ada step-off.',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: 3 jam lalu. E: jatuh ±4 m menimpa besi beton.',
      secondary: 'Fraktur kosta 6–7 kanan. Tidak ada cedera kepala atau abdomen.',
      ct: 'CT toraks: chest tube kanan in situ, kontusio paru kanan ringan, fraktur kosta 6–7. CT servikal & abdomen normal.'
    },
    onTick: function (S, dt) {
      var o = S.p.open;
      if (!o) return;
      o.fat = Math.max(0, Math.min(20, (o.fat || 0) + (o.sealed || o.tube ? -0.8 : 0.8) * dt / 60));
      S.pt.spo2b = 97 - o.fat * 0.6;
    },
    extra: function (S) {
      var b = S.firstAct('b_assess'), fx = S.fix.open;
      return [
        item('Balut oklusif ≤3 menit sejak B dinilai', 12, fx === undefined ? 0 : b !== null && fx - b <= 180 ? 1 : 0.5, { critical: true, note: at(fx) }),
        item('Bukan balut rapat 4 sisi', 6, !S.penCount.seal4, { why: 'Balut kedap 4 sisi dapat menimbulkan tension pneumothorax.' }),
        item('Chest tube kanan (jauh dari luka)', 8, !!S.p.open.tube)
      ];
    },
    timeLimit: 1800
  });

  /* 5. Fraktur pelvis --------------------------------------------------- */
  LIST.push({
    id: 'pelvis', cat: 'hemo', badge: 'Syok', title: 'Fraktur pelvis tidak stabil', diff: 'Menengah', est: '10–15 menit',
    setting: 'IGD RSUD tipe B — bedah & ortopedi on-site, OK (preperitoneal packing + fiksasi eksterna), bank darah/MTP, CT. Tidak ada angiografi.',
    facility: fac('rsudB', { angio: true }),
    mist: { M: 'Pengendara motor menabrak truk ±35 menit lalu, terlempar.', I: 'Nyeri panggul hebat, tidak bisa menggerakkan tungkai.', S: 'N 120, TD 104/70, RR 24, SpO₂ 96%.', T: 'Collar servikal, papan spinal, infus RL 500 mL.' },
    stem: 'Laki-laki 45 tahun, pengendara motor menabrak truk. Nyeri panggul hebat, pucat, gelisah. Kristaloid 500 mL sudah masuk pra-RS.',
    objectives: ['Kenali syok kelas III dengan sumber perdarahan pelvis (eFAST negatif)', 'Pelvic binder setinggi trokanter mayor segera; jangan ulang kompresi pelvis', 'Darah dini, MTP, TXA, kalsium', 'Jangan pasang kateter bila darah di meatus', 'Kontrol perdarahan pelvis definitif (bukan laparotomi)'],
    blunt: true, hemo: true, bloodCritical: true, bloodBy: 600,
    init: { age: 45, sex: 'L', weight: 70, hr0: 84, sbp0: 126, dbp0: 80, rr0: 18, spo2: 97, temp: 35.9, gcs: [4, 5, 6], loss: 1750, injuryAgo: 2100, cspine: true, gds: 140, hb: 13.8 },
    problems: { pelvis: { rate: 45, ctrl: 0 }, urethral: true },
    injuries: ['pelvis', 'urethra'], definitive: ['angio'], dispoBy: 1500,
    dispoHint: 'eFAST negatif + pelvis tidak stabil → kontrol perdarahan pelvis di OK (preperitoneal packing/fiksasi eksterna).',
    find: {
      e: 'Jejas & hematoma regio pelvis dan suprapubik, skrotum bengkak; abrasi luas tungkai kanan.',
      back: 'Punggung: jejas regio lumbosakral kanan, tidak ada step-off.',
      abdoNeg: 'agak tegang di suprapubik, tanpa defans muskular',
      ample: 'A: penisilin. M: tidak ada. P: sehat. L: 2 jam lalu. E: menabrak truk dengan kecepatan tinggi.',
      secondary: 'Fraktur pelvis tidak stabil, cedera uretra posterior dicurigai. Tidak ada cedera kepala.',
      ct: 'Fraktur pelvis APC-III dengan hematoma retroperitoneal besar dan blush kontras arteri iliaka interna kanan; tanpa cedera organ solid.'
    },
    extra: function (S) {
      var c = S.firstAct('c_assess'), bd = S.flags.binder;
      return [
        item('Pelvic binder ≤6 menit', 12, bd === undefined ? 0 : bd <= 360 ? 1 : 0.5, { critical: true, note: at(bd) }),
        item('Tidak memasang kateter urin (darah di meatus)', 8, !S.penCount.foley_urethral, { critical: true }),
        item('eFAST untuk menyingkirkan perdarahan intraperitoneal', 4, S.did('efast')),
        item('Tidak melakukan laparotomi non-terapeutik', 4, !S.penCount.dispo_wrong)
      ].concat(c === null ? [] : []);
    },
    timeLimit: 2100
  });

  /* 6. Perdarahan intraabdomen ----------------------------------------- */
  LIST.push({
    id: 'abdo', cat: 'hemo', badge: 'Syok', title: 'Perdarahan intraabdomen — transient responder', diff: 'Menengah', est: '10–15 menit',
    setting: 'IGD RSUD tipe B — dokter bedah on-site, OK siap, bank darah, CT.',
    facility: fac('rsudB'),
    mist: { M: 'Pengendara motor jatuh, perut kiri atas membentur stang ±30 menit lalu.', I: 'Nyeri perut kiri atas & bahu kiri.', S: 'N 128, TD 96/68, RR 24.', T: 'Tidak ada.' },
    stem: 'Perempuan 30 tahun, jatuh dari motor, perut kiri atas membentur stang. Nyeri perut & bahu kiri, pucat, haus.',
    objectives: ['Kenali syok kelas III & sumber perdarahan intraabdomen (eFAST +)', 'Darah dini, TXA, kristaloid terbatas', 'Kenali respons sementara terhadap resusitasi', 'JANGAN kirim pasien tidak stabil ke CT — laparotomi segera'],
    blunt: true, hemo: true, bloodCritical: true, bloodBy: 600,
    init: { age: 30, sex: 'P', weight: 55, hr0: 86, sbp0: 116, dbp0: 74, rr0: 18, spo2: 98, temp: 36.2, gcs: [4, 5, 6], loss: 1400, injuryAgo: 1800, cspine: false, gds: 120, hb: 12.8 },
    problems: { abdo: { rate: 38, ctrl: 0 } },
    injuries: ['abdo_bleed'], definitive: ['or_lap'], dispoBy: 1200,
    dispoHint: 'eFAST (+) dengan syok yang tidak stabil → laparotomi emergensi.',
    find: {
      abdo: 'Abdomen sedikit distensi, jejas & nyeri tekan kuadran kiri atas, defans muskular, nyeri alih ke bahu kiri (tanda Kehr).',
      fastAbd: 'cairan bebas (+) di splenorenal (LUQ), Morison pouch & kavum Douglas',
      e: 'Jejas di kuadran kiri atas abdomen & lengan kiri. Tidak ada luka lain.',
      ample: 'A: tidak ada. M: pil KB. P: sehat. L: 1 jam lalu. E: jatuh dari motor ±40 km/jam.',
      secondary: 'Tidak ada cedera tambahan bermakna.',
      ct: 'Laserasi limpa grade IV dengan blush kontras aktif; hemoperitoneum sedang-banyak.'
    },
    extra: function (S) {
      var ef = S.firstAct('efast');
      return [
        item('eFAST ≤6 menit', 6, tScore(ef, 360, 600), { note: at(ef) }),
        item('Hubungi dokter bedah dini (≤5 menit)', 4, tScore(S.flags.surgeon, 300, 600), { note: at(S.flags.surgeon) })
      ];
    },
    timeLimit: 1800
  });

  /* 7. Perdarahan ekstremitas di Puskesmas ----------------------------- */
  LIST.push({
    id: 'ext_bleed', cat: 'hemo', badge: 'Syok', title: 'Perdarahan ekstremitas masif di Puskesmas', diff: 'Dasar', est: '8–12 menit',
    setting: 'IGD Puskesmas rawat inap — tanpa dokter bedah, bank darah, maupun CT. RSUD rujukan ±40 menit dengan ambulans.',
    facility: fac('puskesmas'),
    mist: { M: 'Paha kanan tersayat mesin pemotong rumput ±10 menit lalu.', I: 'Luka robek paha kanan, darah menyembur.', S: 'Pucat, berkeringat.', T: 'Kain diikat longgar di paha oleh warga.' },
    stem: 'Laki-laki 35 tahun dibawa warga dengan kain terikat longgar di paha kanan yang basah darah. Darah merah terang menyembur dari luka.',
    objectives: ['xABCDE: kendalikan perdarahan masif SEBELUM airway', 'Tourniquet 5–7 cm proksimal luka; catat jam; jangan dilonggarkan', 'Kristaloid terbatas (maks 1 L) & TXA tanpa bank darah', 'Rujuk dini dengan komunikasi SBAR & pendamping'],
    blunt: false, hemo: true, sets: ['tq'],
    init: { age: 35, sex: 'L', weight: 70, hr0: 84, sbp0: 124, dbp0: 80, rr0: 18, spo2: 98, temp: 36.4, gcs: [4, 5, 6], loss: 1100, injuryAgo: 600, gds: 105, hb: 14.5 },
    problems: { ext: { rate: 150, site: 'limb', where: 'paha kanan', desc: 'Luka robek 12 cm paha kanan bagian medial, darah merah terang MENYEMBUR pulsatil; kain di paha basah kuyup', ctrl: 0 } },
    injuries: ['ext_bleed'], definitive: ['transfer'], dispoBy: 1200,
    dispoHint: 'Puskesmas tidak memiliki darah & bedah vaskular — rujuk sekarang (tab Definitif → Rujuk/SBAR).',
    find: {
      e: 'Luka robek 12 cm paha kanan medial (curiga cedera arteri femoralis superfisialis). Tidak ada luka lain.',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: 1 jam lalu. E: tersayat pisau mesin pemotong rumput.',
      secondary: 'Distal tourniquet: kaki kanan pucat, nadi dorsalis pedis tidak teraba (diharapkan). Tidak ada cedera lain.'
    },
    extra: function (S) {
      var tq = S.flags.tqAt, L = S.letters();
      return [
        item('Tourniquet ≤90 detik', 14, tq === undefined ? 0 : tq <= 90 ? 1 : tq <= 180 ? 0.5 : 0.25, { critical: true, note: at(tq), why: 'Perdarahan arteri ekstremitas dapat fatal dalam beberapa menit — X sebelum A.' }),
        item('X dinilai pertama (sebelum A)', 6, L.x !== null && (L.a === null || L.x <= L.a)),
        item('Tourniquet tidak dilonggarkan', 6, !S.penCount.tq_loosen),
        item('Rujukan diputuskan ≤15 menit', 6, tScore(S.flags.dispo && S.flags.dispo.kind === 'transfer' ? S.flags.dispo.t : null, 900, 1200))
      ];
    },
    timeLimit: 1800
  });

  /* 8. Trauma maksilofasial -------------------------------------------- */
  LIST.push({
    id: 'maxfac', cat: 'neuro', badge: 'Airway', title: 'Obstruksi jalan napas — trauma maksilofasial', diff: 'Lanjut', est: '8–12 menit',
    setting: 'IGD RSUD tipe B — troli jalan napas sulit & set krikotiroidotomi tersedia; ICU & CT tersedia.',
    facility: fac('rsudB'),
    mist: { M: 'Pengendara motor tanpa helm menabrak tiang listrik dengan wajah ±20 menit lalu.', I: 'Wajah hancur, darah dari mulut & hidung.', S: 'N 100, TD 136/86, RR 26, SpO₂ 88%.', T: 'Posisi miring sebagian, tanpa collar.' },
    stem: 'Laki-laki 22 tahun menabrak tiang dengan wajah. Darah terus mengalir dari mulut & hidung, napas berbunyi, hanya mengerang.',
    objectives: ['Kenali obstruksi jalan napas akibat darah & fraktur midface', 'Suction + jaw thrust dengan servikal in-line', 'Hindari NPA & NGT (fraktur basis/midface)', 'Intubasi gagal → krikotiroidotomi bedah tanpa menunda'],
    blunt: true,
    init: { age: 22, sex: 'L', weight: 65, hr0: 96, sbp0: 132, dbp0: 84, rr0: 24, spo2: 97, temp: 36.5, gcs: [2, 2, 5], loss: 600, injuryAgo: 1300, cspine: false, gds: 135, hb: 14 },
    problems: { airway: { type: 'blood', sev: 0.5, grow: 0.08, failETT: true }, ext: { rate: 14, site: 'head', where: 'wajah & kulit kepala', desc: 'Laserasi wajah & kulit kepala merembes darah (tidak menyembur)', ctrl: 0 }, basal: true, tbi: { icp: 0.3, grow: 0.004, side: 'kanan', lat: '' } },
    injuries: ['airway_obs', 'maxfac'], definitive: ['admit'], dispoBy: 1800,
    dispoHint: 'Jalan napas aman & stabil — CT kepala/wajah lalu rawat ICU (konsul bedah mulut/plastik & bedah saraf).',
    find: {
      e: 'Fraktur midface (Le Fort III — wajah "memanjang", goyang), fraktur mandibula, racoon eyes bilateral, rinore bercampur darah. Laserasi kulit kepala 5 cm.',
      ample: 'A: tidak diketahui. M: tidak diketahui. P: tidak diketahui. L: tidak diketahui. E: menabrak tiang tanpa helm.',
      secondary: 'Fraktur Le Fort III & mandibula, curiga fraktur basis kranii anterior (racoon eyes, rinore LCS). Ekstremitas: abrasi.',
      ct: 'CT kepala-wajah: fraktur Le Fort III & mandibula, fraktur basis kranii anterior, kontusio frontal kecil tanpa efek massa. CT servikal: normal.'
    },
    extra: function (S) {
      var su = S.firstAct('suction'), aw = S.fix.airway;
      return [
        item('Suction ≤2 menit', 6, tScore(su, 120, 240), { note: at(su) }),
        item('Jalan napas definitif ≤8 menit', 12, aw === undefined ? 0 : aw <= 480 ? 1 : 0.5, { critical: true, note: at(aw) }),
        item('Krikotiroidotomi bedah setelah intubasi gagal (tanpa upaya berulang)', 8, S.st.airway === 'cric' ? ((S.flags.ettTries || 0) <= 1 ? 1 : 0.5) : 0),
        item('Tidak memasang NPA/NGT (fraktur basis kranii/midface)', 6, !S.penCount.npa_basal && !S.penCount.ngt_basal),
        item('SpO₂ terendah ≥80%', 4, S.min.spo2 >= 80, { note: Math.round(S.min.spo2) + '%' })
      ];
    },
    timeLimit: 1800
  });

  /* 9. Cedera otak berat ------------------------------------------------ */
  LIST.push({
    id: 'tbi', cat: 'neuro', badge: 'Neuro', title: 'Cedera otak berat dengan tanda herniasi', diff: 'Lanjut', est: '12–18 menit',
    setting: 'IGD RSUP — bedah saraf, CT 24 jam, ICU tersedia.',
    facility: fac('center'),
    mist: { M: 'Jatuh dari motor tanpa helm, kepala membentur aspal ±40 menit lalu.', I: 'Hematoma kepala kiri; sempat sadar lalu makin mengantuk.', S: 'GCS 10 → 7 dalam perjalanan, N 70, TD 146/86.', T: 'Collar servikal, O₂.' },
    stem: 'Laki-laki 40 tahun jatuh dari motor tanpa helm. Sempat sadar & bicara (lucid interval), kini hanya mengerang; pupil kiri melebar.',
    objectives: ['GCS ≤8 → jalan napas definitif dengan MILS', 'Cegah cedera otak sekunder: hindari hipoksia (SpO₂ <90%) & hipotensi (SBP <110)', 'Tanda herniasi → terapi hiperosmolar, elevasi kepala, hiperventilasi singkat hanya sebagai jembatan', 'CT kepala (pasien stabil) → bedah saraf segera'],
    blunt: true, ettOk: true,
    init: { age: 40, sex: 'L', weight: 70, hr0: 68, sbp0: 146, dbp0: 86, rr0: 16, spo2: 97, temp: 36.4, gcs: [1, 2, 4], loss: 300, injuryAgo: 2400, cspine: true, gds: 150, hb: 14.6 },
    problems: { tbi: { icp: 0.62, grow: 0.018, side: 'kiri', lat: 'Hemiparesis kanan (motorik 2/5), postur fleksi abnormal kanan', sbpMin: 110 } },
    injuries: ['tbi_herniation'], definitive: ['crani'], dispoBy: 1800,
    dispoHint: 'CT menunjukkan hematoma epidural dengan midline shift → kraniotomi emergensi.',
    find: {
      e: 'Hematoma subgaleal temporal kiri, laserasi kulit kepala 3 cm, abrasi wajah. Tidak ada cedera lain yang tampak.',
      ample: 'A: tidak diketahui. M: tidak diketahui. P: tidak diketahui. L: tidak diketahui. E: jatuh dari motor ±40 km/jam tanpa helm.',
      secondary: 'Hematoma temporal kiri; tidak ada cedera toraks/abdomen/ekstremitas bermakna.',
      ct: 'CT kepala: hematoma epidural temporoparietal kiri ±60 mL (tebal 2,5 cm), midline shift 9 mm, kompresi sisterna basalis; fraktur linear temporal kiri. CT servikal: normal.'
    },
    hintLate: function (S) {
      if (!S.did('ct')) return 'Pasien stabil secara hemodinamik — CT kepala non-kontras segera.';
      if (S.flags.ns === undefined) return 'Konsul bedah saraf.';
      return null;
    },
    extra: function (S) {
      var aw = S.fix.airway, ho = S.fix.icp, ct = S.firstAct('ct');
      return [
        item('Jalan napas definitif (GCS ≤8) ≤8 menit', 10, aw === undefined ? 0 : aw <= 480 ? 1 : 0.5, { critical: true, note: at(aw) }),
        item('Hindari hipoksia (SpO₂ terendah ≥90%)', 6, S.min.spo2 >= 90 ? 1 : S.min.spo2 >= 85 ? 0.5 : 0, { note: Math.round(S.min.spo2) + '%', why: 'Satu episode hipoksia/hipotensi meningkatkan mortalitas cedera otak berat secara bermakna.' }),
        item('Pertahankan SBP ≥110 mmHg', 6, S.min.sbp >= 110 ? 1 : S.min.sbp >= 100 ? 0.5 : 0, { note: 'SBP terendah ' + Math.round(S.min.sbp) }),
        item('Terapi hiperosmolar untuk tanda herniasi', 8, ho !== undefined, { note: at(ho) }),
        item('CT kepala sebelum kraniotomi', 6, ct !== null && (!S.flags.dispo || ct < S.flags.dispo.t)),
        item('Konsul bedah saraf', 4, S.flags.ns !== undefined),
        item('Profilaksis kejang & cek gula darah', 4, (S.did('anticonv') ? 0.5 : 0) + (S.flags.gds ? 0.5 : 0)),
        item('Tidak hiperventilasi tanpa tanda herniasi', 4, !S.penCount.hypervent_wrong)
      ];
    },
    timeLimit: 2400
  });

  /* 10. Cedera medula servikal ----------------------------------------- */
  LIST.push({
    id: 'sci', cat: 'neuro', badge: 'Neuro', title: 'Cedera medula servikal & syok neurogenik', diff: 'Lanjut', est: '12–18 menit',
    setting: 'IGD RSUD tipe B — CT tersedia; tidak ada bedah saraf/spine (rujuk ke RSUP).',
    facility: fac('rsudB', { referTo: 'RSUP (bedah saraf/spine)' }),
    mist: { M: 'Menyelam ke sungai dangkal, kepala membentur batu ±45 menit lalu.', I: 'Tidak bisa menggerakkan lengan & tungkai.', S: 'N 50, TD 82/46, RR 24, SpO₂ 94%.', T: 'Diangkat teman tanpa stabilisasi leher.' },
    stem: 'Laki-laki 19 tahun menyelam ke sungai dangkal, kepala membentur batu. Sadar penuh, tidak bisa menggerakkan lengan & tungkai, mengeluh sesak.',
    objectives: ['Restriksi servikal & log roll dengan MILS', 'Hipotensi pada trauma = hipovolemia sampai terbukti lain — singkirkan perdarahan', 'Syok neurogenik: cairan secukupnya, vasopresor, atropin untuk bradikardia', 'Antisipasi gagal napas (lesi C5) → intubasi dengan MILS', 'Tidak memberi steroid dosis tinggi; rujuk ke pusat spine'],
    blunt: true, ettOk: true,
    init: { age: 19, sex: 'L', weight: 65, hr0: 46, sbp0: 80, dbp0: 44, rr0: 24, spo2: 94, temp: 35.8, gcs: [4, 5, 6], loss: 200, injuryAgo: 2700, cspine: false, gds: 112, hb: 14.2 },
    problems: { neuro: { level: 'C5', desc: 'Tetraplegia flaksid & arefleksia, sensasi hilang mulai setinggi klavikula (C5); fleksi siku lemah masih ada; priapismus.' }, resp: { def: 4, grow: 0.45, max: 20 }, cspineInj: true },
    injuries: ['sci_neuro'], definitive: ['transfer'], dispoBy: 1800,
    dispoHint: 'Fasilitas tanpa bedah spine — rujuk ke RSUP setelah jalan napas & hemodinamik aman (SBAR).',
    find: {
      e: 'Abrasi dahi & puncak kepala. Kulit di bawah lesi hangat & kering. Tidak ada luka lain.',
      back: 'Nyeri tekan prosesus spinosus C5–C6 dengan step-off ringan; tonus sfingter ani hilang, refleks bulbokavernosus (−).',
      ample: 'A: tidak ada. M: tidak ada. P: sehat. L: 2 jam lalu. E: menyelam kepala lebih dulu ke air dangkal.',
      secondary: 'Cedera medula servikal komplet setinggi C5. Tidak ada cedera toraks/abdomen.',
      ct: 'CT servikal: fraktur burst C5 dengan retropulsi fragmen ke kanalis & subluksasi C5–C6. CT kepala normal.'
    },
    hintPre: function (S) {
      if (S.p.resp.def > 9 && !S.secured() && S.letters().b !== null) return 'Kelelahan napas (lesi C5) — intubasi dengan MILS sebelum gagal napas.';
      return null;
    },
    hintLate: function (S) {
      if (!S.did('logroll')) return 'Log roll dengan MILS untuk memeriksa tulang belakang & tonus sfingter.';
      if (!S.st.catheter) return 'Pasang kateter urin (retensi urin pada cedera medula).';
      return null;
    },
    extra: function (S) {
      var ex = S.did('efast') && (S.did('cxr') || S.did('pxr'));
      var pr = S.fix.pressor;
      var needEtt = S.p.resp.def > 9;
      return [
        item('Singkirkan perdarahan sebelum menyimpulkan syok neurogenik', 6, ex && !S.penCount.pressor_noexclude ? 1 : ex ? 0.5 : 0),
        item('Vasopresor untuk syok neurogenik', 8, pr !== undefined, { critical: true, note: at(pr) }),
        item('Atropin untuk bradikardia simtomatik', 4, S.did('atropine')),
        item('Intubasi dengan MILS saat kelelahan napas', 8, needEtt ? (S.secured() && !S.penCount.rsi_nomils ? 1 : S.secured() ? 0.5 : 0) : 1, { note: S.secured() ? at(S.fix.airway) : needEtt ? 'Tidak diintubasi' : 'Belum diperlukan' }),
        item('Log roll dengan restriksi servikal', 4, S.did('logroll') && !S.penCount.logroll_nocspine),
        item('Tidak memberi steroid dosis tinggi', 5, !S.penCount.steroid),
        item('Kateter urin (retensi)', 3, S.st.catheter)
      ];
    },
    timeLimit: 2400
  });

  /* 11. Luka bakar + inhalasi ------------------------------------------ */
  LIST.push({
    id: 'burn', cat: 'neuro', badge: 'Luka bakar', title: 'Luka bakar luas dengan cedera inhalasi', diff: 'Lanjut', est: '12–18 menit',
    setting: 'IGD RSUD tipe B — tidak ada unit luka bakar (rujuk ke RSUP).',
    facility: fac('rsudB', { referTo: 'RSUP (unit luka bakar)', transferDelay: 300 }),
    mist: { M: 'Terjebak di kamar saat rumah terbakar ±10 menit; dievakuasi ±30 menit lalu.', I: 'Luka bakar wajah, dada, kedua lengan; suara serak.', S: 'N 116, TD 120/76, RR 26, SpO₂ 98%.', T: 'Disiram air, O₂ kanul.' },
    stem: 'Perempuan 35 tahun (60 kg) terjebak di ruang tertutup saat kebakaran. Suara serak, batuk berjelaga, luka bakar wajah, dada, dan kedua lengan.',
    objectives: ['Kenali tanda cedera inhalasi → intubasi DINI sebelum edema', 'O₂ 100% untuk keracunan CO (SpO₂ dapat normal palsu)', 'Estimasi %TBSA dengan Rule of Nines (derajat I tidak dihitung)', 'Cairan RL 2 mL × kgBB × %TBSA; ½ dalam 8 jam pertama; titrasi urin output', 'Cegah hipotermia, lepas perhiasan, rujuk ke unit luka bakar'],
    blunt: false, ettOk: true, sets: ['burn'],
    init: { age: 35, sex: 'P', weight: 60, hr0: 112, sbp0: 118, dbp0: 74, rr0: 24, spo2: 98, temp: 36.6, gcs: [4, 5, 6], loss: 0, injuryAgo: 1800, gds: 142, hb: 15.5 },
    problems: { airway: { type: 'edema', sev: 0.22, grow: 0.045, ettMax: 0.6 }, burn: { tbsa: 40.5, circArms: true, co: 26 } },
    injuries: ['inhalation', 'co', 'burn_major'], definitive: ['transfer'], dispoBy: 1800,
    dispoHint: 'Luka bakar >20% + inhalasi → rujuk ke unit luka bakar setelah jalan napas aman (SBAR).',
    find: {
      e: 'Luka bakar derajat II dalam–III: wajah & leher anterior (½ kepala = 4,5%), dada & perut anterior (18%), kedua lengan melingkar seluruhnya (2 × 9%). Eritema tanpa bula (derajat I) di punggung atas. Cincin di jari kanan, jari membengkak.',
      ample: 'A: tidak ada. M: tidak ada. P: asma ringan. L: 3 jam lalu. E: terjebak di ruang tertutup berasap ±10 menit.',
      secondary: 'Luka bakar melingkar kedua lengan: akral dingin, CRT distal memanjang → risiko sindrom kompartemen (pertimbangkan eskarotomi). Kornea utuh.'
    },
    hintPre: function (S) {
      var L = S.letters();
      if (L.a !== null && !S.st.o2 && !S.ventilated()) return 'Curiga keracunan CO — O₂ 100% via NRM segera (SpO₂ bisa normal palsu).';
      if (L.a !== null && !S.secured() && S.p.airway.sev < 0.6) return 'Cedera inhalasi (suara serak, jelaga, stridor) — intubasi DINI sekarang sebelum edema memburuk.';
      return null;
    },
    hintLate: function (S) {
      if (!S.flags.stopBurn) return 'Hentikan proses luka bakar: lepas pakaian sisa & cincin/perhiasan.';
      if (!S.burnCalc) return 'Estimasi %TBSA (Rule of Nines) & mulai RL sesuai formula (tab Eksposur).';
      if (!S.st.catheter) return 'Pasang kateter urin — titrasi cairan ke urin output 0,5 mL/kg/jam.';
      if (!S.flags.eschar) return 'Luka bakar melingkar kedua lengan — konsul eskarotomi.';
      return null;
    },
    extra: function (S) {
      var aw = S.fix.airway, o2 = first(S.firstAct('o2'), S.firstAct('bvm'), S.flags.rsiAt);
      var bc = S.burnCalc, err = bc ? Math.abs(bc.tbsa - 40.5) : 99;
      return [
        item('Intubasi dini sebelum edema berat', 12, aw === undefined ? 0 : S.st.airway === 'ett' ? 1 : 0.5, { critical: true, note: aw === undefined ? 'Tidak dilakukan' : S.st.airway === 'ett' ? 'ETT pada ' + fmt(aw) : 'Krikotiroidotomi (intubasi terlambat)' }),
        item('O₂ 100% ≤2 menit (keracunan CO)', 6, tScore(o2, 120, 300), { note: at(o2) }),
        item('Estimasi %TBSA tepat (±5%)', 8, err <= 5.5 ? 1 : err <= 10 ? 0.5 : 0, { note: bc ? bc.tbsa + '% (sebenarnya ±40,5%)' : 'Tidak dihitung', why: 'Rule of Nines: kepala 9, lengan 9 tiap sisi, dada-perut 18, punggung 18, tungkai 18 tiap sisi, perineum 1. Derajat I tidak dihitung.' }),
        item('Cairan luka bakar sesuai formula dimulai', 4, !!bc),
        item('Tanpa bolus kristaloid berulang', 3, !S.penCount.burn_bolus),
        item('Lepas pakaian & perhiasan (hentikan proses luka bakar)', 3, !!S.flags.stopBurn),
        item('Kateter urin untuk titrasi cairan', 4, S.st.catheter),
        item('Konsul eskarotomi (luka bakar melingkar)', 3, !!S.flags.eschar),
        item('Profilaksis tetanus', 2, !!S.flags.tetanus)
      ];
    },
    timeLimit: 2400
  });

  /* 12. Trauma anak ----------------------------------------------------- */
  LIST.push({
    id: 'peds', cat: 'special', badge: 'Anak', title: 'Trauma anak — syok terkompensasi', diff: 'Menengah', est: '10–15 menit', peds: true,
    setting: 'IGD RSUD tipe B — dokter bedah umum, bank darah, CT; tidak ada bedah anak & PICU (rujuk ke RSUP bila stabil).',
    facility: fac('rsudB', { referTo: 'RSUP (bedah anak & PICU)' }),
    mist: { M: 'Pejalan kaki ditabrak sepeda motor ±25 menit lalu.', I: 'Memar perut kiri atas.', S: 'Menangis lemah, pucat.', T: 'Tidak ada.' },
    stem: 'Anak laki-laki 6 tahun ditabrak sepeda motor saat menyeberang. Menangis lemah, pucat, perut kiri atas memar. Berat badan tidak diketahui — estimasi (usia + 4) × 2 = 20 kg.',
    objectives: ['Kenali syok terkompensasi: takikardia & CRT memanjang dengan TD masih normal', 'Akses IO bila IV gagal', 'Kristaloid maks 20 mL/kg, lalu PRC 10–20 mL/kg; TXA 15 mg/kg', 'Anak lebih cepat hipotermia', 'Hindari krikotiroidotomi bedah pada anak <12 tahun'],
    blunt: true, hemo: true, ivFail: true, bloodBy: 900, sets: ['peds'],
    init: { age: 6, sex: 'L', weight: 20, hr0: 100, sbp0: 100, dbp0: 62, rr0: 22, spo2: 98, temp: 36.2, gcs: [3, 4, 6], loss: 470, injuryAgo: 1500, cspine: false, gds: 95, hb: 12.2 },
    problems: { abdo: { rate: 16, ctrl: 0, decay: 0.96 } },
    injuries: ['abdo_bleed', 'shock_comp'], definitive: ['transfer', 'or_lap'], dispoBy: 1800,
    dispoHint: 'Respons baik terhadap resusitasi → rujuk ke RS dengan bedah anak & PICU (tata laksana non-operatif). Bila tidak respons → laparotomi.',
    find: {
      abdo: 'Memar kuadran kiri atas abdomen, nyeri tekan LUQ, tanpa defans difus.',
      fastAbd: 'cairan bebas (+) minimal–sedang di splenorenal (LUQ)',
      e: 'Memar kuadran kiri atas, abrasi lutut & siku. Tidak ada cedera kepala bermakna.',
      ample: 'A: tidak ada. M: tidak ada. P: imunisasi lengkap. L: 2 jam lalu. E: ditabrak motor ±30 km/jam.',
      secondary: 'Abrasi ekstremitas. Tidak ada fraktur. Neurologis normal.',
      ct: 'CT abdomen: laserasi limpa grade III tanpa blush kontras aktif, hemoperitoneum ringan.'
    },
    extra: function (S) {
      var io = S.firstAct('io'), fail = S.flags.ivFailed, d = S.flags.dispo;
      var stableAtD = d ? S.totalBleed() < 6 : false;
      return [
        item('Akses IO ≤90 detik setelah IV gagal', 6, io === null ? (S.st.iv ? 0.5 : 0) : fail === undefined ? 1 : io - fail <= 90 ? 1 : 0.5, { note: at(io) }),
        item('Mengenali syok terkompensasi (resusitasi meski TD normal)', 6, S.fl.firstBlood !== null || S.fl.crystOrd > 0),
        item('Disposisi sesuai respons (rujuk bila responder)', 4, d ? (d.kind === 'transfer' ? 1 : stableAtD ? 0.5 : 1) : 0, { why: 'Cedera limpa pada anak yang hemodinamiknya stabil umumnya non-operatif di pusat dengan bedah anak & PICU.' }),
        item('Tidak krikotiroidotomi bedah pada anak', 4, !S.penCount.cric_child)
      ];
    },
    timeLimit: 2100
  });

  /* 13. Trauma kehamilan ------------------------------------------------ */
  LIST.push({
    id: 'preg', cat: 'special', badge: 'Kehamilan', title: 'Trauma pada kehamilan 32 minggu', diff: 'Menengah', est: '10–15 menit',
    setting: 'IGD RSUD tipe B — dokter obstetri & bedah on-site, OK, bank darah.',
    facility: fac('rsudB'),
    mist: { M: 'Penumpang mobil menabrak pohon ±30 menit lalu; sabuk pengaman melintang di perut.', I: 'Nyeri perut, perdarahan pervaginam.', S: 'N 112, TD 96/60.', T: 'Collar servikal, papan spinal telentang.' },
    stem: 'Perempuan 28 tahun, G2P1 hamil 32 minggu, penumpang mobil yang menabrak pohon. Nyeri perut, keluar darah dari jalan lahir, berbaring telentang di papan spinal.',
    objectives: ['Resusitasi ibu = resusitasi janin', 'Pergeseran uterus ke kiri (manual LUD) — cegah kompresi aortokaval', 'Pemantauan janin dini & konsul obstetri', 'Anti-D untuk ibu Rh negatif', 'Kenali solusio plasenta & gawat janin → SC emergensi'],
    blunt: true, hemo: true, sets: ['preg'],
    init: { age: 28, sex: 'P', weight: 68, hr0: 96, sbp0: 112, dbp0: 66, rr0: 20, spo2: 98, temp: 36.5, gcs: [4, 5, 6], loss: 1300, injuryAgo: 1800, cspine: true, gds: 98, hb: 11.2 },
    problems: { preg: { ga: 32, abrupt: 14, ctrl: 0, rhNeg: true } },
    injuries: ['abruption'], definitive: ['or_cs'], dispoBy: 1500,
    dispoHint: 'Solusio plasenta dengan gawat janin → seksio sesarea emergensi.',
    find: {
      e: 'Jejas sabuk pengaman melintang di abdomen bawah. Tidak ada luka lain.',
      ample: 'A: tidak ada. M: vitamin prenatal. P: G2P1 hamil 32 minggu, ANC rutin, golongan darah O Rh (−). L: 2 jam lalu. E: penumpang depan, sabuk melintang di perut.',
      secondary: 'Solusio plasenta dicurigai; tidak ada fraktur. Pemeriksaan dalam ditunda (obstetri).',
      ct: 'CT dihindari bila tidak perlu; USG obstetri: hematoma retroplasenta ±6 cm.'
    },
    hintPre: function (S) {
      if (S.letters().c !== null && !S.st.lud) return 'Hamil >20 minggu telentang: geser uterus ke kiri (manual LUD) SEKARANG.';
      return null;
    },
    hintLate: function (S) {
      if (!S.flags.fetalChecked) return 'Pantau janin (CTG).';
      if (S.flags.obg === undefined) return 'Konsul obstetri segera.';
      if (!S.flags.antid) return 'Ibu Rh negatif — berikan imunoglobulin anti-D.';
      return null;
    },
    extra: function (S) {
      var lud = S.fix.lud, fe = S.flags.fetalChecked;
      return [
        item('Pergeseran uterus ke kiri ≤3 menit', 10, lud === undefined ? 0 : lud <= 180 ? 1 : 0.5, { critical: true, note: at(lud), why: 'Setelah 20 minggu, uterus menekan vena kava inferior saat telentang → curah jantung turun hingga 30%.' }),
        item('Pemantauan janin ≤10 menit', 6, tScore(fe, 600, 900), { note: at(fe) }),
        item('Konsul obstetri dini', 6, tScore(S.flags.obg, 600, 900), { note: at(S.flags.obg) }),
        item('Anti-D untuk ibu Rh negatif', 4, !!S.flags.antid)
      ];
    },
    timeLimit: 2100
  });

  /* 14. Lansia dengan antikoagulan ------------------------------------- */
  LIST.push({
    id: 'geri', cat: 'special', badge: 'Lansia', title: 'Lansia jatuh dengan antikoagulan', diff: 'Menengah', est: '12–18 menit',
    setting: 'IGD RSUP — CT 24 jam, bedah saraf, bank darah, ICU.',
    facility: fac('center'),
    mist: { M: 'Jatuh di kamar mandi, kepala belakang membentur lantai ±1 jam lalu.', I: 'Nyeri panggul kanan, makin mengantuk.', S: 'N 72, TD 152/86, GCS 14.', T: 'Tidak ada.' },
    stem: 'Laki-laki 78 tahun jatuh di kamar mandi, kepala membentur lantai ±1 jam lalu. Riwayat fibrilasi atrium (warfarin) & hipertensi (bisoprolol). Awalnya bicara normal, kini lebih mengantuk; tungkai kanan memendek.',
    objectives: ['Jatuh dari posisi berdiri pada lansia + antikoagulan = trauma berisiko tinggi', 'β-bloker menutupi takikardia; SBP <110 pada lansia dapat berarti syok', 'CT kepala dini & cek INR', 'Reversal antikoagulan segera (PCC + vitamin K) bila perdarahan intrakranial', 'Konsul bedah saraf; analgesia hati-hati untuk fraktur panggul'],
    blunt: true,
    init: { age: 78, sex: 'L', weight: 62, hr0: 72, sbp0: 150, dbp0: 84, rr0: 18, spo2: 95, temp: 36.0, gcs: [3, 4, 6], loss: 700, injuryAgo: 3600, cspine: false, gds: 168, hb: 12.6 },
    problems: { tbi: { icp: 0.3, grow: 0.016, side: 'kanan', lat: 'Hemiparesis kiri ringan (motorik 4/5)', sbpMin: 110 }, anticoag: true, betaBlock: true, femur: { rate: 6, ctrl: 0, side: 'kanan', desc: 'Tungkai kanan memendek & rotasi eksterna, nyeri panggul kanan', xr: 'Fraktur intertrokanter femur kanan.' } },
    injuries: ['tbi_ich', 'femur'], definitive: ['crani'], dispoBy: 2100,
    dispoHint: 'Perdarahan subdural dengan efek massa → kraniotomi (setelah reversal antikoagulan).',
    find: {
      e: 'Hematoma oksipital, abrasi siku kanan; tungkai kanan memendek & rotasi eksterna. Kulit tipis, memar lama di lengan.',
      ample: 'A: tidak ada. M: warfarin 3 mg, bisoprolol 5 mg, amlodipin. P: fibrilasi atrium, hipertensi. L: 3 jam lalu. E: terpeleset di kamar mandi.',
      secondary: 'Fraktur panggul kanan; tidak ada cedera toraks/abdomen. Status fungsional sebelumnya mandiri.',
      ct: 'CT kepala: perdarahan subdural akut frontotemporoparietal kanan, tebal 14 mm, midline shift 7 mm. CT servikal: spondilosis, tanpa fraktur.',
      ecg: 'fibrilasi atrium respons normal (dengan β-bloker)'
    },
    hintLate: function (S) {
      if (!S.did('ct')) return 'Lansia + antikoagulan + penurunan kesadaran → CT kepala segera.';
      if (!S.flags.reversed) return 'Perdarahan intrakranial dengan warfarin → reversal segera (PCC 4-faktor + vitamin K).';
      if (S.flags.ns === undefined) return 'Konsul bedah saraf.';
      return null;
    },
    extra: function (S) {
      var ct = S.firstAct('ct'), rv = S.flags.reversed;
      return [
        item('CT kepala ≤15 menit', 8, tScore(ct, 900, 1500), { critical: true, note: at(ct) }),
        item('Cek INR / koagulasi', 4, S.did('labs')),
        item('Reversal antikoagulan ≤20 menit', 10, rv === undefined ? 0 : rv <= 1200 ? 1 : 0.5, { critical: true, note: at(rv) }),
        item('Konsul bedah saraf', 4, S.flags.ns !== undefined),
        item('Analgesia untuk fraktur panggul', 2, S.did('analgesia'))
      ];
    },
    timeLimit: 2700
  });

  LIST.forEach(function (s) { s.hint = hint; });

  T.SCENARIOS = LIST;
  T.SCEN_BY_ID = {};
  LIST.forEach(function (s) { T.SCEN_BY_ID[s.id] = s; });
  T.CATEGORIES = [
    { id: 'thorax', label: 'Trauma toraks' },
    { id: 'hemo', label: 'Syok hemoragik' },
    { id: 'neuro', label: 'Jalan napas, neuro & luka bakar' },
    { id: 'special', label: 'Populasi khusus' }
  ];

  /* ------------------------------------------------------------------
     Modal: briefing tim & SBAR
     ------------------------------------------------------------------ */
  T.TEAM_ITEMS = [
    { id: 'lead', label: 'Ketua tim ditetapkan — memimpin & tidak mengerjakan prosedur', ok: true },
    { id: 'airway', label: 'Petugas jalan napas & servikal (di kepala pasien)', ok: true },
    { id: 'circ', label: 'Petugas sirkulasi: akses IV/IO, sampel darah, cairan & darah', ok: true },
    { id: 'proc', label: 'Petugas prosedur/pemeriksa (primary survey, eFAST, chest tube)', ok: true },
    { id: 'rec', label: 'Pencatat & pengatur waktu (tanda vital, obat, jam tourniquet)', ok: true },
    { id: 'ppe', label: 'APD lengkap & kewaspadaan universal seluruh tim', ok: true },
    { id: 'prep', label: 'Cairan/darah hangat, set jalan napas & chest tube disiapkan; bank darah/OK diberi tahu', ok: true },
    { id: 'closed', label: 'Komunikasi closed-loop (instruksi diulang & dikonfirmasi)', ok: true },
    { id: 'x1', label: 'Ketua tim memasang chest tube sendiri agar cepat', ok: false },
    { id: 'x2', label: 'Semua anggota tim menilai jalan napas bersama-sama dulu', ok: false },
    { id: 'x3', label: 'Alat baru disiapkan setelah pasien diperiksa', ok: false }
  ];
  T.scoreTeam = function (ids) {
    var okAll = T.TEAM_ITEMS.filter(function (x) { return x.ok; }).length;
    var hit = 0, wrong = 0;
    ids.forEach(function (id) { var it = T.TEAM_ITEMS.filter(function (x) { return x.id === id; })[0]; if (it) { if (it.ok) hit++; else wrong++; } });
    return { picked: ids, frac: Math.max(0, Math.min(1, hit / okAll - 0.25 * wrong)), wrong: wrong };
  };

  T.SBAR_GROUPS = [
    { g: 'S — Situation', items: [
      { id: 's1', label: 'Identitas, usia & masalah utama (cedera mengancam nyawa)', ok: true },
      { id: 's2', label: 'Tanda vital terkini & trennya', ok: true } ] },
    { g: 'B — Background', items: [
      { id: 'b1', label: 'Mekanisme & waktu cedera (MIST), AMPLE singkat', ok: true },
      { id: 'b2', label: 'Obat penting (antikoagulan, β-bloker) & alergi', ok: true } ] },
    { g: 'A — Assessment', items: [
      { id: 'a1', label: 'Temuan primary survey & hasil adjuvan (eFAST, foto, lab)', ok: true },
      { id: 'a2', label: 'Tindakan yang sudah dikerjakan + jamnya (tourniquet, chest tube, darah, TXA) & responsnya', ok: true } ] },
    { g: 'R — Recommendation', items: [
      { id: 'r1', label: 'Kebutuhan selama transport & di tujuan (darah, ventilasi, OK/ICU/spesialis)', ok: true },
      { id: 'r2', label: 'Konfirmasi RS penerima bersedia menerima (dokter-ke-dokter) sebelum berangkat', ok: true },
      { id: 'r3', label: 'Salinan rekam medis, hasil lab/pencitraan & lembar observasi ikut dikirim', ok: true } ] },
    { g: 'Yang sebaiknya TIDAK dilakukan', items: [
      { id: 'x1', label: 'Menunda rujukan untuk menunggu CT scan / hasil lab lengkap', ok: false },
      { id: 'x2', label: 'Melonggarkan tourniquet sebelum berangkat agar perfusi distal membaik', ok: false },
      { id: 'x3', label: 'Pasien dikirim dulu, RS tujuan ditelepon setelah ambulans berangkat', ok: false } ] }
  ];
  T.TRANSPORT = [
    { id: 't1', label: 'Ambulans + dokter/perawat terlatih, monitor, O₂, cairan/darah & alat jalan napas', ok: true },
    { id: 't2', label: 'Ambulans dengan sopir & keluarga saja', ok: false },
    { id: 't3', label: 'Kendaraan pribadi keluarga agar lebih cepat', ok: false }
  ];
  T.scoreSbar = function (ids, transport) {
    var all = [];
    T.SBAR_GROUPS.forEach(function (g) { all = all.concat(g.items); });
    var okAll = all.filter(function (x) { return x.ok; }).length, hit = 0, wrong = 0;
    ids.forEach(function (id) { var it = all.filter(function (x) { return x.id === id; })[0]; if (it) { if (it.ok) hit++; else wrong++; } });
    var tr = T.TRANSPORT.filter(function (x) { return x.id === transport; })[0];
    return { picked: ids, transport: transport, frac: Math.max(0, Math.min(1, 0.8 * hit / okAll - 0.2 * wrong + (tr && tr.ok ? 0.2 : 0))), wrong: wrong };
  };

  T.mistSummary = function (S) {
    var sc = S.scen, v = S.vitals();
    var inj = (S.dx || []).map(function (id) { return T.INJ_BY_ID[id] ? T.INJ_BY_ID[id].label : id; });
    var tx = [];
    if (S.flags.tqAt !== undefined) tx.push('tourniquet ' + fmt(S.flags.tqAt));
    if (S.secured()) tx.push(S.st.airway === 'ett' ? 'ETT' : 'krikotiroidotomi');
    if (S.fix.tension !== undefined) tx.push('dekompresi dada');
    if (S.fix.htx !== undefined) tx.push('chest tube (output ' + r(S.p.htx.out) + ' mL)');
    if (S.flags.binder !== undefined) tx.push('pelvic binder');
    if (S.fl.crystOrd) tx.push('kristaloid ' + r(S.fl.crystOrd) + ' mL');
    if (S.fl.prbc) tx.push('PRC ' + S.fl.prbc + (S.peds ? ' dosis' : ' unit'));
    if (S.flags.txa) tx.push('TXA');
    if (S.flags.pressor) tx.push('norepinefrin');
    if (S.burnCalc) tx.push('RL ' + S.burnCalc.tbsa + '% TBSA');
    return [
      ['M', sc.mist ? sc.mist.M : '—'],
      ['I', inj.length ? inj.join(', ') : '(diagnosis kerja belum ditetapkan)'],
      ['S', v.off ? 'Monitor belum terpasang' : 'HR ' + v.hr + ', TD ' + (v.sbp === null ? '–' : v.sbp + '/' + v.dbp) + ', SpO₂ ' + (v.spo2 === null ? '–' : v.spo2) + '%, RR ' + v.rr + ', GCS ' + S.gcsText()],
      ['T', tx.length ? tx.join(', ') : 'belum ada tindakan bermakna']
    ];
  };
})();
