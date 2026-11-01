/* ==========================================================================
   ACLS Simulator — skenario kasus, kriteria penilaian & petunjuk (Pemula)
   Acuan: AHA Guidelines for CPR & ECC 2025 (Adult ALS, Post-Cardiac Arrest
   Care), AHA/ACC STEMI & AHA/ASA stroke iskemik akut.
   ========================================================================== */
(function () {
  'use strict';
  var ACLS = window.ACLS = window.ACLS || {};
  var fmt = ACLS.fmt;
  var SHOCKABLE = ACLS.SHOCKABLE;

  /* ------------------------------------------------------------------
     Helper
     ------------------------------------------------------------------ */
  function item(label, w, frac, o) {
    o = o || {};
    return { label: label, w: w, frac: typeof frac === 'boolean' ? (frac ? 1 : 0) : (frac || 0),
             critical: !!o.critical, note: o.note || '', why: o.why || '' };
  }
  function justGiven(S, id) { return S.lastDose(id) === S.t; }
  function firstDose(S, id) { var d = S.dosesOf(id); return d.length ? d[0] : null; }
  function arrestChecks(S) { return S.checks.filter(function (c) { return c.phase === 'arrest'; }); }
  function lastCheck(S) { return S.checks.length ? S.checks[S.checks.length - 1] : null; }
  function cvShocks(S) { return S.shocks.filter(function (s) { return s.cv; }); }
  function unsyncShocks(S) { return S.shocks.filter(function (s) { return s.unsync; }); }
  function before(t, ref) { return t !== null && (ref === null || t <= ref); }

  /* ------------------------------------------------------------------
     Kriteria umum henti jantung
     o: { shockable, mixed, antiarr }
     ------------------------------------------------------------------ */
  function arrestCriteria(S, o) {
    o = o || {};
    var a = S.arr, out = [];
    if (!a.episodes) return out;
    var d0 = a.delays.length ? a.delays[0] : null;
    out.push(item('Kompresi dada dimulai segera (≤10 detik)', 10, d0 === null ? 0 : d0 <= 10 ? 1 : d0 <= 20 ? 0.5 : 0,
      { critical: true, note: d0 === null ? 'Kompresi tidak dimulai' : 'Dimulai dalam ' + Math.round(d0) + ' detik',
        why: 'Setiap menit tanpa RJP menurunkan peluang hidup sekitar 7–10%.' }));
    var ccf = a.total ? a.cprOn / a.total : 0;
    out.push(item('Chest compression fraction ≥80%', 12, ccf >= 0.8 ? 1 : ccf >= 0.6 ? 0.5 : 0,
      { note: 'CCF ' + Math.round(ccf * 100) + '%', why: 'AHA: CCF minimal 60%, idealnya ≥80%. Kurangi jeda untuk analisis, intubasi, dan akses.' }));
    var over = a.pauses.filter(function (p) { return p.dur > 10; });
    out.push(item('Jeda kompresi <10 detik', 8, over.length === 0 ? 1 : over.length <= 2 ? 0.5 : 0,
      { note: over.length ? over.length + ' jeda >10 detik (terlama ' + Math.round(Math.max.apply(null, over.map(function (p) { return p.dur; }))) + ' dtk)' : 'Semua jeda <10 detik',
        why: 'Jeda pra- dan pasca-shock yang panjang menurunkan keberhasilan defibrilasi dan perfusi koroner.' }));
    if (o.shockable || a.vfPath) {
      var sd = a.shockDelays.length ? a.shockDelays[0] : null;
      out.push(item('Defibrilasi pertama ≤2 menit sejak VF/pVT terlihat', 12, sd === null ? 0 : sd <= 120 ? 1 : sd <= 180 ? 0.5 : 0,
        { critical: true, note: sd === null ? 'Tidak ada shock' : 'Shock dalam ' + Math.round(sd) + ' detik',
          why: 'Defibrilasi dini adalah intervensi paling menentukan pada VF/pVT.' }));
    }
    if (!o.shockable || o.mixed) {
      var bad = S.shocks.filter(function (s) { return !s.pulse && !s.ok; }).length;
      out.push(item('Tidak men-shock ritme non-shockable', 8, bad === 0,
        { critical: true, note: bad ? bad + ' shock pada asistol/PEA' : 'Tepat', why: 'Asistol/PEA tidak memberi respons terhadap shock; shock hanya menambah jeda kompresi.' }));
    }
    // Epinefrin
    var epi = S.dosesOf('epi1');
    var endT = S.phase === 'arrest' ? S.t : (a.recognized !== null ? a.recognized : S.t);
    if (o.shockable && !o.mixed) {
      var ok = S.shocks.filter(function (s) { return s.ok; });
      if (epi.length) {
        var nb = ok.filter(function (s) { return s.t <= epi[0]; }).length;
        out.push(item('Epinefrin setelah upaya defibrilasi awal gagal', 8, nb >= 2 ? 1 : nb === 1 ? 0.75 : 0.25,
          { note: 'Dosis pertama setelah shock ke-' + nb, why: 'AHA 2025: pada VF/pVT, epinefrin diberikan setelah upaya defibrilasi awal gagal (setelah shock ke-2 pada algoritma).' }));
      } else if (ok.length >= 2 && !(a.roscAt !== null && a.roscAt <= ok[1].t + 1)) {
        out.push(item('Epinefrin setelah upaya defibrilasi awal gagal', 8, 0, { note: 'Tidak diberikan', why: 'VF/pVT persisten setelah 2 shock → epinefrin 1 mg tiap 3–5 menit.' }));
      }
    } else {
      var ed = a.epiDelays.length ? a.epiDelays[0] : null;
      if (ed !== null || a.total > 150) {
        out.push(item('Epinefrin sesegera mungkin pada ritme non-shockable (≤3 menit)', 10, ed === null ? 0 : ed <= 180 ? 1 : ed <= 300 ? 0.5 : 0,
          { note: ed === null ? 'Tidak diberikan' : 'Diberikan ' + fmt(ed) + ' setelah ritme non-shockable teridentifikasi',
            why: 'AHA 2025: pada asistol/PEA, epinefrin diberikan sesegera mungkin.' }));
      }
    }
    if (epi.length) {
      var ints = [];
      for (var i = 1; i < epi.length; i++) ints.push(epi[i] - epi[i - 1]);
      var issues = ints.filter(function (x) { return x < 170 || x > 330; }).length;
      var missed = (endT - epi[epi.length - 1]) > 330;
      if (ints.length || missed) {
        out.push(item('Epinefrin diulang tiap 3–5 menit', 6, (issues + (missed ? 1 : 0)) === 0 ? 1 : (issues + (missed ? 1 : 0)) === 1 ? 0.5 : 0,
          { note: ints.length ? 'Interval: ' + ints.map(fmt).join(', ') + (missed ? ' · dosis berikut terlambat' : '') : 'Dosis berikut terlambat (>5 menit)',
            why: 'Epinefrin 1 mg tiap 3–5 menit selama henti jantung berlangsung.' }));
      }
    }
    if (o.antiarr) {
      var aaT = firstDose(S, 'amio300');
      var lT = firstDose(S, 'lido');
      if (aaT === null || (lT !== null && lT < aaT)) aaT = lT;
      if (aaT !== null || S.appShocks() >= 3) {
        var nbA = aaT === null ? 0 : S.shocks.filter(function (s) { return s.ok && s.t <= aaT; }).length;
        out.push(item('Amiodaron 300 mg / lidokain untuk VF/pVT refrakter (setelah shock ke-3)', 8, aaT === null ? 0 : nbA >= 2 ? 1 : 0.5,
          { note: aaT === null ? 'Tidak diberikan' : 'Diberikan setelah shock ke-' + nbA,
            why: 'Amiodaron 300 mg (lalu 150 mg) atau lidokain 1–1,5 mg/kg untuk VF/pVT yang tidak respons terhadap defibrilasi.' }));
      }
    }
    var cyc = arrestChecks(S).filter(function (c) { return c.cyc !== null; }).map(function (c) { return c.cyc; });
    if (cyc.length) {
      var good = cyc.filter(function (x) { return x >= 100 && x <= 160; }).length;
      out.push(item('Analisis ritme tiap ±2 menit RJP', 6, good / cyc.length,
        { note: good + '/' + cyc.length + ' siklus berdurasi 1:40–2:40', why: 'Siklus 2 menit menyeimbangkan perfusi dan deteksi ritme shockable.' }));
    }
    out.push(item('Akses IV/IO', 4, S.iv, { why: 'Diperlukan untuk epinefrin & antiaritmia; IO bila IV sulit.' }));
    out.push(item('Ventilasi/oksigenasi & kapnografi gelombang', 4, S.airway === 'none' ? 0 : S.capno ? 1 : 0.6,
      { note: (S.airway === 'adv' ? 'Advanced airway' : S.airway === 'bvm' ? 'BVM' : 'Tidak ada ventilasi') + (S.capno ? ' + kapnografi' : ''),
        why: 'Kapnografi gelombang memantau kualitas RJP, konfirmasi posisi ETT, dan tanda ROSC.' }));
    out.push(item('ROSC tercapai dan dikenali', 10, a.recognized !== null,
      { note: a.recognized !== null ? 'Dikenali pada ' + fmt(a.recognized) : (S.pt.pulse ? 'ROSC terjadi tetapi belum dikenali (cek nadi)' : 'Tidak ROSC') }));
    return out;
  }

  /* Kriteria pasca-ROSC */
  function postCriteria(S, o) {
    o = o || {};
    var t0 = S.arr.recognized, out = [];
    if (t0 === null || S.phase !== 'post') return out;
    out.push(item('EKG 12 sadapan segera pasca-ROSC', 6, S.didAfter('ecg12', t0), { why: 'Deteksi STEMI/penyebab kardiak untuk reperfusi segera.' }));
    if (S.flags.postHypo) out.push(item('Atasi hipotensi — target MAP ≥65 mmHg', 8, !!S.flags.mapOk, { note: 'MAP akhir ' + S.map() + ' mmHg', why: 'AHA 2025: hindari hipotensi; target MAP ≥65 mmHg dengan cairan dan/atau vasopresor.' }));
    out.push(item('Titrasi O₂ — target SpO₂ 90–98%', 4, S.didAfter('o2_titrate', t0), { why: 'Hindari hipoksemia maupun hiperoksia.' }));
    if (S.pt.comatose) {
      out.push(item('Advanced airway + ventilasi terkontrol (PaCO₂ 35–45 mmHg)', 4, S.airway === 'adv' ? (S.didAfter('vent', t0) ? 1 : 0.5) : 0, { why: 'Normokapnia; hindari hiperventilasi.' }));
      out.push(item('Kontrol suhu terarah (32–37,5 °C), cegah demam', 5, S.didAfter('ttm', t0), { why: 'Untuk pasien yang tidak mengikuti perintah setelah ROSC.' }));
    }
    if (o.stemi || S.flags.postStemi) {
      out.push(item('Angiografi koroner emergensi untuk STEMI', 8, S.didAfter('primary_pci', t0) || S.did('pci_transfer'), { why: 'STEMI pasca-ROSC → kateterisasi emergensi.' }));
    }
    return out.concat(o.extra || []);
  }

  /* ------------------------------------------------------------------
     Petunjuk (mode Pemula)
     ------------------------------------------------------------------ */
  function arrestHint(S) {
    var a = S.arr, lc = lastCheck(S);
    var epi = S.dosesOf('epi1');
    var aa = S.dosesOf('amio300').length + S.dosesOf('lido').length;
    var anyCheck = arrestChecks(S).length > 0;
    if (a.firstComp && !S.cpr.on) return 'Henti jantung! Mulai kompresi dada SEKARANG (tekan “Mulai / lanjutkan RJP”).';
    if (!S.cpr.on) {
      if (S.isShockable()) {
        if (S.defib.charged) return 'Ritme shockable — “Clear!”, tekan SHOCK, lalu langsung lanjutkan RJP.';
        if (S.defib.sync) return 'Ritme shockable tanpa nadi: matikan SYNC, charge, lalu shock.';
        if (S.defib.chargeDone !== null) return 'Sedang charging… tekan SHOCK begitu siap.';
        return 'Ritme shockable (' + S.rhythm().label + '): charge 200 J lalu shock.';
      }
      if (!S.defib.pads) return 'Lanjutkan RJP dan pasang pads tanpa menghentikan kompresi.';
      if (!anyCheck) return 'Lakukan analisis ritme pertama (jeda ≤10 detik).';
      var pulseAfter = lc && S.didAfter('pulse_check', lc.t);
      if (S.isOrganized() && !pulseAfter) return 'Ritme terorganisir — cek nadi (≤10 detik). Tanpa nadi = PEA.';
      return 'Lanjutkan kompresi SEKARANG — setiap detik jeda menurunkan perfusi.';
    }
    var cyc = S.cpr.cycleStart !== null ? S.t - S.cpr.cycleStart : 0;
    if (!S.defib.pads) return 'Pasang pads defibrilator sambil kompresi berjalan.';
    if (!anyCheck) return 'Pads terpasang — hentikan kompresi sebentar untuk analisis ritme pertama.';
    var lastShockable = lc && SHOCKABLE[lc.rhythm] && !lc.pulse;
    if (cyc >= 115) return 'Siklus 2 menit selesai: analisis ritme sekarang' + (lastShockable ? ' (boleh charge dulu saat kompresi).' : '.');
    if (!S.iv) return 'Pasang akses IV/IO selama kompresi.';
    if (!lastShockable && !epi.length) return 'Ritme non-shockable: berikan epinefrin 1 mg IV/IO sesegera mungkin.';
    if (lastShockable && a.epShocks >= 2 && !epi.length) return 'VF/pVT persisten setelah 2 shock: berikan epinefrin 1 mg IV/IO.';
    if (epi.length && S.t - epi[epi.length - 1] >= 180) return 'Sudah ≥3 menit sejak epinefrin terakhir — berikan dosis berikutnya (tiap 3–5 menit).';
    if (lastShockable && lc.rhythm === 'torsades' && !S.dosesOf('mg').length) return 'Torsades de pointes: berikan MgSO₄ 2 g IV/IO.';
    if (lastShockable && lc.rhythm !== 'torsades' && a.epShocks >= 3 && !aa) return 'VF/pVT refrakter (≥3 shock): berikan amiodaron 300 mg (atau lidokain 1–1,5 mg/kg).';
    if (S.airway === 'none') return 'Mulai ventilasi BVM + O₂ (30:2) atau pasang advanced airway.';
    if (!S.capno) return 'Pasang kapnografi gelombang untuk memantau kualitas RJP dan tanda ROSC.';
    if (S.pt.pulse) return 'EtCO₂ naik mendadak — curigai ROSC; pada analisis ritme berikutnya cek nadi.';
    if (S.scen.cause && S.scen.cause !== 'acs' && !S.flags.causeTreated) return 'Telusuri & atasi penyebab reversibel (H & T): pemeriksaan fisik, lab POC, POCUS.';
    if (cyc >= 100) return 'Siklus hampir 2 menit — siapkan analisis ritme.';
    return 'Pertahankan RJP berkualitas: 100–120/menit, kedalaman 5–6 cm, recoil penuh; ganti pemijat tiap 2 menit.';
  }

  function postHint(S) {
    var t0 = S.arr.recognized;
    if (!S.didAfter('ecg12', t0)) return 'ROSC! Rekam EKG 12 sadapan segera.';
    if (S.map() < 65) return 'Hipotensi (MAP ' + S.map() + ' mmHg): bolus kristaloid dan/atau norepinefrin hingga MAP ≥65.';
    if (!S.didAfter('o2_titrate', t0)) return 'Titrasi O₂ untuk target SpO₂ 90–98%.';
    if (S.pt.comatose && S.airway !== 'adv') return 'Pasien koma: pasang advanced airway.';
    if (S.pt.comatose && !S.didAfter('vent', t0)) return 'Atur ventilasi: ±10×/menit, target PaCO₂ 35–45 mmHg.';
    if (S.pt.comatose && !S.didAfter('ttm', t0)) return 'Pasien tidak mengikuti perintah: mulai kontrol suhu terarah (32–37,5 °C).';
    if (S.flags.postStemi && !S.didAfter('primary_pci', t0) && !S.did('pci_transfer')) return 'EKG menunjukkan STEMI: aktifkan cath lab untuk angiografi koroner emergensi.';
    var extra = S.scen.postHint && S.scen.postHint(S);
    if (extra) return extra;
    return 'Bundel pasca-ROSC lengkap — lakukan serah terima ke ICU (tab Pasca-ROSC → “Serah terima”).';
  }

  function defaultHint(S) {
    if (S.phase === 'arrest') return arrestHint(S);
    if (S.phase === 'post') return postHint(S);
    return null;
  }

  // Deteriorasi bertahap untuk kasus peri-arrest yang tidak ditangani
  function deteriorate(S, o) {
    if (S.flags.stable || S.phase !== 'pre') return;
    if (!S.flags.det1 && S.t >= o.t1) {
      S.flags.det1 = true;
      S.pt.sbp = o.sbp; S.pt.dbp = o.dbp; if (o.spo2) S.pt.spo2 = o.spo2;
      S.pt.consc = o.consc;
      S.alert('Kondisi memburuk: ' + o.consc.toLowerCase() + ', TD ' + o.sbp + '/' + o.dbp + ' mmHg.');
    }
    if (!S.flags.arrested && S.t >= o.t2) {
      S.flags.arrested = true;
      if (o.rhythm) S.setRhythm(o.rhythm, o.rate);
      S.setPulse(false);
    }
  }

  var LIST = [];

  /* ==================================================================
     1. VF refrakter
     ================================================================== */
  LIST.push({
    id: 'vf_refractory', cat: 'arrest', badge: 'VF/pVT', title: 'VF refrakter di IGD', diff: 'Dasar', est: '8–12 menit',
    setting: 'IGD RS — tim resusitasi lengkap, defibrilator bifasik, troli emergensi.',
    stem: 'Laki-laki 58 tahun, perokok, datang dengan nyeri dada kiri sejak 1 jam. Saat triase pasien tiba-tiba kolaps. Anda tiba di bed: pasien tidak responsif, gasping, nadi karotis tidak teraba. Monitor 3 sadapan sudah terpasang.',
    objectives: ['RJP berkualitas dengan CCF ≥80%', 'Defibrilasi ≤2 menit', 'Epinefrin setelah shock ke-2, amiodaron setelah shock ke-3', 'Kenali ROSC & bundel pasca-ROSC (STEMI → cath lab)'],
    sets: ['post'],
    init: { rhythm: 'vf_coarse', pulse: false, weight: 75 },
    cause: 'acs', causeLabel: 'Trombosis koroner',
    exam: 'Tidak responsif, gasping, nadi karotis tidak teraba. Tidak ada trauma. Suara napas simetris saat ventilasi.',
    labs: function (S) {
      return S.phase === 'post' ? 'AGD: pH 7,21 · pCO₂ 48 · HCO₃⁻ 18 · laktat 5,8 · K⁺ 4,0 · Na⁺ 138 · Hb 14,1 g/dL.'
        : 'AGD (saat RJP): pH 7,14 · pCO₂ 55 · HCO₃⁻ 18 · laktat 7,2 · K⁺ 4,1 · Na⁺ 139 — elektrolit dalam batas normal.';
    },
    pocus: function (S) {
      return S.phase === 'post' ? 'Hipokinesis dinding anterior & apeks, kesan EF ±35%. Tidak ada efusi perikard. Lung sliding (+) bilateral.'
        : 'Gerakan miokard fibrilatoris. Tidak ada efusi perikard, ventrikel kanan tidak dilatasi, lung sliding (+) bilateral.';
    },
    ecg12: function () { return 'Sinus takikardia 108×/menit. Elevasi ST 3–4 mm di V1–V5, I, aVL; depresi ST resiprokal di II, III, aVF → STEMI anterior ekstensif.'; },
    onShock: function (S, s) {
      if (!s.ok) return false;
      var aa = S.dosesOf('amio300').length + S.dosesOf('lido').length;
      if (S.appShocks() >= 3 && S.dosesOf('epi1').length && aa) {
        S.rosc({ rhythm: 'stemi', rate: 108, sbp: 82, dbp: 50, spo2: 91, stemi: true });
      } else if (S.appShocks() >= 2) {
        S.setRhythm(S.appShocks() % 2 ? 'vf_coarse' : 'vf_fine');
      }
      return true;
    },
    criteria: function (S) { return arrestCriteria(S, { shockable: true, antiarr: true }).concat(postCriteria(S, { stemi: true })); },
    timeLimit: 1500
  });

  /* ==================================================================
     2. Torsades de pointes
     ================================================================== */
  LIST.push({
    id: 'torsades', cat: 'arrest', badge: 'pVT', title: 'Torsades de pointes di bangsal', diff: 'Menengah', est: '8–12 menit',
    setting: 'Bangsal penyakit dalam — tim code blue datang dengan defibrilator.',
    stem: 'Perempuan 46 tahun, rawat inap hari ke-3 karena pneumonia dan diare akut. Mendapat levofloksasin dan ondansetron. EKG pagi tadi: QTc 590 ms. Perawat menemukan pasien kejang singkat lalu tidak responsif; nadi tidak teraba.',
    objectives: ['Kenali VT polimorfik (torsades) sebagai ritme shockable', 'Defibrilasi unsynchronized', 'MgSO₄ untuk torsades; hindari amiodaron', 'Koreksi K⁺/Mg²⁺ & hentikan obat pemanjang QT'],
    sets: ['post'],
    init: { rhythm: 'torsades', pulse: false, weight: 55 },
    cause: 'hypomag', causeLabel: ['Hipo-/hiperkalemia', 'Toksin'],
    exam: 'Tidak responsif, tidak bernapas normal. Mukosa kering, turgor menurun.',
    labs: function () { return 'K⁺ 2,8 mmol/L (rendah) · Mg²⁺ 1,0 mg/dL (rendah) · Ca²⁺ normal · pH 7,22 · laktat 6,0.'; },
    pocus: function (S) { return S.phase === 'post' ? 'Kontraktilitas LV baik, tidak ada efusi perikard.' : 'Gerakan miokard kacau tanpa kontraksi efektif; tidak ada efusi; lung sliding (+) bilateral.'; },
    ecg12: function () { return 'Sinus 92×/menit, QTc 580 ms, gelombang U prominen. Tidak ada elevasi ST.'; },
    onAction: function (S, id) {
      if (id === 'mg' && justGiven(S, 'mg') && S.phase === 'arrest') { S.flags.causeTreated = true; S.good('MgSO₄ tepat untuk torsades de pointes.'); }
      if (id === 'labs') S.flags.labsDone = true;
    },
    onShock: function (S, s) {
      if (!s.ok) return false;
      if (S.dosesOf('mg').length) S.rosc({ rhythm: 'longqt', rate: 92, sbp: 102, dbp: 64, spo2: 93 });
      else if (S.appShocks() >= 2) S.obs('Monitor: torsades berulang setelah shock.');
      return true;
    },
    postHint: function (S) {
      if (!S.did('electrolyte')) return 'Koreksi K⁺ dan Mg²⁺ (target K⁺ ≥4, Mg²⁺ normal).';
      if (!S.did('stop_qt')) return 'Hentikan obat pemanjang QT (levofloksasin, ondansetron).';
      return null;
    },
    criteria: function (S) {
      var noAmio = !S.dosesOf('amio300').length && !S.dosesOf('amio150').length;
      return arrestCriteria(S, { shockable: true }).concat([
        item('MgSO₄ 1–2 g IV untuk torsades de pointes', 14, S.dosesOf('mg').length > 0, { critical: true, why: 'Magnesium adalah terapi spesifik torsades (QT memanjang).' }),
        item('Periksa elektrolit (K⁺, Mg²⁺)', 4, S.did('labs')),
        item('Hindari amiodaron pada torsades', 4, noAmio, { why: 'Amiodaron memperpanjang QT.' })
      ]).concat(postCriteria(S, { extra: [
        item('Koreksi K⁺/Mg²⁺ pasca-ROSC', 6, S.did('electrolyte')),
        item('Hentikan obat pemanjang QT', 5, S.did('stop_qt'))
      ] }));
    },
    timeLimit: 1500
  });

  /* ==================================================================
     3. Asistol → VF
     ================================================================== */
  LIST.push({
    id: 'asystole_vf', cat: 'arrest', badge: 'Asistol', title: 'Asistol yang berubah menjadi VF', diff: 'Menengah', est: '10–14 menit',
    setting: 'Ruang tunggu Puskesmas/IGD — tim membawa troli emergensi & defibrilator.',
    stem: 'Laki-laki 70 tahun dengan DM dan hipertensi ditemukan tidak sadar di kamar mandi (tidak disaksikan). Tidak responsif, tidak bernapas, nadi tidak teraba.',
    objectives: ['Kenali asistol: jangan di-shock', 'Epinefrin sesegera mungkin', 'Pantau perubahan ritme tiap 2 menit → pindah jalur VF', 'Bundel pasca-ROSC'],
    sets: ['post'],
    init: { rhythm: 'asystole', pulse: false, weight: 68 },
    exam: 'Tidak responsif, apnea, pupil isokor 4 mm, akral dingin. Tidak ada tanda trauma kepala.',
    labs: function () { return 'GDS 212 mg/dL · K⁺ 4,6 · Na⁺ 136 · pH 7,10 · laktat 8,0.'; },
    pocus: function (S) {
      if (S.phase === 'post') return 'Kontraktilitas global menurun ringan; tidak ada efusi.';
      return S.pt.rhythm === 'asystole' ? 'Tidak ada gerakan jantung (cardiac standstill). Tidak ada efusi perikard. Lung sliding (+).' : 'Gerakan miokard fibrilatoris; tidak ada efusi.';
    },
    ecg12: function () { return 'Sinus takikardia 104×/menit, LVH, depresi ST difus ringan (iskemia pasca-resusitasi). Tidak ada elevasi ST.'; },
    onAction: function (S, id) {
      if (id === 'epi1' && justGiven(S, 'epi1') && !S.flags.vfSched && S.pt.rhythm === 'asystole') {
        S.flags.vfSched = true;
        S.after(80, function (S2) { if (S2.phase === 'arrest') S2.setRhythm('vf_coarse'); });
      }
    },
    onShock: function (S, s) {
      if (!s.ok) return false;
      if (S.appShocks() >= 2) S.rosc({ rhythm: 'sinus_tach', rate: 104, sbp: 86, dbp: 52, spo2: 90 });
      else S.setRhythm('vf_fine');
      return true;
    },
    criteria: function (S) { return arrestCriteria(S, { shockable: false, mixed: true }).concat(postCriteria(S)); },
    timeLimit: 1500
  });

  /* ==================================================================
     4. PEA hiperkalemia
     ================================================================== */
  function hyperkCheck(S) {
    if (S.flags.caGiven && S.dosesOf('epi1').length && !S.flags.roscSched) {
      S.flags.roscSched = true;
      S.after(40, function (S2) {
        if (S2.phase === 'arrest') S2.rosc({ rhythm: 'hyperk', rate: 76, sbp: 84, dbp: 50, spo2: 92, consc: 'Tidak sadar (GCS 7), napas spontan lemah' });
      });
    }
  }
  LIST.push({
    id: 'pea_hyperk', cat: 'arrest', badge: 'PEA', title: 'PEA pada pasien hemodialisis', diff: 'Menengah', est: '8–12 menit',
    setting: 'IGD RS — pasien sudah terpasang IV line.',
    stem: 'Laki-laki 52 tahun, PGK stadium 5 on HD 2×/minggu, terlewat jadwal HD 1 minggu. Datang dengan lemas berat dan sesak. Saat anamnesis, pasien tiba-tiba tidak responsif. Monitor menunjukkan kompleks lebar dan lambat.',
    objectives: ['Kenali PEA (ritme terorganisir tanpa nadi)', 'Epinefrin sesegera mungkin', 'Identifikasi hiperkalemia → kalsium IV (± bikarbonat)', 'Terapi lanjutan hiperkalemia pasca-ROSC'],
    sets: ['post'],
    init: { rhythm: 'hyperk_slow', pulse: false, iv: true, weight: 64 },
    cause: 'hyperk', causeLabel: 'Hipo-/hiperkalemia',
    exam: 'Tidak responsif, nadi tidak teraba. Edema anasarka, fistula AV di lengan kiri (thrill +), ronki basah basal.',
    labs: function () { return 'K⁺ 8,4 mmol/L (!!) · pH 7,11 · HCO₃⁻ 11 · ureum 245 · kreatinin 14,2 · Na⁺ 131.'; },
    pocus: function (S) { return S.phase === 'post' ? 'Kontraktilitas menurun sedang, efusi perikard minimal tanpa tamponade, B-lines difus.' : 'Kontraksi miokard sangat lemah/tidak efektif. Efusi perikard minimal tanpa kolaps ruang jantung. B-lines difus bilateral.'; },
    ecg12: function () { return 'Sinus 76×/menit, QRS 140 ms, gelombang T tinggi runcing V2–V4, gelombang P mendatar → hiperkalemia berat.'; },
    onAction: function (S, id) {
      if (id === 'calcium' && justGiven(S, 'calcium') && S.phase === 'arrest' && !S.flags.caGiven) {
        S.flags.caGiven = true; S.flags.causeTreated = true;
        S.good('Kalsium IV menstabilkan membran miokard pada hiperkalemia.');
        S.after(30, function (S2) { if (S2.phase === 'arrest') S2.setRhythm('hyperk', 64); });
      }
      if (id === 'epi1' || id === 'calcium') hyperkCheck(S);
    },
    postHint: function (S) { return S.did('hyperk_tx') ? null : 'Lanjutkan terapi hiperkalemia: insulin-dekstrosa, salbutamol, konsul HD cito.'; },
    criteria: function (S) {
      return arrestCriteria(S, { shockable: false }).concat([
        item('Kalsium IV untuk hiperkalemia', 14, S.dosesOf('calcium').length > 0, { critical: true, why: 'Kalsium menstabilkan membran miokard dalam hitungan menit.' }),
        item('Konfirmasi dengan lab POC (K⁺) / EKG', 4, S.did('labs')),
        item('Natrium bikarbonat dipertimbangkan (hiperkalemia + asidosis)', 3, S.dosesOf('bicarb').length > 0)
      ]).concat(postCriteria(S, { extra: [item('Terapi lanjutan hiperkalemia (insulin-dekstrosa, salbutamol, HD cito)', 6, S.did('hyperk_tx'))] }));
    },
    timeLimit: 1500
  });

  /* ==================================================================
     5. PEA tension pneumothorax
     ================================================================== */
  LIST.push({
    id: 'pea_tension', cat: 'arrest', badge: 'PEA', title: 'PEA pasca-intubasi pada trauma toraks', diff: 'Mahir', est: '6–10 menit',
    setting: 'Ruang resusitasi IGD — pasien terintubasi, IV line & kapnografi terpasang.',
    stem: 'Laki-laki 34 tahun, korban KLL motor dengan trauma dada kanan. Diintubasi 10 menit lalu dan diventilasi manual. Bagging terasa makin berat, SpO₂ turun cepat, lalu nadi tidak teraba. Monitor: takikardia QRS sempit.',
    objectives: ['Kenali PEA', 'Telusuri H & T secara sistematis', 'Dekompresi jarum segera untuk tension pneumothorax', 'Chest tube definitif & resusitasi cairan'],
    sets: ['post'],
    init: { rhythm: 'pea_narrow', pulse: false, airway: 'adv', capno: true, iv: true, weight: 70 },
    cause: 'tension', causeLabel: 'Tension pneumothorax',
    exam: 'Trakea deviasi ke kiri, vena leher distensi, hemitoraks kanan hipersonor dengan suara napas menghilang, emfisema subkutis. Tekanan bagging sangat tinggi.',
    labs: function () { return 'pH 7,18 · pCO₂ 62 · pO₂ 48 · Hb 11,8 · K⁺ 4,2 · laktat 5,2.'; },
    pocus: function (S) { return S.flags.needle ? 'Lung sliding kanan mulai tampak setelah dekompresi.' : 'Lung sliding (−) hemitoraks kanan, barcode sign, lung point (+). Jantung: kontraksi lemah, tidak ada efusi perikard. VKI kolaps.'; },
    ecg12: function () { return 'Sinus takikardia 122×/menit, tidak ada elevasi ST.'; },
    onAction: function (S, id) {
      if (id === 'needle' && !S.flags.needle && S.phase === 'arrest') {
        S.flags.needle = true; S.flags.needleT = S.t; S.flags.causeTreated = true;
        S.obs('Udara mendesis keluar dari jarum; bagging menjadi jauh lebih ringan.');
        S.good('Tension pneumothorax didekompresi.');
        S.after(20, function (S2) { if (S2.phase === 'arrest') S2.rosc({ rhythm: 'sinus_tach', rate: 122, sbp: 80, dbp: 50, spo2: 90, consc: 'Tidak sadar (GCS 5), terintubasi' }); });
      }
    },
    postHint: function (S) {
      if (!S.did('chest_tube')) return 'Pasang chest tube (WSD) sebagai terapi definitif setelah dekompresi jarum.';
      return null;
    },
    criteria: function (S) {
      var nt = S.flags.needleT;
      return arrestCriteria(S, { shockable: false }).concat([
        item('Kenali & dekompresi tension pneumothorax', 16, !!S.flags.needle, { critical: true, why: 'Penyebab reversibel utama pada trauma toraks/ventilasi tekanan positif.' }),
        item('Dekompresi ≤5 menit sejak henti jantung', 6, nt !== undefined && nt - S.arr.start <= 300 ? 1 : nt !== undefined ? 0.5 : 0, { note: nt !== undefined ? 'Pada ' + fmt(nt) : 'Tidak dilakukan' }),
        item('Telusuri H & T / pemeriksaan terarah (fisik/POCUS)', 4, S.did('exam') || S.did('pocus') || S.did('hst'))
      ]).concat(postCriteria(S, { extra: [
        item('Chest tube (WSD) definitif', 6, S.did('chest_tube')),
        item('Resusitasi cairan/darah pada trauma', 4, S.did('fluid'))
      ] }));
    },
    timeLimit: 1200
  });

  /* ==================================================================
     6. Bradikardia — AV blok total
     ================================================================== */
  LIST.push({
    id: 'brady_chb', cat: 'periarrest', badge: 'Bradikardia', title: 'Bradikardia tidak stabil (AV blok total)', diff: 'Dasar', est: '6–10 menit',
    setting: 'IGD RS — defibrilator dengan fitur pacing transkutan tersedia.',
    stem: 'Perempuan 72 tahun, pusing dan hampir pingsan 2 kali hari ini, sesak ringan. Kesadaran somnolen, akral dingin dan lembap.',
    objectives: ['Kenali bradikardia dengan tanda syok', 'Atropin 1 mg (maks. 3 mg) — jangan menunda terapi lanjutan', 'Pacing transkutan atau infus dopamin/epinefrin', 'Konfirmasi capture, analgesia, konsul TVP'],
    sets: [],
    init: { rhythm: 'avb3', rate: 34, pulse: true, sbp: 78, dbp: 44, spo2: 91, consc: 'Somnolen, gelisah; akral dingin, CRT >3 detik', weight: 60 },
    paceThreshold: 75,
    exam: 'Somnolen (GCS 13), akral dingin & lembap, ronki basah halus basal. JVP normal. Tidak ada tanda trauma.',
    ecg12: function (S) {
      if (S.pace.on && S.pace.capture) return 'Ritme pacu ' + S.pace.rate + '×/menit: setiap spike diikuti QRS lebar (capture).';
      return 'Gelombang P reguler 82×/menit, QRS lebar (140 ms) reguler ' + S.pt.rate + '×/menit tanpa hubungan dengan P (disosiasi AV) → AV blok derajat 3 dengan escape ventrikel. Tidak ada elevasi ST.';
    },
    labs: function () { return 'K⁺ 4,4 · Mg²⁺ normal · troponin I sedikit meningkat · GDS 140. Tidak ada riwayat β-bloker/digoksin.'; },
    pocus: function () { return 'Kontraktilitas LV cukup; tidak ada efusi perikard; VKI 1,9 cm.'; },
    onAction: function (S, id) {
      if (S.phase === 'arrest') {
        if (id === 'epi1' && justGiven(S, 'epi1') && !S.flags.roscSched) {
          S.flags.roscSched = true;
          S.after(60, function (S2) { if (S2.phase === 'arrest') S2.rosc({ rhythm: 'avb3', rate: 32, sbp: 74, dbp: 42, spo2: 90, comatose: false, consc: 'Somnolen, akral dingin' }); });
        }
        return;
      }
      if (id === 'atropine' && justGiven(S, 'atropine')) {
        S.obs('Tidak ada perubahan laju ventrikel (' + S.pt.rate + '×/menit).');
        S.tip('Atropin sering tidak efektif pada AV blok derajat 3 dengan escape QRS lebar (blok infranodal).', 'Jangan menunda: lanjutkan ke pacing transkutan atau infus dopamin/epinefrin.');
      }
      if ((id === 'dopamine' || id === 'epi_inf') && (justGiven(S, 'dopamine') || justGiven(S, 'epi_inf')) && !S.flags.infusion) {
        S.flags.infusion = true;
        S.setRhythm('avb3', 54);
        S.pt.sbp = Math.max(S.pt.sbp, 98); S.pt.dbp = Math.max(S.pt.dbp, 60);
        S.pt.consc = 'Sadar, lebih responsif';
        S.obs('Laju escape meningkat ke 54×/menit, TD ' + S.pt.sbp + '/' + S.pt.dbp + ' mmHg.');
        if (!S.flags.stable) { S.flags.stable = true; S.flags.stableAt = S.t; }
      }
      if (id === 'consult') S.obs('Kardiologi: siapkan transvenous pacing (TVP) temporer, rawat ICCU, evaluasi pacemaker permanen.');
      if (id === 'sedation' && S.pace.on && S.pace.capture) S.pt.consc = 'Sadar, tenang (analgesia/sedasi ringan)';
    },
    onCapture: function (S, cap) {
      if (cap) {
        S.pt.sbp = Math.max(S.pt.sbp, 104); S.pt.dbp = Math.max(S.pt.dbp, 64); S.pt.spo2 = Math.max(S.pt.spo2, 94);
        S.pt.consc = S.flags.sedated ? 'Sadar, tenang (analgesia/sedasi ringan)' : 'Sadar, meringis kesakitan akibat kontraksi otot dada karena pacing';
        S.obs('TD membaik menjadi ' + S.pt.sbp + '/' + S.pt.dbp + ' mmHg.');
        if (!S.flags.stable) { S.flags.stable = true; S.flags.stableAt = S.t; }
        S.flags.paceStable = true;
        if (S.pace.rate < 60) S.tip('Laju pacing yang dianjurkan 60–80×/menit.', '');
      } else if (S.flags.paceStable && !S.flags.infusion) {
        S.flags.paceStable = false; S.flags.stable = false;
        S.pt.sbp = 78; S.pt.dbp = 44; S.pt.consc = 'Somnolen, gelisah; akral dingin';
        S.obs('Capture hilang — TD turun kembali ke 78/44 mmHg.');
      }
    },
    onTick: function (S) {
      deteriorate(S, { t1: 360, t2: 540, sbp: 64, dbp: 36, spo2: 87, consc: 'Hanya respons terhadap nyeri', rhythm: 'avb3', rate: 22 });
    },
    hint: function (S) {
      if (S.phase === 'arrest') return arrestHint(S);
      if (!S.defib.pads) return 'Bradikardia dengan tanda syok: pasang monitor & pads defibrilator.';
      if (!S.iv) return 'Pasang akses IV.';
      if (!S.o2) return 'SpO₂ ' + S.pt.spo2 + '% — berikan O₂.';
      if (!S.dosesOf('atropine').length && !S.flags.stable) return 'Berikan atropin 1 mg IV sebagai lini pertama.';
      if (!S.flags.stable) {
        if (S.pace.on && !S.pace.capture) return 'Naikkan mA bertahap hingga capture (setiap spike diikuti QRS lebar).';
        return 'Atropin tidak efektif → mulai pacing transkutan (pacing ON, laju 60–80, naikkan mA) atau infus dopamin/epinefrin.';
      }
      if (S.pace.on && S.pace.capture && !S.flags.mechCapture) return 'Konfirmasi mechanical capture: cek nadi.';
      if (S.pace.on && !S.flags.sedated) return 'Berikan analgesia/sedasi untuk kenyamanan pacing.';
      if (!S.did('ecg12')) return 'Rekam EKG 12 sadapan.';
      if (!S.did('consult')) return 'Konsul kardiologi untuk transvenous pacing.';
      return 'Pasien stabil — lakukan serah terima ke ICCU.';
    },
    criteria: function (S) {
      var at = S.dosesOf('atropine').length, sa = S.flags.stableAt;
      var paced = S.did('pace_on');
      var out = [
        item('Pasang monitor/pads pada bradikardia tidak stabil', 6, S.defib.pads),
        item('Oksigen untuk SpO₂ <94%', 4, S.o2),
        item('Akses IV & EKG 12 sadapan', 6, (S.iv ? 0.5 : 0) + (S.did('ecg12') ? 0.5 : 0)),
        item('Atropin 1 mg sebagai terapi awal (maks. 3 mg)', 8, at ? (at <= 3 ? 1 : 0.5) : 0, { why: 'AHA 2025: atropin 1 mg IV tiap 3–5 menit, maks. 3 mg.' }),
        item('Pacing transkutan / infus kronotropik dimulai ≤5 menit', 16, sa !== undefined && sa <= 300 ? 1 : S.flags.stable ? 0.5 : 0,
          { critical: true, note: sa !== undefined ? 'Stabil pada ' + fmt(sa) : 'Tidak tercapai', why: 'Bila atropin tidak efektif: pacing transkutan atau dopamin 5–20 mcg/kg/menit / epinefrin 2–10 mcg/menit.' })
      ];
      if (paced) {
        out.push(item('Konfirmasi mechanical capture (cek nadi)', 6, !!S.flags.mechCapture));
        out.push(item('Analgesia/sedasi untuk pacing', 4, !!S.flags.sedated));
      }
      out.push(item('Konsul kardiologi untuk TVP/pacemaker', 8, S.did('consult')));
      out.push(item('Pasien tidak jatuh ke henti jantung', 6, !S.flags.arrested));
      if (S.arr.episodes) out = out.concat(arrestCriteria(S, { shockable: false }).filter(function (c) { return !/ROSC/.test(c.label); }));
      return out;
    },
    outcome: function (S) {
      if (S.flags.arrested && S.phase === 'arrest') return { ok: false, text: 'Pasien jatuh ke henti jantung dan belum ROSC.' };
      return S.flags.stable ? { ok: true, text: 'Hemodinamik stabil dengan ' + (S.flags.paceStable ? 'pacing transkutan' : 'infus kronotropik') + '.' } : { ok: false, text: 'Bradikardia belum teratasi.' };
    },
    timeLimit: 1200
  });

  /* ==================================================================
     7. SVT stabil
     ================================================================== */
  function convert(S, rate, sbp, dbp, msg) {
    S.setRhythm('sinus', rate);
    S.pt.sbp = sbp; S.pt.dbp = dbp;
    S.flags.converted = true; S.flags.convertedAt = S.t; S.flags.stable = true;
    S.obs(msg || ('Monitor: konversi ke ritme sinus ' + rate + '×/menit.'));
  }
  LIST.push({
    id: 'svt_stable', cat: 'periarrest', badge: 'Takikardia', title: 'SVT stabil', diff: 'Dasar', est: '5–8 menit',
    setting: 'IGD — monitor & defibrilator tersedia.',
    stem: 'Perempuan 28 tahun berdebar mendadak sejak 40 menit, tanpa nyeri dada, sesak berat, atau pingsan. Sadar penuh, akral hangat.',
    objectives: ['Nilai stabilitas', 'EKG 12 sadapan sebelum terapi', 'Manuver vagal → adenosin 6 mg → 12 mg', 'Tidak melakukan kardioversi pada pasien stabil'],
    sets: [],
    init: { rhythm: 'svt', rate: 186, pulse: true, sbp: 118, dbp: 76, spo2: 98, consc: 'Sadar penuh, cemas, berdebar', weight: 52 },
    exam: 'Sadar, tidak sesak, akral hangat, CRT <2 detik, paru bersih. Tidak ada tanda gagal jantung.',
    ecg12: function (S) {
      return S.flags.converted ? 'Sinus 92×/menit, PR & QRS normal, tidak ada pre-eksitasi (delta wave).'
        : 'Takikardia QRS sempit (80 ms) reguler 186×/menit, gelombang P tidak tampak (pseudo-r′ di V1) → SVT, kemungkinan AVNRT.';
    },
    labs: function () { return 'K⁺ 3,9 · Mg²⁺ normal · TSH dikirim.'; },
    onAction: function (S, id) {
      if (S.phase !== 'pre' || S.flags.converted) return;
      if (id === 'vagal') { S.flags.vagal = true; S.obs('HR melambat sesaat ke 170×/menit lalu kembali 186×/menit — tidak konversi.'); }
      if (id === 'adeno6' && justGiven(S, 'adeno6')) {
        S.setRhythm('pause');
        S.obs('Monitor: jeda singkat (pasien merasa dada tidak nyaman), lalu SVT kembali.');
        S.after(3, function (S2) { if (!S2.flags.converted) S2.setRhythm('svt', 186); });
      }
      if (id === 'adeno12' && justGiven(S, 'adeno12')) {
        S.setRhythm('pause');
        S.after(4, function (S2) { convert(S2, 92, 116, 74, 'Monitor: setelah jeda singkat, ritme sinus 92×/menit.'); });
      }
      if (id === 'bb_ccb' && justGiven(S, 'bb_ccb')) S.after(60, function (S2) { if (!S2.flags.converted) convert(S2, 88, 110, 70); });
    },
    onShock: function (S, s) {
      if (s.cv && S.pt.rhythm === 'svt') {
        S.warn('cv_stable', 'Kardioversi pada SVT yang stabil — belum diperlukan.', 4, 'Pasien stabil: manuver vagal → adenosin → CCB/β-bloker. Kardioversi bila tidak stabil atau terapi farmakologis gagal.');
        convert(S, 94, 114, 72);
        return true;
      }
      if (!s.pulse && s.ok) { S.rosc({ rhythm: 'sinus', rate: 96, sbp: 100, dbp: 62, spo2: 95, comatose: false, consc: 'Sadar kembali, bingung' }); return true; }
      return false;
    },
    hint: function (S) {
      if (S.phase === 'arrest') return arrestHint(S);
      if (S.phase === 'post') return 'Pasien kembali bernadi — rekam EKG 12 sadapan dan serah terima.';
      if (!S.did('ecg12') && !S.flags.converted) return 'Pasien stabil — rekam EKG 12 sadapan dahulu.';
      if (!S.iv) return 'Pasang akses IV (vena antecubiti besar untuk adenosin).';
      if (!S.flags.converted) {
        if (!S.flags.vagal) return 'Lakukan manuver vagal (Valsalva modifikasi).';
        if (!S.dosesOf('adeno6').length) return 'Vagal gagal → adenosin 6 mg IV bolus cepat + flush 20 mL.';
        if (!S.dosesOf('adeno12').length) return 'Belum konversi → adenosin 12 mg IV bolus cepat.';
        return 'Pertimbangkan diltiazem/β-bloker IV.';
      }
      if (!S.didAfter('ecg12', S.flags.convertedAt)) return 'Konversi berhasil — rekam EKG 12 sadapan ulang (cari pre-eksitasi).';
      return 'Selesai — edukasi pasien, rencanakan rujukan EP; lakukan serah terima.';
    },
    criteria: function (S) {
      var e1 = S.firstAct('ecg12'), vg = S.firstAct('vagal'), a6 = firstDose(S, 'adeno6'), a12 = firstDose(S, 'adeno12');
      var cv = S.flags.convertedAt === undefined ? null : S.flags.convertedAt;
      return [
        item('EKG 12 sadapan sebelum terapi', 8, before(e1, cv)),
        item('Akses IV', 4, S.iv),
        item('Manuver vagal sebagai langkah pertama', 12, vg !== null && (a6 === null || vg <= a6)),
        item('Adenosin 6 mg bolus cepat + flush', 12, a6 !== null),
        item('Adenosin 12 mg bila 6 mg gagal', 10, a12 !== null && a6 !== null && a12 > a6 ? 1 : (S.flags.converted && !a12 ? 0.5 : 0)),
        item('Konversi ke ritme sinus', 10, !!S.flags.converted, { critical: true }),
        item('Tidak melakukan kardioversi pada pasien stabil', 8, cvShocks(S).length === 0 && unsyncShocks(S).length === 0, { critical: true }),
        item('EKG 12 sadapan pasca-konversi', 6, cv !== null && S.didAfter('ecg12', cv), { why: 'Mencari pre-eksitasi (WPW) dan iskemia.' })
      ];
    },
    outcome: function (S) { return S.flags.converted ? { ok: true, text: 'SVT berhasil dikonversi ke ritme sinus.' } : { ok: false, text: 'SVT belum terkonversi.' }; },
    timeLimit: 900
  });

  /* ==================================================================
     8. VT dengan nadi, tidak stabil
     ================================================================== */
  LIST.push({
    id: 'vt_unstable', cat: 'periarrest', badge: 'Takikardia', title: 'VT dengan nadi — tidak stabil', diff: 'Menengah', est: '5–8 menit',
    setting: 'IGD — defibrilator bifasik, obat sedasi tersedia.',
    stem: 'Laki-laki 63 tahun, riwayat infark miokard 3 tahun lalu, berdebar dan nyeri dada 30 menit. Kini gelisah, bingung, keringat dingin.',
    objectives: ['Kenali takikardia QRS lebar tidak stabil', 'Kardioversi tersinkronisasi (SYNC ON) segera', 'Sedasi bila memungkinkan, jangan menunda', 'Amiodaron infus pasca-konversi'],
    sets: ['post'],
    init: { rhythm: 'vt', rate: 176, pulse: true, sbp: 74, dbp: 42, spo2: 92, consc: 'Gelisah, bingung, keringat dingin, nyeri dada', weight: 72 },
    exam: 'GCS 14, akral dingin, CRT 4 detik, ronki basah basal bilateral. Nadi cepat & lemah.',
    ecg12: function (S) {
      return S.flags.converted ? 'Sinus 98×/menit, gelombang Q patologis V1–V4 (infark lama), tidak ada elevasi ST akut.'
        : 'Takikardia QRS lebar (160 ms) monomorfik reguler 176×/menit, disosiasi AV, fusion beat → VT monomorfik.';
    },
    labs: function () { return 'K⁺ 3,4 · Mg²⁺ 1,7 · troponin meningkat ringan.'; },
    onShock: function (S, s) {
      if (s.cv && S.pt.rhythm === 'vt') {
        if (s.energy >= 100) convert(S, 98, 104, 66, 'Monitor: VT terkonversi ke ritme sinus 98×/menit; TD 104/66 mmHg.');
        else S.obs('Kardioversi ' + s.energy + ' J gagal — VT persisten. Naikkan energi.');
        if (S.flags.converted) S.pt.consc = 'Sadar, lebih tenang';
        return true;
      }
      if (!s.pulse && s.ok) {
        S.rosc({ rhythm: 'sinus', rate: 98, sbp: 96, dbp: 60, spo2: 93, comatose: false, consc: 'Mulai sadar, bingung' });
        S.flags.converted = true; S.flags.convertedAt = S.t;
        return true;
      }
      return false;
    },
    onTick: function (S) {
      if (!S.flags.converted && S.phase === 'pre' && S.t >= 240 && !S.flags.arrested) {
        S.flags.arrested = true;
        S.setPulse(false);
      }
    },
    hint: function (S) {
      if (S.phase === 'arrest') return arrestHint(S);
      if (!S.flags.converted) {
        if (!S.defib.pads) return 'VT dengan tanda syok — pasang pads segera.';
        if (!S.defib.sync) return 'Aktifkan SYNC untuk kardioversi tersinkronisasi.';
        if (!S.flags.sedated && S.iv) return 'Bila memungkinkan berikan sedasi singkat — jangan menunda.';
        if (!S.defib.charged) return 'Pilih energi (mis. 100 J) lalu charge.';
        return 'Tekan SHOCK (tahan hingga shock tersinkron keluar).';
      }
      if (!S.didAfter('amio_inf', S.flags.convertedAt)) return 'Konversi berhasil — mulai amiodaron 150 mg IV dalam 10 menit.';
      if (!S.didAfter('ecg12', S.flags.convertedAt)) return 'Rekam EKG 12 sadapan pasca-konversi.';
      if (!S.did('labs')) return 'Periksa elektrolit (K⁺, Mg²⁺).';
      if (!S.did('consult')) return 'Konsul kardiologi.';
      return 'Stabil — serah terima ke ICCU.';
    },
    criteria: function (S) {
      var cv = cvShocks(S), first = cv.length ? cv[0] : null, ca = S.flags.convertedAt === undefined ? null : S.flags.convertedAt;
      var drugsBefore = ['adeno6', 'adeno12', 'amio_inf', 'amio300'].some(function (id) { var d = firstDose(S, id); return d !== null && (first === null || d < first.t); });
      var out = [
        item('Kardioversi tersinkronisasi untuk VT tidak stabil', 20, first !== null, { critical: true }),
        item('Kardioversi ≤3 menit sejak awal', 8, first !== null && first.t <= 180, { note: first ? 'Pada ' + fmt(first.t) : '' }),
        item('Energi awal sesuai perangkat (≥100 J bifasik)', 5, first !== null && first.energy >= 100),
        item('Tidak ada shock unsynchronized pada pasien bernadi', 8, unsyncShocks(S).length === 0, { critical: true }),
        item('Sedasi/analgesia sebelum kardioversi bila memungkinkan', 4, S.firstAct('sedation') !== null && first !== null && S.firstAct('sedation') < first.t),
        item('Tidak menunda kardioversi dengan obat', 6, !drugsBefore, { why: 'Pasien tidak stabil → listrik dulu.' }),
        item('Amiodaron 150 mg IV infus pasca-konversi', 6, ca !== null && S.didAfter('amio_inf', ca)),
        item('EKG 12 sadapan & elektrolit pasca-konversi', 6, (ca !== null && S.didAfter('ecg12', ca) ? 0.5 : 0) + (S.did('labs') ? 0.5 : 0)),
        item('Konsul kardiologi', 4, S.did('consult'))
      ];
      if (S.arr.episodes) out = out.concat(arrestCriteria(S, { shockable: true }));
      return out;
    },
    outcome: function (S) { return S.flags.converted && S.pt.pulse ? { ok: true, text: 'VT terkonversi ke ritme sinus.' } : { ok: false, text: 'VT belum teratasi.' }; },
    timeLimit: 1200
  });

  /* ==================================================================
     9. AF RVR tidak stabil
     ================================================================== */
  LIST.push({
    id: 'af_unstable', cat: 'periarrest', badge: 'Takikardia', title: 'AF respons cepat dengan edema paru', diff: 'Menengah', est: '5–8 menit',
    setting: 'IGD — defibrilator bifasik.',
    stem: 'Laki-laki 67 tahun dengan hipertensi, sesak berat sejak 2 jam dan berdebar. Tampak gelisah, berkeringat, bicara terputus-putus.',
    objectives: ['Kenali AF RVR tidak stabil', 'Kardioversi tersinkronisasi energi awal ≥200 J (AHA 2025)', 'Hindari CCB/β-bloker pada hipotensi', 'Antikoagulan pasca-kardioversi'],
    sets: ['af'],
    init: { rhythm: 'af', rate: 164, pulse: true, sbp: 78, dbp: 50, spo2: 88, consc: 'Sadar, sesak berat, gelisah, keringat dingin', weight: 78 },
    exam: 'RR 32×/menit, ortopnea, ronki basah hingga setengah lapang paru, JVP meningkat, akral dingin. Nadi ireguler.',
    ecg12: function (S) {
      return S.flags.converted ? 'Sinus 94×/menit, LVH, tidak ada elevasi ST.' : 'Fibrilasi atrium dengan respons ventrikel cepat ±164×/menit, QRS sempit, tanpa gelombang P, RR ireguler. Tidak ada elevasi ST.';
    },
    labs: function () { return 'K⁺ 4,1 · Mg²⁺ normal · troponin normal · NT-proBNP meningkat · TSH dikirim.'; },
    onShock: function (S, s) {
      if (s.cv && S.pt.rhythm === 'af') {
        if (s.energy >= 200) { convert(S, 94, 108, 70); S.pt.spo2 = 93; S.pt.consc = 'Sadar, sesak berkurang'; }
        else {
          S.obs('Kardioversi ' + s.energy + ' J gagal — tetap fibrilasi atrium.');
          S.tip('Eskalasi energi.', 'AHA 2025: untuk AF, energi awal kardioversi bifasik ≥200 J lebih mungkin berhasil pada shock pertama.');
        }
        return true;
      }
      if (!s.pulse && s.ok) { S.rosc({ rhythm: 'sinus', rate: 96, sbp: 92, dbp: 58, spo2: 90, comatose: false, consc: 'Mulai sadar' }); S.flags.converted = true; S.flags.convertedAt = S.t; return true; }
      return false;
    },
    onAction: function (S, id) {
      if (S.phase === 'arrest' && id === 'epi1' && justGiven(S, 'epi1') && !S.flags.roscSched) {
        S.flags.roscSched = true;
        S.after(70, function (S2) { if (S2.phase === 'arrest') S2.rosc({ rhythm: 'af', rate: 150, sbp: 72, dbp: 44, spo2: 86, comatose: false, consc: 'Somnolen, sesak' }); });
      }
    },
    onTick: function (S) {
      deteriorate(S, { t1: 300, t2: 480, sbp: 66, dbp: 40, spo2: 82, consc: 'Somnolen, napas makin berat' });
    },
    hint: function (S) {
      if (S.phase === 'arrest') return arrestHint(S);
      if (!S.flags.converted) {
        if (!S.o2) return 'SpO₂ ' + S.pt.spo2 + '% — berikan O₂.';
        if (!S.defib.pads) return 'AF RVR dengan hipotensi & edema paru = tidak stabil → pasang pads.';
        if (!S.defib.sync) return 'Aktifkan SYNC.';
        if (!S.defib.charged) return 'Pilih energi ≥200 J (AHA 2025 untuk AF), lalu charge.';
        return 'Tekan SHOCK.';
      }
      if (!S.did('anticoag')) return 'Konversi berhasil — berikan antikoagulan (heparin/enoksaparin).';
      if (!S.didAfter('ecg12', S.flags.convertedAt)) return 'Rekam EKG 12 sadapan pasca-kardioversi.';
      return 'Stabil — serah terima ke ICCU.';
    },
    criteria: function (S) {
      var cv = cvShocks(S), first = cv.length ? cv[0] : null, ca = S.flags.convertedAt === undefined ? null : S.flags.convertedAt;
      var ccbBefore = firstDose(S, 'bb_ccb') !== null && (ca === null || firstDose(S, 'bb_ccb') < ca);
      var out = [
        item('Kardioversi tersinkronisasi untuk AF tidak stabil', 20, first !== null, { critical: true }),
        item('Energi awal ≥200 J bifasik', 10, first !== null && first.energy >= 200, { note: first ? 'Energi awal ' + first.energy + ' J' : '', why: 'AHA 2025: energi awal ≥200 J untuk kardioversi AF dengan defibrilator bifasik.' }),
        item('Tidak ada shock unsynchronized', 8, unsyncShocks(S).length === 0, { critical: true }),
        item('Kardioversi ≤5 menit', 6, first !== null && first.t <= 300),
        item('Oksigen untuk SpO₂ 88%', 4, S.o2),
        item('Sedasi/analgesia bila memungkinkan', 4, S.firstAct('sedation') !== null && first !== null && S.firstAct('sedation') < first.t),
        item('Tidak memberi CCB/β-bloker saat hipotensi', 6, !ccbBefore),
        item('Akses IV & EKG 12 sadapan', 6, (S.iv ? 0.5 : 0) + (S.did('ecg12') ? 0.5 : 0)),
        item('Antikoagulan pasca-kardioversi', 6, S.did('anticoag'))
      ];
      if (S.arr.episodes) out = out.concat(arrestCriteria(S, { shockable: false }));
      return out;
    },
    outcome: function (S) { return S.flags.converted && S.pt.rhythm === 'sinus' ? { ok: true, text: 'AF terkonversi ke ritme sinus; hemodinamik membaik.' } : { ok: false, text: 'AF RVR belum teratasi.' }; },
    timeLimit: 1200
  });

  /* ==================================================================
     10. STEMI di RS tanpa cath lab (dengan VF)
     ================================================================== */
  LIST.push({
    id: 'acs_stemi', cat: 'acs', badge: 'SKA', title: 'STEMI di RS tanpa cath lab', diff: 'Menengah', est: '8–12 menit',
    setting: 'IGD RS tipe C (tanpa cath lab). RS PCI terdekat ±3 jam perjalanan. Waktu skenario dimulai saat pasien tiba (door time).',
    stem: 'Laki-laki 56 tahun, perokok, nyeri dada kiri seperti ditindih menjalar ke lengan kiri sejak 60 menit, disertai keringat dingin. Sadar, nyeri VAS 8/10.',
    objectives: ['EKG 12 sadapan ≤10 menit', 'Aspirin, nitrat, P2Y12, antikoagulan; O₂ hanya bila SpO₂ <90%', 'Fibrinolitik ≤30 menit bila PCI >120 menit, lalu rujuk (farmako-invasif)', 'Siaga aritmia: VF → defibrilasi segera'],
    sets: ['acs', 'post'],
    init: { rhythm: 'stemi', rate: 96, pulse: true, sbp: 148, dbp: 92, spo2: 97, consc: 'Sadar, nyeri dada VAS 8/10, diaforesis', weight: 74 },
    exam: 'Sadar, diaforesis, paru bersih, tidak ada S3, JVP normal → Killip I.',
    ecg12: function () { return 'Sinus ' + 96 + '×/menit. Elevasi ST 3 mm V1–V4 dan 1 mm aVL; depresi resiprokal III, aVF → STEMI anterior.'; },
    labs: function () { return 'Troponin, darah rutin, elektrolit, fungsi ginjal dikirim — hasil ±45 menit. Jangan menunda reperfusi menunggu troponin.'; },
    lyticCheck: function () { return 'Tidak ada kontraindikasi absolut (tanpa riwayat perdarahan intrakranial, stroke iskemik <3 bulan, perdarahan aktif, trauma kepala; TD 148/92). Onset ±70 menit; PCI tidak dapat dicapai ≤120 menit → fibrinolitik diindikasikan.'; },
    onAction: function (S, id) {
      if (id === 'primary_pci' && S.phase !== 'arrest') {
        S.obs('Fasilitas ini tidak memiliki cath lab; transfer untuk PCI primer diperkirakan >120 menit.');
        S.warn('pci_unavailable', 'PCI primer tidak dapat dicapai ≤120 menit dari fasilitas ini.', 2, 'Bila PCI tidak tersedia ≤120 menit sejak diagnosis STEMI, berikan fibrinolitik ≤30 menit lalu rujuk (strategi farmako-invasif).');
      }
      if (id === 'lytic' && justGiven(S, 'lytic')) {
        if (!S.did('ecg12')) S.err('lytic_noecg', 'Fibrinolitik tanpa EKG 12 sadapan diagnostik.', 10, '');
        else if (!S.did('lytic_check')) S.warn('lytic_nocheck', 'Fibrinolitik tanpa menelaah kontraindikasi.', 4, 'Selalu telaah ceklis kontraindikasi absolut & relatif sebelum fibrinolitik.');
        if (S.phase === 'arrest') S.warn('lytic_arrest', 'Fibrinolitik saat RJP bukan terapi rutin.', 3, '');
      }
    },
    onTick: function (S) {
      if (!S.flags.vf) {
        var lt = S.lastDose('lytic');
        if (S.t >= 270 || (lt !== null && S.t - lt >= 40)) {
          S.flags.vf = true;
          S.setRhythm('vf_coarse');
          S.setPulse(false);
        }
      }
    },
    onShock: function (S, s) {
      if (!s.pulse && s.ok) { S.rosc({ rhythm: 'stemi', rate: 104, sbp: 118, dbp: 72, spo2: 95, comatose: false, consc: 'Sadar kembali, bingung, masih nyeri dada' }); return true; }
      return false;
    },
    hint: function (S) {
      if (S.phase === 'arrest') return arrestHint(S);
      if (!S.did('ecg12')) return 'Rekam EKG 12 sadapan dalam 10 menit pertama.';
      if (!S.did('aspirin')) return 'STEMI: aspirin 160–325 mg dikunyah.';
      if (!S.iv) return 'Pasang akses IV.';
      if (!S.did('nitrate') && S.pt.sbp >= 90) return 'Nitrat sublingual untuk nyeri (tanpa kontraindikasi).';
      if (!S.did('p2y12')) return 'Clopidogrel 300 mg loading.';
      if (!S.did('anticoag')) return 'Antikoagulan parenteral (enoksaparin/UFH).';
      if (!S.did('lytic_check')) return 'PCI tidak tersedia ≤120 menit → telaah kontraindikasi fibrinolitik.';
      if (!S.dosesOf('lytic').length) return 'Berikan fibrinolitik (target door-to-needle ≤30 menit).';
      if (!S.did('pci_transfer')) return 'Rujuk ke RS PCI (angiografi 2–24 jam pasca-fibrinolitik; segera bila gagal reperfusi).';
      return 'Tata laksana lengkap — serah terima/rujuk.';
    },
    criteria: function (S) {
      var e1 = S.firstAct('ecg12'), lt = firstDose(S, 'lytic'), lc = S.firstAct('lytic_check');
      var out = [
        item('EKG 12 sadapan ≤10 menit sejak tiba', 12, e1 !== null && e1 <= 600, { critical: true, note: e1 !== null ? 'Pada ' + fmt(e1) : 'Tidak direkam' }),
        item('Aspirin 160–325 mg dikunyah', 10, S.did('aspirin')),
        item('Nitrat sublingual (tanpa kontraindikasi)', 4, S.did('nitrate')),
        item('Tidak memberi O₂ rutin pada SpO₂ ≥90%', 4, !S.did('o2'), { why: 'AHA: O₂ pada SKA hanya bila SpO₂ <90%.' }),
        item('P2Y12 inhibitor (clopidogrel) loading', 6, S.did('p2y12')),
        item('Antikoagulan parenteral', 6, S.dosesOf('anticoag').length > 0),
        item('Telaah kontraindikasi sebelum fibrinolitik', 6, lc !== null && (lt === null || lc <= lt)),
        item('Fibrinolitik ≤30 menit (door-to-needle)', 14, lt !== null && lt <= 1800 ? 1 : lt !== null ? 0.5 : 0, { critical: true, note: lt !== null ? 'Pada ' + fmt(lt) : 'Tidak diberikan' }),
        item('Rujuk ke RS PCI (strategi farmako-invasif)', 8, S.did('pci_transfer'))
      ];
      if (S.arr.episodes) {
        var a = S.arr, d0 = a.delays.length ? a.delays[0] : null, sd = a.shockDelays.length ? a.shockDelays[0] : null;
        out.push(item('Kompresi segera saat henti jantung (≤10 detik)', 6, d0 !== null && d0 <= 10 ? 1 : d0 !== null && d0 <= 20 ? 0.5 : 0, { note: d0 !== null ? Math.round(d0) + ' detik' : 'Tidak dimulai' }));
        out.push(item('Defibrilasi ≤2 menit sejak VF', 12, sd !== null && sd <= 120 ? 1 : sd !== null ? 0.5 : 0, { critical: true, note: sd !== null ? Math.round(sd) + ' detik' : 'Tidak ada shock' }));
        out.push(item('ROSC dikenali (cek nadi)', 4, a.recognized !== null));
      }
      return out;
    },
    outcome: function (S) {
      if (S.phase === 'arrest') return { ok: false, text: 'Pasien masih dalam henti jantung saat skenario berakhir.' };
      return S.dosesOf('lytic').length ? { ok: true, text: 'Reperfusi farmakologis diberikan; pasien dirujuk untuk strategi farmako-invasif.' } : { ok: false, text: 'Reperfusi belum diberikan.' };
    },
    timeLimit: 2700
  });

  /* ==================================================================
     11. Stroke iskemik akut
     ================================================================== */
  LIST.push({
    id: 'stroke', cat: 'stroke', badge: 'Stroke', title: 'Stroke iskemik akut — jendela trombolisis', diff: 'Menengah', est: '8–12 menit',
    setting: 'IGD RS dengan CT scan 24 jam & tim stroke. Waktu skenario dimulai saat pasien tiba (door time). Beberapa tindakan memakan waktu simulasi (CT, NIHSS, titrasi TD).',
    stem: 'Perempuan 64 tahun dengan hipertensi tidak terkontrol, tiba-tiba bicara pelo dan lengan-tungkai kanan lemah saat sarapan. Last known well (LKW) 70 menit sebelum tiba di IGD.',
    objectives: ['Cek gula darah', 'Door-to-CT ≤20 menit, door-to-needle ≤60 menit', 'TD <185/110 sebelum trombolisis', 'CTA → identifikasi LVO → trombektomi', 'Tidak memberi antiplatelet sebelum CT/24 jam pasca-trombolisis'],
    sets: ['stroke'],
    init: { rhythm: 'sinus', rate: 88, pulse: true, sbp: 196, dbp: 108, spo2: 97, consc: 'Sadar, afasia motorik, hemiparesis kanan', weight: 62 },
    exam: 'GCS E4M6V afasia. Wajah mencong ke kanan, hemiparesis kanan (motorik 1–2/5), deviasi konjugat ke kiri. Tidak ada kejang atau trauma kepala.',
    glucose: 'GDS 138 mg/dL — bukan hipoglikemia.',
    nihss: 'NIHSS 16 (afasia, hemiparesis kanan berat, deviasi gaze) → stroke berat, curiga oklusi pembuluh besar (LVO).',
    ctResult: 'Tidak ada perdarahan intrakranial. ASPECTS 9. Hiperdens arteri serebri media kiri (dense MCA sign).',
    ctaResult: 'Oklusi M1 arteri serebri media kiri (LVO) → kandidat trombektomi mekanik.',
    ecg12: function () { return 'Sinus 88×/menit, LVH, tanpa fibrilasi atrium, tanpa elevasi ST.'; },
    labs: function () { return 'Darah rutin, elektrolit, INR/aPTT, fungsi ginjal dikirim — hasil ±45 menit. Tanpa riwayat antikoagulan/koagulopati, trombolisis tidak perlu menunggu hasil.'; },
    lysisCheck: function (S) {
      var ok = S.pt.sbp < 185 && S.pt.dbp < 110;
      return 'Waktu sejak LKW: ' + fmt(4200 + S.t) + ' (batas 4,5 jam). Tidak ada riwayat perdarahan intrakranial, operasi besar/trauma baru, atau antikoagulan. ' +
        (S.flags.glucoseChecked ? 'GDS normal. ' : 'GDS BELUM diperiksa. ') + (S.did('ct') ? 'CT: tanpa perdarahan. ' : 'CT BELUM dikerjakan. ') +
        'TD saat ini ' + S.pt.sbp + '/' + S.pt.dbp + (ok ? ' — memenuhi syarat (<185/110).' : ' — BELUM memenuhi syarat; turunkan <185/110 dahulu.');
    },
    onAction: function (S, id) {
      if (id === 'bp_lower' && justGiven(S, 'bp_lower')) {
        var n = S.dosesOf('bp_lower').length;
        if (n === 1) { S.pt.sbp = 178; S.pt.dbp = 100; }
        else if (n === 2) { S.pt.sbp = 166; S.pt.dbp = 94; }
        else {
          S.pt.sbp = 138; S.pt.dbp = 80;
          S.warn('bp_aggressive', 'Penurunan TD berlebihan pada stroke iskemik akut.', 3, 'Target <185/110 sebelum trombolisis dan <180/105 selama 24 jam setelahnya; hindari penurunan drastis yang mengurangi perfusi penumbra.');
        }
        S.obs('TD kini ' + S.pt.sbp + '/' + S.pt.dbp + ' mmHg.');
      }
      if (id === 'ivt' && justGiven(S, 'ivt')) {
        S.flags.bpAtIvt = S.pt.sbp < 185 && S.pt.dbp < 110;
        if (!S.did('ct')) S.err('ivt_noct', 'Trombolisis sebelum CT kepala!', 20, 'CT non-kontras wajib untuk menyingkirkan perdarahan sebelum trombolisis.');
        if (!S.flags.bpAtIvt) S.err('ivt_bp', 'Trombolisis dengan TD ≥185/110 mmHg.', 10, 'Risiko perdarahan intrakranial meningkat. Turunkan TD dahulu dengan labetalol/nikardipin.');
        if (!S.flags.glucoseChecked) S.err('ivt_nogds', 'Trombolisis tanpa cek gula darah.', 6, 'Hipoglikemia dapat menyerupai stroke.');
      }
      if (id === 'evt' && !S.did('cta')) S.warn('evt_nocta', 'Rujuk trombektomi tanpa konfirmasi LVO (CTA).', 3, 'CTA mengonfirmasi oklusi pembuluh besar; kerjakan segera tanpa menunda trombolisis.');
    },
    hint: function (S) {
      if (!S.did('stroke_code')) return 'Defisit neurologis fokal akut — aktifkan kode stroke.';
      if (!S.flags.glucoseChecked) return 'Cek gula darah kapiler (singkirkan hipoglikemia).';
      if (!S.did('nihss')) return 'Lakukan NIHSS singkat.';
      if (!S.did('ct')) return 'CT kepala non-kontras segera (target door-to-CT ≤20 menit).';
      if (S.pt.sbp >= 185 || S.pt.dbp >= 110) return 'TD ' + S.pt.sbp + '/' + S.pt.dbp + ' — turunkan <185/110 dengan labetalol/nikardipin IV.';
      if (!S.did('lysis_check')) return 'Telaah kriteria inklusi/eksklusi trombolisis.';
      if (!S.dosesOf('ivt').length) return 'Memenuhi syarat — berikan trombolisis IV (target door-to-needle ≤60 menit).';
      if (!S.did('cta')) return 'CTA kepala-leher untuk mencari LVO.';
      if (!S.did('evt')) return 'LVO M1 → rujuk trombektomi mekanik (EVT).';
      if (!S.did('stroke_unit')) return 'Rawat di unit stroke; pantau TD <180/105 & neurologis.';
      return 'Tata laksana lengkap — serah terima.';
    },
    criteria: function (S) {
      var ct = S.firstAct('ct'), ivt = firstDose(S, 'ivt'), lc = S.firstAct('lysis_check'), g = S.firstAct('gds');
      return [
        item('Cek gula darah sebelum terapi', 10, g !== null && (ivt === null || g < ivt), { critical: true }),
        item('Aktifkan tim stroke', 6, S.did('stroke_code')),
        item('Pemeriksaan NIHSS', 6, S.did('nihss')),
        item('CT kepala non-kontras ≤20 menit (door-to-CT)', 12, ct !== null && ct <= 1200 ? 1 : ct !== null && ct <= 1500 ? 0.5 : 0, { critical: true, note: ct !== null ? 'CT dimulai ' + fmt(ct) : 'Tidak dikerjakan' }),
        item('TD <185/110 saat trombolisis', 10, ivt !== null && !!S.flags.bpAtIvt, { critical: true }),
        item('Telaah kriteria trombolisis', 8, lc !== null && (ivt === null || lc < ivt)),
        item('Trombolisis IV ≤60 menit (door-to-needle)', 14, ivt !== null && ct !== null && ct < ivt && ivt <= 3600 ? 1 : (ivt !== null && ct !== null && ct < ivt ? 0.5 : 0), { critical: true, note: ivt !== null ? 'Pada ' + fmt(ivt) : 'Tidak diberikan' }),
        item('CTA → rujuk trombektomi (LVO)', 10, (S.did('cta') ? 0.5 : 0) + (S.did('evt') ? 0.5 : 0)),
        item('Tidak memberi aspirin dini', 6, !S.did('aspirin')),
        item('Tidak menurunkan TD berlebihan', 4, S.dosesOf('bp_lower').length < 3),
        item('Rawat di unit stroke', 4, S.did('stroke_unit'))
      ];
    },
    outcome: function (S) {
      if (S.did('ivt') && !S.did('ct')) return { ok: false, text: 'Trombolisis diberikan tanpa CT — kesalahan kritis.' };
      return S.did('ivt') ? { ok: true, text: 'Trombolisis IV diberikan' + (S.did('evt') ? ' dan pasien dirujuk untuk trombektomi.' : '.') } : { ok: false, text: 'Trombolisis belum diberikan.' };
    },
    timeLimit: 4800
  });

  /* Pasang petunjuk default */
  LIST.forEach(function (s) { if (!s.hint) s.hint = defaultHint; });

  ACLS.SCENARIOS = LIST;
  ACLS.SCEN_BY_ID = {};
  LIST.forEach(function (s) { ACLS.SCEN_BY_ID[s.id] = s; });
  ACLS.CATEGORIES = [
    { id: 'arrest', label: 'Henti jantung' },
    { id: 'periarrest', label: 'Bradikardia & takikardia' },
    { id: 'acs', label: 'Sindrom koroner akut' },
    { id: 'stroke', label: 'Stroke akut' }
  ];
  ACLS.HT_LIST = ['Hipovolemia', 'Hipoksia', 'Ion hidrogen (asidosis)', 'Hipo-/hiperkalemia', 'Hipotermia',
    'Tension pneumothorax', 'Tamponade jantung', 'Toksin', 'Trombosis paru (emboli)', 'Trombosis koroner'];
})();
