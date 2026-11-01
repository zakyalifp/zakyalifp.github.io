/* ==========================================================================
   ACLS Simulator — katalog tindakan
   Setiap tindakan: id, group (tab), label, sets (skenario mana yang memakai),
   run(S) — mencatat tindakan netral lalu umpan balik (good/warn/err/tip).
   Dosis mengacu pada AHA Guidelines for CPR & ECC 2025.
   ========================================================================== */
(function () {
  'use strict';
  var ACLS = window.ACLS = window.ACLS || {};
  var fmt = ACLS.fmt;

  var GROUPS = [
    { id: 'cpr', label: 'RJP & Airway' },
    { id: 'assess', label: 'Akses & Penilaian' },
    { id: 'drug', label: 'Obat' },
    { id: 'proc', label: 'Prosedur' },
    { id: 'acs', label: 'SKA' },
    { id: 'stroke', label: 'Stroke' },
    { id: 'post', label: 'Pasca-ROSC & Disposisi' }
  ];

  function inArrest(S) { return S.phase === 'arrest'; }

  function postPressor(S, kind) {
    if (S.phase !== 'post') return;
    if (kind === 'fluid') { S.pt.sbp += 12; S.pt.dbp += 6; }
    else { S.pt.sbp = Math.max(S.pt.sbp, 112); S.pt.dbp = Math.max(S.pt.dbp, 68); }
    if (S.map() >= 65 && !S.flags.mapOk) {
      S.flags.mapOk = true;
      S.obs('TD kini ' + S.pt.sbp + '/' + S.pt.dbp + ' mmHg (MAP ' + S.map() + ').');
      S.good('Target MAP ≥65 mmHg tercapai.');
    } else {
      S.obs('TD kini ' + S.pt.sbp + '/' + S.pt.dbp + ' mmHg (MAP ' + S.map() + ').');
    }
  }

  var A = [
    /* ===================== RJP & AIRWAY ===================== */
    { id: 'cpr', group: 'cpr', sets: ['core'], label: 'Mulai RJP', key: true,
      dyn: function (S) { return S.cpr.on ? 'Hentikan kompresi' : 'Mulai / lanjutkan RJP'; },
      run: function (S) { if (S.cpr.on) S.stopCPR('atas instruksi ketua tim'); else S.startCPR(); } },
    { id: 'rhythm_check', group: 'cpr', sets: ['core'], label: 'Analisis ritme', key: true,
      run: function (S) { S.rhythmCheck(); } },
    { id: 'pulse_check', group: 'cpr', sets: ['core'], label: 'Cek nadi (≤10 dtk)', key: true,
      run: function (S) { S.pulseCheck(); } },
    { id: 'bvm', group: 'cpr', sets: ['core'], label: 'Ventilasi BVM + O₂ (30:2)',
      run: function (S) {
        if (S.airway !== 'none') { S.act('Ventilasi dilanjutkan dengan jalan napas yang sudah ada.'); return; }
        S.act('Ventilasi bag-valve-mask dengan O₂ 15 L/menit, rasio 30:2.');
        if (S.pt.pulse && S.phase === 'pre') {
          S.warn('bvm_conscious', 'Ventilasi BVM pada pasien yang bernapas spontan & sadar tidak diindikasikan.', 2,
            'Berikan O₂ via kanul/NRM bila SpO₂ rendah; BVM untuk pasien apnea/napas tidak adekuat.');
          return;
        }
        S.airway = 'bvm';
      } },
    { id: 'adv_airway', group: 'cpr', sets: ['core'], label: 'Advanced airway (ETT/SGA)',
      run: function (S) {
        if (S.airway === 'adv') { S.act('Advanced airway sudah terpasang.'); return; }
        if (S.pt.pulse && S.phase === 'pre') {
          S.act('Upaya intubasi pada pasien yang sadar.');
          S.err('intubate_awake', 'Intubasi tidak diindikasikan pada pasien sadar dengan jalan napas paten.', 5,
            'Advanced airway untuk henti jantung atau gagal napas — bukan rutin pada pasien sadar.');
          return;
        }
        S.airway = 'adv';
        S.act('Advanced airway terpasang' + (S.cpr.on ? ' tanpa menghentikan kompresi' : '') + '; posisi dikonfirmasi.');
        if (inArrest(S)) S.tip('Kini kompresi kontinu + 1 napas tiap 6 detik (10×/menit).', 'Dengan advanced airway, tidak perlu jeda 30:2. Konfirmasi posisi dengan kapnografi gelombang.');
      } },
    { id: 'capno', group: 'cpr', sets: ['core'], label: 'Kapnografi gelombang',
      run: function (S) {
        if (S.capno) { S.act('Kapnografi sudah terpasang.'); return; }
        S.capno = true;
        S.act('Kapnografi gelombang (EtCO₂) dipasang.');
        if (inArrest(S)) S.tip('Pantau EtCO₂: <10 mmHg → perbaiki kualitas kompresi; naik mendadak ≥40 → curigai ROSC.', '');
      } },
    { id: 'o2', group: 'cpr', sets: ['core'], label: 'Oksigen (kanul/NRM)',
      run: function (S) {
        S.act('Oksigen diberikan via ' + (S.pt.spo2 !== null && S.pt.spo2 < 90 ? 'non-rebreathing mask' : 'kanul nasal') + '.');
        if (!S.pt.pulse) { S.tip('Pada henti jantung, oksigenasi melalui BVM/advanced airway.', ''); return; }
        if (S.pt.spo2 !== null && S.pt.spo2 >= 94 && (S.scen.cat === 'acs' || S.scen.cat === 'stroke')) {
          S.warn('o2_unneeded', 'Oksigen rutin pada SpO₂ ≥90–94% tidak dianjurkan.', 2,
            'Pada SKA dan stroke, O₂ hanya bila SpO₂ <90% (SKA) / <94% (stroke). Hiperoksia tidak bermanfaat.');
        } else if (S.pt.spo2 !== null && S.pt.spo2 < 94) {
          S.pt.spo2 = 95; S.o2 = true;
          S.obs('SpO₂ naik menjadi 95%.');
        }
        S.o2 = true;
      } },

    /* ===================== AKSES & PENILAIAN ===================== */
    { id: 'iv', group: 'assess', sets: ['core'], label: 'Akses IV / IO', key: true,
      run: function (S) {
        if (S.iv) { S.act('Akses IV/IO sudah terpasang.'); return; }
        S.iv = true;
        S.act('Akses ' + (inArrest(S) ? 'IV/IO' : 'IV') + ' terpasang' + (S.cpr.on ? ' tanpa menghentikan kompresi' : '') + '.');
      } },
    { id: 'ecg12', group: 'assess', sets: ['core'], label: 'EKG 12 sadapan', cost: function (S) { return inArrest(S) ? 0 : 60; },
      run: function (S) {
        if (inArrest(S)) {
          S.act('Permintaan EKG 12 sadapan saat henti jantung.');
          S.tip('EKG 12 sadapan tidak dilakukan saat RJP.', 'Fokus pada kompresi, analisis ritme di monitor, dan defibrilasi. EKG 12 sadapan dikerjakan segera setelah ROSC.');
          return;
        }
        S.act('EKG 12 sadapan direkam.');
        var txt = S.scen.ecg12 ? S.scen.ecg12(S) : ACLS.RHYTHMS[S.pt.rhythm].label + ', ' + S.pt.rate + '×/menit.';
        S.addFinding('EKG 12 sadapan', txt);
      } },
    { id: 'labs', group: 'assess', sets: ['core'], label: 'Lab POC (AGD, elektrolit)',
      run: function (S) {
        S.act('Sampel darah untuk AGD & elektrolit point-of-care.');
        S.addFinding('Lab POC', S.scen.labs ? S.scen.labs(S) : 'Dalam batas normal.');
      } },
    { id: 'gds', group: 'assess', sets: ['core'], label: 'Gula darah kapiler',
      run: function (S) {
        S.act('Pemeriksaan gula darah kapiler.');
        S.flags.glucoseChecked = true;
        S.addFinding('GDS', S.scen.glucose || 'GDS 132 mg/dL.');
      } },
    { id: 'pocus', group: 'assess', sets: ['core'], label: 'POCUS (jantung & paru)',
      run: function (S) {
        S.act('POCUS dilakukan' + (inArrest(S) ? ' (saat jeda cek nadi, ≤10 detik)' : '') + '.');
        S.addFinding('POCUS', S.scen.pocus ? S.scen.pocus(S) : 'Tidak ada temuan bermakna.');
      } },
    { id: 'exam', group: 'assess', sets: ['core'], label: 'Pemeriksaan fisik terarah',
      run: function (S) {
        S.act('Pemeriksaan fisik terarah.');
        S.addFinding('Pemeriksaan fisik', S.scen.exam ? (typeof S.scen.exam === 'function' ? S.scen.exam(S) : S.scen.exam) : 'Tidak ada temuan tambahan.');
      } },
    { id: 'hst', group: 'assess', sets: ['core'], label: 'Telusuri H & T…', modal: 'hst',
      run: function () {} },

    /* ===================== OBAT ===================== */
    { id: 'epi1', group: 'drug', sets: ['core'], label: 'Epinefrin 1 mg IV/IO bolus', key: true,
      run: function (S) {
        if (!S.give('epi1', 'epinefrin 1 mg')) return;
        var d = S.dosesOf('epi1'), n = d.length;
        S.act('Epinefrin 1 mg IV/IO bolus + flush 20 mL (dosis ke-' + n + ').');
        if (!inArrest(S)) {
          S.err('epi_bolus_pulse', 'Epinefrin 1 mg bolus pada pasien dengan nadi — berbahaya.', 10,
            'Dosis 1 mg bolus hanya untuk henti jantung. Untuk bradikardia/hipotensi gunakan infus epinefrin 2–10 mcg/menit.');
          return;
        }
        if (n > 1) {
          var gap = S.t - d[n - 2];
          if (gap < 170) S.warn('epi_fast', 'Epinefrin diulang setelah ' + fmt(gap) + ' — terlalu cepat.', 4, 'Interval epinefrin 3–5 menit (kira-kira setiap 2 siklus RJP).');
        } else {
          if (S.arr.nsSince !== null && !S.arr.vfPath) S.arr.epiDelays.push(S.t - S.arr.nsSince);
          if (S.isShockable() && S.arr.epShocks < 2) {
            S.warn('epi_early_vf', 'Epinefrin diberikan sebelum upaya defibrilasi awal gagal.', 2,
              'AHA 2025: pada VF/pVT, epinefrin diberikan setelah upaya defibrilasi awal gagal (umumnya setelah shock ke-2). Prioritas: shock + RJP berkualitas.');
          }
        }
      } },
    { id: 'amio300', group: 'drug', sets: ['core'], label: 'Amiodaron 300 mg IV/IO bolus',
      run: function (S) {
        if (!S.give('amio300', 'amiodaron 300 mg')) return;
        S.act('Amiodaron 300 mg IV/IO bolus.');
        if (!inArrest(S)) {
          S.err('amio_bolus_pulse', 'Amiodaron 300 mg bolus cepat pada pasien dengan nadi.', 8, 'Pada takikardia dengan nadi: amiodaron 150 mg IV dalam 10 menit.');
          return;
        }
        if (S.dosesOf('amio300').length > 1) { S.err('amio300_twice', 'Amiodaron 300 mg diulang — dosis kedua seharusnya 150 mg.', 4, 'Henti jantung: 300 mg, lalu 150 mg bila VF/pVT persisten.'); return; }
        if (!S.isShockable()) { S.err('amio_ns', 'Amiodaron tidak diindikasikan pada ritme non-shockable.', 4, 'Antiaritmia hanya untuk VF/pVT refrakter.'); return; }
        if (S.pt.rhythm === 'torsades') S.warn('amio_tdp', 'Amiodaron memperpanjang QT — kurang tepat pada torsades de pointes.', 4, 'Torsades: MgSO₄ 1–2 g IV, koreksi K⁺, hentikan obat pemanjang QT.');
        else if (S.arr.epShocks < 3) S.warn('amio_early', 'Amiodaron diberikan sebelum shock ke-3.', 2, 'Antiaritmia untuk VF/pVT refrakter — setelah shock ke-3 dalam algoritma.');
      } },
    { id: 'amio150', group: 'drug', sets: ['core'], label: 'Amiodaron 150 mg IV/IO (dosis ke-2)',
      run: function (S) {
        if (!S.give('amio150', 'amiodaron 150 mg')) return;
        S.act('Amiodaron 150 mg IV/IO bolus (dosis kedua).');
        if (!inArrest(S)) { S.tip('Untuk pasien dengan nadi, gunakan infus amiodaron 150 mg dalam 10 menit.', ''); return; }
        if (!S.dosesOf('amio300').length) S.warn('amio_order', 'Dosis 150 mg diberikan tanpa dosis awal 300 mg.', 2, 'Dosis awal henti jantung 300 mg, berikutnya 150 mg.');
        if (S.dosesOf('amio150').length > 1) S.err('amio_max', 'Melebihi dosis bolus amiodaron pada henti jantung (300 + 150 mg).', 4, '');
      } },
    { id: 'lido', group: 'drug', sets: ['core'], label: 'Lidokain 1–1,5 mg/kgBB IV/IO',
      run: function (S) {
        if (!S.give('lido', 'lidokain')) return;
        var n = S.dosesOf('lido').length;
        S.act('Lidokain ' + (n === 1 ? '1–1,5' : '0,5–0,75') + ' mg/kgBB IV/IO.');
        if (!inArrest(S)) { S.tip('Lidokain dapat dipakai pada VT stabil, namun pilihan utama adalah prokainamid/amiodaron.', ''); return; }
        if (!S.isShockable()) S.err('lido_ns', 'Lidokain tidak diindikasikan pada ritme non-shockable.', 4, '');
        else if (S.arr.epShocks < 3) S.warn('lido_early', 'Lidokain sebelum shock ke-3.', 2, 'Antiaritmia (amiodaron ATAU lidokain) untuk VF/pVT refrakter setelah shock ke-3.');
      } },
    { id: 'mg', group: 'drug', sets: ['core'], label: 'MgSO₄ 1–2 g IV/IO',
      run: function (S) {
        if (!S.give('mg', 'MgSO₄')) return;
        S.act('MgSO₄ 2 g IV/IO ' + (inArrest(S) ? 'bolus' : 'dalam 5–20 menit') + '.');
        if (S.pt.rhythm !== 'torsades' && S.scen.cause !== 'hypomag') S.tip('MgSO₄ tidak rutin pada VF/pVT.', 'Indikasi: torsades de pointes atau hipomagnesemia.');
      } },
    { id: 'atropine', group: 'drug', sets: ['core'], label: 'Atropin 1 mg IV',
      run: function (S) {
        if (!S.give('atropine', 'atropin 1 mg')) return;
        var n = S.dosesOf('atropine').length;
        S.act('Atropin 1 mg IV (total ' + n + ' mg).');
        if (inArrest(S)) { S.err('atropine_arrest', 'Atropin tidak direkomendasikan pada henti jantung (asistol/PEA).', 6, 'Atropin hanya untuk bradikardia simtomatik dengan nadi.'); return; }
        if (n > 3) S.err('atropine_max', 'Dosis total atropin melebihi 3 mg.', 4, 'Atropin 1 mg tiap 3–5 menit, maksimal 3 mg. Bila tidak efektif: pacing transkutan atau infus dopamin/epinefrin.');
        if (S.pt.rate > 100) S.err('atropine_tachy', 'Atropin pada pasien takikardia.', 5, '');
      } },
    { id: 'adeno6', group: 'drug', sets: ['core'], label: 'Adenosin 6 mg IV cepat',
      run: function (S) { ACLS.adenosine(S, 6); } },
    { id: 'adeno12', group: 'drug', sets: ['core'], label: 'Adenosin 12 mg IV cepat',
      run: function (S) { ACLS.adenosine(S, 12); } },
    { id: 'amio_inf', group: 'drug', sets: ['core'], label: 'Amiodaron 150 mg IV dalam 10 mnt',
      run: function (S) {
        if (!S.give('amio_inf', 'amiodaron infus')) return;
        S.act('Amiodaron 150 mg IV dalam 10 menit (lanjut infus rumatan 1 mg/menit).');
        if (inArrest(S)) S.err('amioinf_arrest', 'Saat henti jantung, amiodaron diberikan bolus 300 mg — bukan infus lambat.', 3, '');
      } },
    { id: 'bb_ccb', group: 'drug', sets: ['core'], label: 'Diltiazem / β-bloker IV',
      run: function (S) {
        if (!S.give('bb_ccb', 'diltiazem/β-bloker')) return;
        S.act('Diltiazem 15–20 mg IV (atau β-bloker IV) diberikan.');
        if (inArrest(S)) { S.err('ccb_arrest', 'CCB/β-bloker tidak berperan saat henti jantung.', 4, ''); return; }
        var idg = ACLS.RHYTHMS[S.pt.rhythm].idg;
        if (idg === 'vt' || idg === 'torsades') S.err('ccb_wide', 'CCB/β-bloker pada takikardia QRS lebar (VT) — dapat menyebabkan kolaps hemodinamik.', 8, 'Takikardia QRS lebar dianggap VT sampai terbukti lain.');
        else if (S.pt.sbp < 90) S.err('ccb_hypo', 'CCB/β-bloker pada pasien hipotensi/tidak stabil.', 8, 'Pasien tidak stabil → kardioversi tersinkronisasi. CCB/β-bloker memperburuk hipotensi.');
      } },
    { id: 'calcium', group: 'drug', sets: ['core'], label: 'Kalsium (CaCl₂ 10% / Ca glukonas)',
      run: function (S) {
        if (!S.give('calcium', 'kalsium')) return;
        S.act('Kalsium klorida 10% 10 mL (atau Ca glukonas 10% 30 mL) IV/IO.');
        if (S.scen.cause !== 'hyperk') S.warn('ca_routine', 'Kalsium rutin pada henti jantung tidak direkomendasikan.', 2, 'Indikasi: hiperkalemia, hipokalsemia, toksisitas CCB.');
      } },
    { id: 'bicarb', group: 'drug', sets: ['core'], label: 'Natrium bikarbonat 1 mEq/kgBB',
      run: function (S) {
        if (!S.give('bicarb', 'natrium bikarbonat')) return;
        S.act('Natrium bikarbonat 8,4% 50 mEq IV/IO.');
        if (S.scen.cause !== 'hyperk') S.warn('bicarb_routine', 'Natrium bikarbonat rutin tidak direkomendasikan.', 2, 'Pertimbangkan hanya pada hiperkalemia atau intoksikasi antidepresan trisiklik.');
      } },
    { id: 'hyperk_tx', group: 'drug', sets: ['core'], label: 'Insulin-dekstrosa, salbutamol, HD cito (hiperK)',
      run: function (S) {
        if (!S.give('hyperk_tx', 'terapi hiperkalemia')) return;
        S.act('Insulin reguler 10 U IV + dekstrosa 40% 50 mL, nebulisasi salbutamol; konsul hemodialisis cito.');
        if (S.scen.cause !== 'hyperk') S.warn('hyperk_tx_wrong', 'Terapi hiperkalemia tanpa bukti hiperkalemia.', 2, 'Periksa kalium/EKG dahulu.');
      } },
    { id: 'electrolyte', group: 'drug', sets: ['core'], label: 'Koreksi K⁺ / Mg²⁺ (KCl, MgSO₄ rumatan)',
      run: function (S) {
        if (!S.give('electrolyte', 'koreksi elektrolit')) return;
        S.act('Koreksi elektrolit: KCl IV via akses sentral/infus terpantau + MgSO₄ rumatan.');
        if (S.scen.cause !== 'hypomag') S.tip('Koreksi elektrolit sebaiknya berdasarkan hasil lab.', '');
      } },
    { id: 'fluid', group: 'drug', sets: ['core'], label: 'Bolus kristaloid 500–1000 mL',
      run: function (S) {
        if (!S.give('fluid', 'cairan kristaloid')) return;
        S.act('Bolus kristaloid (NaCl 0,9%/RL) 1000 mL.');
        postPressor(S, 'fluid');
      } },
    { id: 'dextrose', group: 'drug', sets: ['core'], label: 'Dekstrosa 40% IV',
      run: function (S) {
        if (!S.give('dextrose', 'dekstrosa 40%')) return;
        S.act('Dekstrosa 40% 50 mL IV.');
        if (S.scen.cause !== 'hypoglycemia') {
          S.warn('dex_nohypo', 'Dekstrosa tanpa bukti hipoglikemia.', S.scen.cat === 'stroke' ? 4 : 2,
            'Periksa gula darah dahulu. Hiperglikemia memperburuk luaran neurologis (stroke, pasca-henti jantung).');
        }
      } },
    { id: 'dopamine', group: 'drug', sets: ['core'], label: 'Infus dopamin 5–20 mcg/kg/mnt',
      run: function (S) {
        if (!S.give('dopamine', 'dopamin')) return;
        S.act('Infus dopamin dimulai 5 mcg/kgBB/menit, dititrasi.');
        if (inArrest(S)) { S.err('infusion_arrest', 'Infus vasopresor/kronotropik tidak tepat saat RJP — gunakan epinefrin 1 mg bolus.', 3, ''); return; }
        postPressor(S, 'pressor');
      } },
    { id: 'epi_inf', group: 'drug', sets: ['core'], label: 'Infus epinefrin 2–10 mcg/mnt',
      run: function (S) {
        if (!S.give('epi_inf', 'infus epinefrin')) return;
        S.act('Infus epinefrin dimulai 2 mcg/menit, dititrasi.');
        if (inArrest(S)) { S.err('infusion_arrest', 'Infus vasopresor/kronotropik tidak tepat saat RJP — gunakan epinefrin 1 mg bolus.', 3, ''); return; }
        postPressor(S, 'pressor');
      } },
    { id: 'norepi', group: 'drug', sets: ['core'], label: 'Norepinefrin 0,1–0,5 mcg/kg/mnt',
      run: function (S) {
        if (!S.give('norepi', 'norepinefrin')) return;
        S.act('Infus norepinefrin dimulai 0,1 mcg/kgBB/menit, dititrasi ke MAP ≥65 mmHg.');
        if (inArrest(S)) { S.err('infusion_arrest', 'Infus vasopresor tidak tepat saat RJP — gunakan epinefrin 1 mg bolus.', 3, ''); return; }
        postPressor(S, 'pressor');
      } },
    { id: 'sedation', group: 'drug', sets: ['core'], label: 'Sedasi / analgesia prosedural',
      run: function (S) {
        if (!S.give('sedation', 'sedasi')) return;
        S.act('Sedasi/analgesia prosedural (mis. midazolam 1–2 mg + fentanil 25–50 mcg IV).');
        if (inArrest(S)) { S.warn('sed_arrest', 'Sedasi tidak relevan saat henti jantung.', 2, ''); return; }
        S.flags.sedated = true;
      } },

    /* ===================== PROSEDUR ===================== */
    { id: 'vagal', group: 'proc', sets: ['core'], label: 'Manuver vagal (Valsalva modifikasi)',
      run: function (S) {
        S.act('Manuver Valsalva modifikasi (meniup 15 detik, lalu posisi telentang + elevasi tungkai).');
        if (inArrest(S)) { S.err('vagal_arrest', 'Manuver vagal saat henti jantung tidak bermakna.', 4, ''); return; }
        if (S.pt.sbp < 90) S.warn('vagal_unstable', 'Manuver vagal pada pasien tidak stabil menunda terapi definitif.', 3, 'Takikardia tidak stabil → kardioversi tersinkronisasi segera.');
      } },
    { id: 'needle', group: 'proc', sets: ['core'], label: 'Dekompresi jarum toraks',
      run: function (S) {
        S.act('Dekompresi jarum (ICS 4–5 linea aksilaris anterior) hemitoraks kanan.');
        if (S.scen.cause !== 'tension') S.err('needle_wrong', 'Dekompresi jarum tanpa tanda tension pneumothorax.', 4, 'Indikasi: deviasi trakea, suara napas unilateral hilang, JVP meningkat, lung sliding (−) pada POCUS.');
      } },
    { id: 'chest_tube', group: 'proc', sets: ['core'], label: 'Pasang chest tube (WSD)',
      run: function (S) {
        S.act('Chest tube (WSD) dipasang.');
        if (S.scen.cause !== 'tension') S.warn('wsd_wrong', 'Chest tube tanpa indikasi.', 2, '');
      } },
    { id: 'pericardio', group: 'proc', sets: ['core'], label: 'Perikardiosentesis',
      run: function (S) {
        S.act('Perikardiosentesis dilakukan.');
        if (S.scen.cause !== 'tamponade') S.err('pericardio_wrong', 'Perikardiosentesis tanpa bukti tamponade.', 4, 'Konfirmasi efusi perikard dengan POCUS terlebih dahulu.');
      } },
    { id: 'stop_qt', group: 'proc', sets: ['core'], label: 'Hentikan obat pemanjang QT',
      run: function (S) { S.act('Obat pemanjang QT (levofloksasin, ondansetron) dihentikan.'); } },
    { id: 'consult', group: 'proc', sets: ['core'], label: 'Konsul kardiologi',
      run: function (S) { S.act('Konsultasi dengan dokter spesialis jantung.'); } },

    /* ===================== SKA ===================== */
    { id: 'aspirin', group: 'acs', sets: ['acs', 'stroke'], label: 'Aspirin 160–325 mg dikunyah',
      run: function (S) {
        S.act('Aspirin 160–325 mg dikunyah.');
        if (S.scen.cat === 'stroke') {
          if (!S.did('ct') || S.did('ivt')) S.err('asa_stroke', 'Aspirin pada stroke sebelum CT / dalam 24 jam pasca-trombolisis.', 8,
            'Antiplatelet ditunda hingga perdarahan disingkirkan; bila trombolisis, tunda 24 jam (setelah CT ulang).');
          else S.tip('Bila tidak trombolisis, aspirin diberikan 24–48 jam setelah onset (setelah skrining disfagia).', '');
        }
      } },
    { id: 'nitrate', group: 'acs', sets: ['acs'], label: 'Nitrat sublingual',
      run: function (S) {
        S.act('Nitrat sublingual (ISDN 5 mg / NTG 0,4 mg), dapat diulang tiap 5 menit (maks. 3×).');
        if (S.pt.sbp < 90 || !S.pt.pulse) S.err('ntg_hypo', 'Nitrat pada pasien hipotensi/syok.', 8, 'Kontraindikasi nitrat: SBP <90 mmHg, infark ventrikel kanan, pemakaian PDE-5 inhibitor 24–48 jam terakhir.');
      } },
    { id: 'morphine', group: 'acs', sets: ['acs'], label: 'Morfin 2–4 mg IV',
      run: function (S) {
        if (!S.give('morphine', 'morfin')) return;
        S.act('Morfin 2–4 mg IV.');
        S.tip('Morfin hanya untuk nyeri yang tidak membaik dengan nitrat.', 'Morfin dapat memperlambat absorpsi antiplatelet oral.');
      } },
    { id: 'p2y12', group: 'acs', sets: ['acs'], label: 'Clopidogrel 300 mg (loading)',
      run: function (S) { S.act('Clopidogrel 300 mg per oral (loading; usia ≤75 tahun dengan fibrinolitik).'); } },
    { id: 'anticoag', group: 'acs', sets: ['acs', 'af'], label: 'Antikoagulan (enoksaparin / UFH)',
      run: function (S) {
        if (!S.give('anticoag', 'antikoagulan')) return;
        S.act('Antikoagulan parenteral (enoksaparin/UFH) diberikan.');
      } },
    { id: 'lytic_check', group: 'acs', sets: ['acs'], label: 'Ceklis kontraindikasi fibrinolitik', cost: 60,
      run: function (S) {
        S.act('Ceklis kontraindikasi fibrinolitik ditelaah.');
        S.addFinding('Ceklis fibrinolitik', S.scen.lyticCheck ? S.scen.lyticCheck(S) : 'Tidak ada kontraindikasi.');
      } },
    { id: 'lytic', group: 'acs', sets: ['acs'], label: 'Fibrinolitik (STEMI)',
      run: function (S) {
        if (!S.give('lytic', 'fibrinolitik')) return;
        S.act('Fibrinolitik diberikan (streptokinase 1,5 juta U dalam 30–60 menit / tenekteplase bolus sesuai BB).');
      } },
    { id: 'pci_transfer', group: 'acs', sets: ['acs'], label: 'Rujuk ke RS PCI (farmako-invasif)',
      run: function (S) { S.act('Rujukan ke RS dengan fasilitas PCI dikoordinasikan.'); } },
    { id: 'primary_pci', group: 'post', sets: ['acs', 'post'], label: 'Cath lab / angiografi koroner emergensi',
      run: function (S) { S.act('Tim kateterisasi diaktifkan untuk angiografi koroner emergensi.'); } },

    /* ===================== STROKE ===================== */
    { id: 'stroke_code', group: 'stroke', sets: ['stroke'], label: 'Aktifkan kode/tim stroke',
      run: function (S) { S.act('Kode stroke diaktifkan; tim stroke & radiologi diberitahu.'); } },
    { id: 'nihss', group: 'stroke', sets: ['stroke'], label: 'Pemeriksaan NIHSS', cost: 120,
      run: function (S) { S.act('Pemeriksaan NIHSS.'); S.addFinding('NIHSS', S.scen.nihss || '—'); } },
    { id: 'ct', group: 'stroke', sets: ['stroke'], label: 'CT kepala non-kontras', cost: 420,
      run: function (S) { S.act('CT kepala non-kontras dikerjakan.'); S.addFinding('CT kepala', S.scen.ctResult || '—'); } },
    { id: 'cta', group: 'stroke', sets: ['stroke'], label: 'CTA kepala-leher (cari LVO)', cost: 300,
      run: function (S) { S.act('CT angiografi kepala-leher dikerjakan.'); S.addFinding('CTA', S.scen.ctaResult || '—'); } },
    { id: 'bp_lower', group: 'stroke', sets: ['stroke'], label: 'Labetalol / nikardipin IV', cost: 240,
      run: function (S) {
        if (!S.give('bp_lower', 'antihipertensi IV')) return;
        S.act('Labetalol 10–20 mg IV (atau nikardipin infus 5 mg/jam, titrasi).');
      } },
    { id: 'lysis_check', group: 'stroke', sets: ['stroke'], label: 'Ceklis kriteria trombolisis', cost: 90,
      run: function (S) { S.act('Kriteria inklusi/eksklusi trombolisis ditelaah.'); S.addFinding('Ceklis trombolisis', S.scen.lysisCheck ? S.scen.lysisCheck(S) : '—'); } },
    { id: 'ivt', group: 'stroke', sets: ['stroke'], label: 'Trombolisis IV (alteplase / tenekteplase)',
      run: function (S) {
        if (!S.give('ivt', 'trombolitik')) return;
        S.act('Trombolisis IV: alteplase 0,9 mg/kgBB (10% bolus, sisa dalam 60 menit; maks. 90 mg) / tenekteplase 0,25 mg/kgBB bolus (maks. 25 mg).');
      } },
    { id: 'evt', group: 'stroke', sets: ['stroke'], label: 'Rujuk trombektomi mekanik (EVT)',
      run: function (S) { S.act('Koordinasi trombektomi mekanik (EVT) dengan pusat intervensi neurovaskular.'); } },
    { id: 'stroke_unit', group: 'stroke', sets: ['stroke'], label: 'Rawat di unit stroke/ICU',
      run: function (S) { S.act('Pasien direncanakan rawat di unit stroke dengan pemantauan neurologis & TD ketat.'); } },

    /* ===================== PASCA-ROSC ===================== */
    { id: 'o2_titrate', group: 'post', sets: ['core'], label: 'Titrasi O₂ (SpO₂ 90–98%)',
      run: function (S) {
        S.act('FiO₂ dititrasi untuk target SpO₂ 90–98% (hindari hipoksemia & hiperoksia).');
        if (S.pt.pulse && S.pt.spo2 !== null) {
          if (S.pt.spo2 < 92) S.pt.spo2 = 95; else if (S.pt.spo2 > 98) S.pt.spo2 = 97;
        }
        S.o2 = true;
      } },
    { id: 'vent', group: 'post', sets: ['post'], label: 'Atur ventilasi (PaCO₂ 35–45)',
      run: function (S) {
        if (S.airway !== 'adv') { S.act('Pengaturan ventilasi — belum ada advanced airway.'); S.tip('Pasang advanced airway pada pasien koma pasca-ROSC.', ''); return; }
        S.act('Ventilator: ±10 napas/menit, volume tidal 6–8 mL/kgBB; target PaCO₂ 35–45 mmHg.');
      } },
    { id: 'ttm', group: 'post', sets: ['post'], label: 'Kontrol suhu terarah (32–37,5 °C)',
      run: function (S) {
        if (inArrest(S)) { S.act('Permintaan kontrol suhu saat henti jantung.'); S.tip('Kontrol suhu dimulai setelah ROSC.', ''); return; }
        S.act('Kontrol suhu terarah: suhu konstan 32–37,5 °C, cegah demam (>37,5 °C).');
      } },
    { id: 'handover', group: 'post', sets: ['core'], label: 'Serah terima / akhiri skenario', end: true,
      run: function () {} }
  ];

  /* Adenosin: perilaku umum (respons spesifik diatur skenario) */
  ACLS.adenosine = function (S, mg) {
    var id = mg === 6 ? 'adeno6' : 'adeno12';
    if (!S.give(id, 'adenosin ' + mg + ' mg')) return;
    S.act('Adenosin ' + mg + ' mg IV bolus cepat + flush 20 mL NaCl 0,9%.');
    var idg = ACLS.RHYTHMS[S.pt.rhythm].idg;
    if (inArrest(S)) { S.err('adeno_arrest', 'Adenosin tidak berperan pada henti jantung.', 5, ''); return; }
    if (mg === 12 && !S.dosesOf('adeno6').length) S.warn('adeno_order', 'Adenosin 12 mg diberikan tanpa dosis awal 6 mg.', 1, 'Dosis awal 6 mg; bila gagal 12 mg.');
    if (idg === 'af' || idg === 'torsades') S.err('adeno_irreg', 'Adenosin pada takikardia ireguler/polimorfik tidak diindikasikan.', 5, 'Adenosin untuk takikardia QRS sempit reguler (atau QRS lebar monomorfik reguler yang stabil).');
    if (idg === 'sinus' || idg === 'sinus_brady' || idg === 'avb3') S.err('adeno_wrong', 'Adenosin pada ritme yang bukan SVT.', 5, '');
    if (S.pt.sbp < 90 && (idg === 'svt' || idg === 'vt')) S.warn('adeno_unstable', 'Adenosin pada takikardia tidak stabil menunda kardioversi.', 4, 'Pasien tidak stabil → kardioversi tersinkronisasi segera (adenosin boleh dipertimbangkan hanya bila SVT reguler sambil menyiapkan kardioversi).');
  };

  ACLS.GROUPS = GROUPS;
  ACLS.ACTIONS = A;
  ACLS.ACTIONS_BY_ID = {};
  A.forEach(function (a) { ACLS.ACTIONS_BY_ID[a.id] = a; });
})();
