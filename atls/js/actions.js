/* ==========================================================================
   ATLS Simulator — temuan pemeriksaan (xABCDE, eFAST, radiologi) &
   katalog tindakan. Setiap tindakan: id, group (tab), label, sets,
   run(S, arg) — mencatat tindakan lalu umpan balik (good/warn/err/tip).
   ========================================================================== */
(function () {
  'use strict';
  var T = window.ATLS;
  var fmt = T.fmt, clamp = T.clamp;
  function r(x) { return Math.round(x); }
  function opp(side) { return side === 'kanan' ? 'kiri' : 'kanan'; }
  function fos(x, S) { return typeof x === 'function' ? x(S) : (x || ''); }
  function cue(S, txt) { return S.level === 'pemula' ? ' → ' + txt + '.' : '.'; }
  function F(S, k) { return S.scen.find ? fos(S.scen.find[k], S) : ''; }
  function sideHit(side, obj) { return !!obj && (side === obj.side || side === 'bilateral'); }

  /* ==================================================================
     TEMUAN PEMERIKSAAN
     ================================================================== */
  var E = {};

  E.x = function (S) {
    var x = S.p.ext;
    if (x && (x.ctrl || 0) < 1) {
      if ((x.ctrl || 0) >= 0.6) return 'Perdarahan dari ' + x.where + ' berkurang dengan ' + x.how + ', tetapi masih merembes.';
      return x.desc + cue(S, 'perdarahan eksternal masif — kendalikan SEKARANG sebelum A');
    }
    if (x) return 'Perdarahan ' + x.where + ' terkontrol (' + x.how + ').';
    return 'Tidak tampak perdarahan eksternal masif. ' + F(S, 'x');
  };

  E.a = function (S) {
    var out = [], g = S.gcs(), a = S.p.airway, aw = S.airwaySev();
    if (S.phase !== 'alive') out.push('Tidak bernapas spontan.');
    if (S.secured()) out.push('Jalan napas definitif (' + (S.st.airway === 'ett' ? 'ETT' : S.flags.needleCric ? 'krikotiroidotomi jarum' : 'krikotiroidotomi') + ') terpasang, kapnografi gelombang (+).');
    else if (a && aw > 0.05) {
      if (a.type === 'blood') out.push(aw > 0.42 ? 'Gurgling keras; darah, bekuan & fragmen gigi memenuhi orofaring; midface goyang saat dipegang, pasien tidak mampu menelan darah.' : 'Darah di orofaring berkurang setelah suction, namun darah terus merembes dari hidung & mulut (gurgling ringan).');
      if (a.type === 'edema') out.push(aw > 0.45 ? 'Stridor inspirasi jelas, suara sangat serak, retraksi suprasternal.' : 'Suara serak, batuk dengan sputum karbon, bulu hidung & alis terbakar, jelaga di orofaring.');
      if (a.type === 'gcs') out.push('Snoring — pangkal lidah jatuh menyumbat jalan napas (penurunan kesadaran).');
      if (S.level === 'pemula') out[out.length - 1] += ' → jalan napas TERANCAM.';
    } else if (S.phase === 'alive' && g.total >= 13) out.push('Pasien menjawab dengan suara jernih — jalan napas paten saat ini.');
    else if (S.phase === 'alive') out.push('Tidak ada suara napas tambahan saat ini' + (S.st.airway === 'opa' || S.st.airway === 'npa' ? ' (dengan ' + S.st.airway.toUpperCase() + ')' : S.st.jaw ? ' (dengan jaw thrust)' : '') + '.');
    if (!S.secured() && S.phase === 'alive' && g.total <= 8) out.push('GCS ' + g.total + ' (≤8)' + cue(S, 'tidak mampu melindungi jalan napas — indikasi jalan napas definitif'));
    if (S.scen.blunt) out.push(S.st.cspine ? 'Restriksi gerak servikal terpasang.' : 'Tulang servikal BELUM diproteksi — mekanisme tumpul berenergi tinggi.');
    var f = F(S, 'a'); if (f) out.push(f);
    return out.join(' ');
  };

  E.b = function (S) {
    var p = S.p, v = S.v, out = [], any = false;
    if (S.phase !== 'alive') return 'Apnea' + (S.ventilated() ? ' — ventilasi dibantu, ' : ', ') + (p.tension && !p.tension.tube && p.tension.s > 0.2 ? 'suara napas ' + p.tension.side + ' tidak terdengar saat ventilasi.' : 'pengembangan dada saat ventilasi ' + (p.htx && p.htx.vol > 300 ? 'asimetris (' + p.htx.side + ' tertinggal).' : 'simetris.'));
    out.push('RR ' + r(v.rr) + '×/mnt' + (S.secured() ? ' (ventilator)' : '') + (S.st.monitor ? ', SpO₂ ' + r(v.spo2) + '%' : ' (SpO₂ belum terpantau — pasang monitor)') + '.');
    var tn = p.tension, ten = S.tensionSev();
    if (tn && ten > 0.18) {
      any = true;
      out.push((ten > 0.4 ? 'Trakea deviasi ke ' + opp(tn.side) + '; ' : '') + 'hemitoraks ' + tn.side + ' hiperekspansi & tertinggal, suara napas ' + tn.side + ' menghilang, perkusi hipersonor ' + tn.side + (ten > 0.4 ? ', vena leher distensi' : '') + cue(S, 'tension pneumothorax ' + tn.side));
    } else if (tn && tn.relieved && !tn.tube) { any = true; out.push('Pasca-dekompresi: suara napas ' + tn.side + ' masih menurun (pneumotoraks residual)' + cue(S, 'lanjutkan chest tube')); }
    if (p.iatroPtx) { any = true; out.push('Suara napas ' + p.iatroPtx + ' kini menurun (pneumotoraks iatrogenik pasca-tusukan).'); }
    if (p.open && !p.open.tube) {
      any = true;
      out.push(p.open.sealed ? 'Luka dada ' + p.open.side + ' tertutup balut oklusif ' + (p.open.occl4 ? 'rapat 4 sisi.' : '3 sisi / vented chest seal.')
        : 'Luka terbuka ±4 cm di dinding dada ' + p.open.side + ' dengan bunyi udara terisap & gelembung darah tiap inspirasi; suara napas ' + p.open.side + ' menurun' + cue(S, 'open pneumothorax'));
    }
    if (p.htx && p.htx.vol > 300) { any = true; out.push('Suara napas ' + p.htx.side + ' sangat menurun, perkusi redup ' + p.htx.side + ', trakea di tengah' + cue(S, 'hemotoraks ' + (p.htx.vol >= 1200 ? 'masif ' : '') + p.htx.side)); }
    if (p.htx && p.htx.tube) out.push('WSD ' + p.htx.side + ': output total ' + r(p.htx.out) + ' mL, undulasi (+).');
    if (p.flail) { any = true; out.push('Segmen dinding dada ' + p.flail.side + ' bergerak paradoksal, krepitasi kosta multipel, nyeri hebat saat inspirasi' + cue(S, 'flail chest + kontusio paru')); }
    if (p.resp) { any = true; out.push('Napas abdominal/diafragmatik, otot interkostal tidak bergerak, batuk lemah' + (p.resp.def > 9 ? ', tampak makin lelah' : '') + '.'); }
    if (!any) out.push('Gerak dada simetris, trakea di tengah, suara napas vesikuler kiri = kanan, perkusi sonor.');
    var f = F(S, 'b'); if (f) out.push(f);
    return out.join(' ');
  };

  E.c = function (S) {
    var p = S.p, v = S.v, out = [];
    if (S.phase !== 'alive') return 'Nadi karotis & femoral TIDAK teraba.' + (S.st.monitor ? ' Monitor menunjukkan aktivitas listrik (PEA).' : '');
    var sbp = v.sbp;
    var pulse = sbp >= 85 ? 'nadi radial teraba' + (v.sbp - v.dbp < 30 ? ' cepat & lemah (tekanan nadi sempit)' : '') : sbp >= 65 ? 'nadi radial TIDAK teraba, femoral/karotis teraba lemah' : 'hanya nadi karotis teraba, sangat lemah';
    out.push('Nadi ' + r(v.hr) + '×/mnt, ' + pulse + (S.st.monitor ? '; TD ' + r(sbp) + '/' + r(v.dbp) + ' mmHg' : '') + '.');
    if (p.neuro) out.push('Akral hangat & kemerahan, CRT <2 detik meski hipotensi; nadi relatif lambat' + cue(S, 'pola syok neurogenik — singkirkan perdarahan dulu'));
    else out.push(S.frac > 0.3 ? 'Akral dingin, pucat, berkeringat, CRT >3 detik.' : S.frac > 0.15 ? 'Akral dingin, CRT ±3 detik.' : 'Akral hangat, CRT <2 detik.');
    var ten = S.tensionSev(), tp = p.tamp ? p.tamp.s : 0;
    if (ten > 0.4 || tp > 0.3) out.push('Vena leher distensi.');
    else if (S.frac > 0.25) out.push('Vena leher kolaps.');
    if (tp > 0.3) out.push('Bunyi jantung menjauh, pulsus paradoksus' + cue(S, 'trias Beck — curiga tamponade jantung'));
    if (p.abdo) out.push(F(S, 'abdo') || 'Abdomen distensi, nyeri tekan difus & defans muskular.');
    else if (p.preg) out.push('Uterus gravid tegang, nyeri tekan, tinggi fundus 3 jari di atas pusat.');
    else out.push('Abdomen ' + (F(S, 'abdoNeg') || 'datar, supel, tanpa jejas') + '.');
    if (p.pelvis) {
      if (!S.flags.pelvisExam) { S.flags.pelvisExam = S.t; out.push('Kompresi lembut pelvis (SEKALI): tidak stabil, krepitasi, nyeri hebat' + cue(S, 'fraktur pelvis tidak stabil — jangan diulang, pasang pelvic binder')); }
      else out.push('Pelvis tidak diperiksa ulang (sudah terbukti tidak stabil)' + (S.flags.binder !== undefined ? ' — binder terpasang' : '') + '.');
    } else if (S.scen.blunt) out.push('Pelvis stabil pada kompresi lembut.');
    if (p.femur) out.push(p.femur.desc + (p.femur.ctrl ? ' (sudah dibidai/traksi).' : '.'));
    if (p.ext && (p.ext.ctrl || 0) < 1) out.push('Perdarahan eksternal ' + p.ext.where + ((p.ext.ctrl || 0) >= 0.6 ? ' masih merembes.' : ' MASIH AKTIF.'));
    var f = F(S, 'c'); if (f) out.push(f);
    return out.join(' ');
  };

  E.d = function (S) {
    var out = ['GCS ' + S.gcsText() + '. Pupil: ' + S.pupils() + '.'];
    var tb = S.p.tbi;
    if (tb && tb.lat && S.phase === 'alive' && !S.gcs().sed && tb.icp >= 0.45) out.push(tb.lat + '.');
    if (S.p.neuro) out.push(S.p.neuro.desc);
    if (S.flags.gds) out.push('GDS ' + S.scen.init.gds + ' mg/dL.');
    var f = F(S, 'd'); if (f) out.push(f);
    return out.join(' ');
  };

  E.e = function (S) {
    S.st.exposed = true;
    var out = ['Seluruh pakaian dibuka/digunting.'];
    var f = F(S, 'e'); if (f) out.push(f);
    if (S.p.urethral) out.push('Darah di meatus uretra & hematoma perineum' + cue(S, 'curiga cedera uretra — JANGAN pasang kateter urin'));
    if (S.p.preg) out.push('Tinggi fundus uteri 3 jari di atas pusat (±32 minggu), uterus tegang & nyeri tekan, perdarahan pervaginam kehitaman' + cue(S, 'curiga solusio plasenta'));
    out.push('Suhu ' + S.temp.toFixed(1) + ' °C.' + (S.st.warmed ? '' : S.level === 'pemula' ? ' Segera selimuti & hangatkan setelah pemeriksaan.' : ''));
    return out.join(' ');
  };

  E.efast = function (S) {
    var p = S.p, out = [];
    out.push('Perikardium: ' + (p.tamp && p.tamp.s > 0.15 ? 'efusi perikard dengan kolaps diastolik ventrikel kanan (+)' : 'tidak ada efusi'));
    var abd = p.abdo ? (F(S, 'fastAbd') || 'cairan bebas (+) di Morison pouch & splenorenal') : 'tidak ada cairan bebas intraperitoneal (RUQ, LUQ, suprapubik)';
    if (p.preg) abd = 'tidak ada cairan bebas intraperitoneal; tampak hematoma retroplasenta (sensitivitas USG terbatas untuk solusio)';
    out.push('Abdomen: ' + abd);
    var lungs = ['kanan', 'kiri'].map(function (sd) {
      var t = 'lung sliding (+)';
      if (p.tension && p.tension.side === sd && !p.tension.tube) t = 'lung sliding (−), lung point (+) → pneumotoraks';
      if (p.iatroPtx === sd) t = 'lung sliding (−) → pneumotoraks';
      if (p.open && p.open.side === sd && !p.open.tube) t = 'lung sliding (−) → pneumotoraks';
      if (p.htx && p.htx.side === sd && p.htx.vol > 300) t = 'efusi pleura anekoik luas di atas diafragma → hemotoraks';
      return sd + ' ' + t;
    });
    out.push('Paru: ' + lungs.join('; '));
    return out.join('. ') + '.';
  };

  E.cxr = function (S) {
    var p = S.p, out = [];
    if (p.tension) {
      if (p.tension.tube) out.push('Chest tube ' + p.tension.side + ' in situ, paru mengembang');
      else if (p.tension.s > 0.2) out.push('Hemitoraks ' + p.tension.side + ' hiperlusen tanpa corakan paru, diafragma mendatar, mediastinum terdorong ke ' + opp(p.tension.side));
      else out.push('Pneumotoraks ' + p.tension.side + ' parsial pasca-dekompresi');
    }
    if (p.open) out.push(p.open.tube ? 'Chest tube ' + p.open.side + ' in situ, paru mengembang; emfisema subkutis sekitar luka' : 'Pneumotoraks ' + p.open.side + ' dengan defek dinding dada & emfisema subkutis');
    if (p.htx) out.push(p.htx.vol > 300 ? 'Opasitas homogen hampir seluruh hemitoraks ' + p.htx.side + ' (hemotoraks luas)' : p.htx.tube ? 'Chest tube ' + p.htx.side + ' in situ, sisa opasitas minimal' : 'Sudut kostofrenikus ' + p.htx.side + ' tumpul');
    if (p.flail) out.push('Fraktur kosta 4–8 ' + p.flail.side + ' segmental dengan kontusio paru');
    if (p.tamp) out.push('Siluet jantung normal/sedikit membesar (foto toraks tidak sensitif untuk tamponade akut)');
    var f = F(S, 'cxr'); if (f) out.push(f);
    if (S.secured() && S.st.airway === 'ett') out.push('Ujung ETT ±3 cm di atas karina');
    if (!out.length) out.push('Tidak tampak pneumotoraks/hemotoraks, mediastinum tidak melebar, tidak tampak fraktur kosta');
    return out.join('. ') + '.';
  };

  E.pxr = function (S) {
    if (S.p.pelvis) return F(S, 'pxr') || 'Fraktur pelvis tidak stabil tipe open-book: diastasis simfisis pubis ±4 cm & disrupsi sendi sakroiliaka kanan.';
    return 'Tidak tampak fraktur pelvis.' + (S.p.femur && S.p.femur.xr ? ' ' + S.p.femur.xr : '');
  };

  E.back = function (S) { return F(S, 'back') || 'Punggung: tidak ada jejas, step-off, atau nyeri tekan tulang belakang; tonus sfingter ani baik.'; };

  E.reassess = function (S) {
    var v = S.vitals(), out = [];
    if (v.off) out.push('Monitor belum terpasang: nadi ' + r(S.v.hr) + '×/mnt, RR ' + r(S.v.rr) + '×/mnt (manual).');
    else if (S.phase !== 'alive') return 'Nadi tidak teraba — henti jantung traumatik berlangsung.';
    else out.push('HR ' + v.hr + ', TD ' + v.sbp + '/' + v.dbp + ' (MAP ' + v.map + '), SpO₂ ' + (v.spo2 === null ? '–' : v.spo2) + '%, RR ' + v.rr + ', suhu ' + v.temp.toFixed(1) + ' °C.');
    out.push('Kesadaran: GCS ' + S.gcsText() + '.');
    if (S.hemorrhagic() && (S.fl.crystOrd + S.fl.bloodMl) > 0) {
      var rate = S.totalBleed();
      out.push('Respons terhadap resusitasi: ' + (rate < 6 ? 'RESPONS CEPAT (rapid responder) — tanda vital stabil.' : rate < 30 ? 'RESPONS SEMENTARA (transient responder) — membaik lalu memburuk lagi; perdarahan masih berlangsung.' : 'RESPONS MINIMAL/TIDAK ADA — perdarahan aktif berat; perlu kontrol bedah/angio segera.'));
    }
    if (S.st.catheter) out.push('Urin output ±' + r(clamp((S.v.sbp - 60) * 1.1, 0, 90) * (S.frac > 0.3 ? 0.3 : 1)) + ' mL/jam.');
    if (S.p.htx && S.p.htx.tube) out.push('Output WSD total ' + r(S.p.htx.out) + ' mL (laju saat ini ±' + r(S.bleedRates().htx * 60) + ' mL/jam).');
    return out.join(' ');
  };

  T.Exam = E;

  /* ==================================================================
     TINDAKAN
     ================================================================== */
  var GROUPS = [
    { id: 'ps', label: 'Primary survey' },
    { id: 'aw', label: 'Airway & napas' },
    { id: 'chest', label: 'Toraks' },
    { id: 'circ', label: 'Sirkulasi' },
    { id: 'neuro', label: 'Disabilitas' },
    { id: 'adj', label: 'Adjuvan & pemeriksaan' },
    { id: 'env', label: 'Eksposur & lain-lain' },
    { id: 'dispo', label: 'Definitif & tim' }
  ];

  function airwayIndicated(S) {
    var a = S.p.airway, g = S.gcs();
    return (a && a.sev > 0.15) || g.total <= 8 || S.v.spo2 < 90 || S.phase !== 'alive' || (S.p.resp && S.p.resp.def > 9);
  }
  function assess(letter, title) {
    return function (S) {
      var txt = E[letter](S);
      S.act('Primary survey ' + letter.toUpperCase() + ' — ' + title + '.');
      S.addFinding(letter.toUpperCase() + ' · ' + title, txt);
      var L = S.letters(), order = ['x', 'a', 'b', 'c', 'd', 'e'], idx = order.indexOf(letter);
      if (S.count(letter + '_assess') === 1) {
        var skipped = order.slice(0, idx).filter(function (k) { return L[k] === null; });
        if (skipped.length) S.warn('ps_order', 'Primary survey tidak berurutan: ' + letter.toUpperCase() + ' dinilai sebelum ' + skipped.map(function (k) { return k.toUpperCase(); }).join(', ') + '.', 1,
          'Urutan xABCDE mengikuti prioritas ancaman nyawa. Dalam tim, penilaian bisa paralel, tetapi ketua tim memastikan setiap masalah diatasi sesuai urutan prioritas.');
      }
    };
  }

  var MTP_UNITS = { prbc: 4, ffp: 4, plt: 1, ml: 2450 };
  function mtpCooler(S, n) {
    if (!S.flags.mtp || S.ended || S.phase === 'dead') return;
    if (!S.access()) { S.obs('Cooler MTP #' + n + ' tiba — menunggu akses vaskular.'); S.after(60, function (S2) { mtpCooler(S2, n); }); return; }
    if (S.peds) { S.infuse('blood', 30 * S.pt.weight, 6 * S.pt.weight); S.fl.prbc += 1; S.fl.ffp += 1; S.fl.plt += 1; }
    else { S.infuse('blood', MTP_UNITS.ml, 300); S.fl.prbc += MTP_UNITS.prbc; S.fl.ffp += MTP_UNITS.ffp; S.fl.plt += MTP_UNITS.plt; }
    S.obs('Cooler MTP #' + n + ' tiba & ditransfusikan via penghangat/rapid infuser' + (S.peds ? ' (PRC:FFP:TC 1:1:1, 10 mL/kg masing-masing).' : ' (4 PRC, 4 FFP, 1 TC apheresis).'));
    if (!S.flags.calcium && !S.peds) S.tip('Transfusi masif menurunkan Ca²⁺ terionisasi — pertimbangkan kalsium.', 'Sitrat dalam produk darah mengikat kalsium; hipokalsemia memperburuk koagulopati & kontraktilitas.');
    S.after(540, function (S2) {
      if (S2.flags.mtp && (S2.totalBleed() > 12 || S2.frac > 0.2)) mtpCooler(S2, n + 1);
    });
  }

  var DISPO = {
    or_lap: { fac: 'or', label: 'Laparotomi emergensi (damage control) di OK', delay: 300,
      need: function (S) { return !!S.p.abdo; }, wrong: 'Laparotomi tanpa sumber perdarahan intraperitoneal (eFAST negatif) — non-terapeutik & menunda kontrol sumber sebenarnya.',
      apply: function (S) { if (S.p.abdo) { S.p.abdo.ctrl = 1; S.good('Di OK: sumber perdarahan intraabdomen dikendalikan (damage control).'); } } },
    or_thor: { fac: 'or', label: 'Torakotomi / pericardial window di OK', delay: 300,
      need: function (S) { return !!(S.p.htx || S.p.tamp); }, wrong: 'Torakotomi tanpa indikasi toraks.',
      apply: function (S) {
        if (S.p.htx) S.p.htx.ctrl = 1;
        if (S.p.tamp) { S.p.tamp.definitive = true; S.p.tamp.s = 0; }
        S.good('Di OK: sumber perdarahan toraks/jantung dikendalikan.');
      } },
    angio: { fac: 'angio', label: 'Kontrol perdarahan pelvis (angioembolisasi / preperitoneal packing + fiksasi eksterna)', delay: 360,
      need: function (S) { return !!S.p.pelvis; }, wrong: 'Kontrol perdarahan pelvis tanpa fraktur pelvis.',
      apply: function (S) { if (S.p.pelvis) { S.p.pelvis.ctrl = 1; S.good('Perdarahan pelvis dikendalikan.'); } } },
    crani: { fac: 'neurosurg', label: 'Kraniotomi emergensi (bedah saraf)', delay: 420,
      need: function (S) { return !!S.p.tbi; }, wrong: 'Kraniotomi tanpa lesi intrakranial.',
      pre: function (S) { if (!S.did('ct')) S.warn('crani_noct', 'Keputusan kraniotomi tanpa CT kepala.', 2, 'Bila pasien cukup stabil, CT kepala non-kontras dikerjakan untuk lokalisasi lesi (kecuali pusat menerapkan burr hole emergensi).'); },
      apply: function (S) { if (S.p.tbi) { S.p.tbi.evacuated = true; S.good('Hematoma dievakuasi oleh bedah saraf.'); } } },
    or_cs: { fac: 'obgyn', label: 'Seksio sesarea emergensi (obstetri)', delay: 300,
      need: function (S) { return !!S.p.preg; }, wrong: 'Seksio sesarea tanpa indikasi.',
      apply: function (S) { if (S.p.preg) { S.p.preg.ctrl = 1; S.good('Bayi dilahirkan, solusio plasenta ditangani; perdarahan dikendalikan.'); } } },
    admit: { fac: 'icu', label: 'Rawat ICU/HCU bedah setelah stabil', delay: 120,
      need: function () { return true; },
      pre: function (S) { if (S.unstable()) S.warn('admit_unstable', 'Pasien dipindahkan ke ruang rawat saat masih tidak stabil.', 4, 'Pasien dipindah dari IGD setelah ancaman nyawa teratasi dan resusitasi menunjukkan respons; pasien tidak stabil memerlukan tindakan definitif (OK/rujukan).'); },
      apply: function (S) { S.good('Pasien dipindahkan ke ICU/HCU dengan pemantauan ketat.'); } }
  };

  function definitive(S, kind) {
    var d = DISPO[kind];
    if (S.flags.dispo) { S.act('Disposisi sudah diputuskan: ' + S.flags.dispo.label + '.'); return; }
    if (!S.fac[d.fac]) {
      S.act(d.label + ' — TIDAK tersedia di fasilitas ini.');
      S.warn('dispo_unavail', 'Tindakan definitif tidak tersedia di fasilitas ini.', 1, 'Kenali kemampuan fasilitas sejak awal; bila tidak mampu memberi terapi definitif, putuskan rujukan sedini mungkin.');
      return;
    }
    if (d.pre) d.pre(S);
    if (d.need && !d.need(S)) S.err('dispo_wrong', d.wrong, 6, 'Tentukan sumber masalah dengan primary survey + adjuvan (eFAST, foto toraks/pelvis) sebelum memilih tindakan definitif.');
    var delay = (d.fac === 'or' && S.fac.orDelay) || d.delay;
    S.flags.dispo = { kind: kind, t: S.t, label: d.label };
    S.act('Keputusan: ' + d.label + '. Tim disiapkan (±' + r(delay / 60) + ' menit) — lanjutkan resusitasi sampai pasien berangkat.');
    S.after(delay, function (S2) {
      if (S2.phase === 'dead') return;
      if (S2.phase === 'arrest') { S2.alert('Pasien dalam henti jantung — keberangkatan ditunda.'); S2.flags.dispo = null; return; }
      S2.addLog('Pasien diberangkatkan: ' + d.label + '.', 'good');
      d.apply(S2);
      S2.after(20, function (S3) { S3.end('dispo'); });
    });
  }

  var A = [
    /* ===================== PRIMARY SURVEY ===================== */
    { id: 'x_assess', group: 'ps', sets: ['core'], key: true, label: 'X — perdarahan eksternal masif', cost: 8, run: assess('x', 'perdarahan eksternal masif') },
    { id: 'a_assess', group: 'ps', sets: ['core'], key: true, label: 'A — jalan napas + servikal', cost: 12, run: assess('a', 'jalan napas & proteksi servikal') },
    { id: 'b_assess', group: 'ps', sets: ['core'], key: true, label: 'B — napas & ventilasi', cost: 25, run: assess('b', 'napas & ventilasi') },
    { id: 'c_assess', group: 'ps', sets: ['core'], key: true, label: 'C — sirkulasi & sumber perdarahan', cost: 30, run: assess('c', 'sirkulasi & kontrol perdarahan') },
    { id: 'd_assess', group: 'ps', sets: ['core'], key: true, label: 'D — disabilitas (GCS, pupil)', cost: 20, run: assess('d', 'disabilitas') },
    { id: 'e_assess', group: 'ps', sets: ['core'], key: true, label: 'E — eksposur & suhu', cost: 30, run: assess('e', 'eksposur & kontrol lingkungan') },
    { id: 'reassess', group: 'ps', sets: ['core'], label: 'Reevaluasi ABCDE & respons resusitasi', cost: 15,
      run: function (S) { S.act('Reevaluasi primary survey & respons resusitasi.'); S.addFinding('Reevaluasi', E.reassess(S)); } },
    { id: 'dx', group: 'ps', sets: ['core'], label: 'Diagnosis kerja (cedera mengancam nyawa)…', modal: 'dx',
      run: function (S, list) {
        S.dx = list || [];
        var lab = S.dx.map(function (id) { return T.INJ_BY_ID[id] ? T.INJ_BY_ID[id].label : id; });
        S.act('Diagnosis kerja ketua tim: ' + (lab.length ? lab.join(', ') : '(kosong)') + '.');
        var truth = S.scen.injuries || [], hit = S.dx.filter(function (x) { return truth.indexOf(x) >= 0; }).length;
        if (hit === truth.length && S.dx.length === truth.length) S.good('Diagnosis kerja tepat & lengkap.');
        else S.tip('Diagnosis kerja belum tepat/lengkap (' + hit + '/' + truth.length + ' benar' + (S.dx.length > hit ? ', ' + (S.dx.length - hit) + ' tidak sesuai' : '') + ').', 'Gunakan temuan primary survey & adjuvan untuk menyusun daftar cedera yang mengancam nyawa.');
      } },
    { id: 'team', group: 'dispo', sets: ['core'], label: 'Briefing tim & pembagian peran…', modal: 'team',
      run: function (S, res) {
        S.brief = res;
        S.act('Briefing tim: ' + (res && res.picked.length ? res.picked.length + ' butir disepakati' : 'singkat') + '.');
        if (res && res.wrong) S.tip('Ada butir briefing yang kurang tepat (lihat debrief).', '');
      } },

    /* ===================== AIRWAY & NAPAS ===================== */
    { id: 'cspine', group: 'aw', sets: ['core'], label: 'Restriksi gerak servikal (MILS + collar)',
      run: function (S) {
        if (S.st.cspine) { S.act('Restriksi servikal sudah terpasang.'); return; }
        S.st.cspine = true;
        S.act('Restriksi gerak servikal: stabilisasi manual in-line, collar servikal, pasien di matras/scoop.');
        if (!S.scen.blunt) S.tip('Pada trauma tembus tanpa defisit neurologis, restriksi servikal rutin tidak diperlukan.', 'Collar dapat mengganggu penilaian luka leher & jalan napas pada trauma tembus.');
      } },
    { id: 'jaw', group: 'aw', sets: ['core'], label: 'Jaw thrust (tanpa ekstensi kepala)',
      run: function (S) { S.st.jaw = true; S.act('Jaw thrust dengan servikal tetap in-line.'); } },
    { id: 'headtilt', group: 'aw', sets: ['core'], label: 'Head tilt–chin lift',
      run: function (S) {
        S.act('Head tilt–chin lift.');
        if (S.scen.blunt) S.err('headtilt', 'Head tilt pada trauma tumpul berisiko memperberat cedera servikal.', 4, 'Gunakan jaw thrust atau chin lift tanpa ekstensi leher, dengan stabilisasi manual in-line.');
        S.st.jaw = true;
      } },
    { id: 'suction', group: 'aw', sets: ['core'], label: 'Suction orofaring (rigid/Yankauer)',
      run: function (S) {
        var a = S.p.airway;
        if (a && a.type === 'blood') { a.sev = Math.max(0.12, a.sev - 0.35); S.act('Suction rigid: darah & bekuan disedot dari orofaring.'); S.obs('Gurgling berkurang — darah terus merembes, ulangi bila perlu.'); }
        else if (a && a.type === 'edema') S.act('Suction: sputum berjelaga disedot; stridor tidak berubah (obstruksi akibat edema).');
        else S.act('Suction orofaring: sekret minimal.');
      } },
    { id: 'opa', group: 'aw', sets: ['core'], label: 'Pasang OPA (Guedel)',
      run: function (S) {
        if (S.secured()) { S.act('Jalan napas definitif sudah terpasang.'); return; }
        if (S.gcs().total > 8 && S.phase === 'alive') { S.act('Upaya memasang OPA — pasien tersedak/muntah (refleks muntah masih ada).'); S.warn('opa_gag', 'OPA pada pasien dengan refleks muntah.', 2, 'OPA hanya untuk pasien tidak sadar tanpa refleks muntah; alternatif NPA (bila tidak ada fraktur basis kranii/midface).'); return; }
        S.st.airway = 'opa'; S.act('OPA terpasang.');
      } },
    { id: 'npa', group: 'aw', sets: ['core'], label: 'Pasang NPA',
      run: function (S) {
        if (S.secured()) { S.act('Jalan napas definitif sudah terpasang.'); return; }
        S.act('NPA dipasang.');
        if (S.p.basal) { S.err('npa_basal', 'NPA pada fraktur midface/basis kranii.', 6, 'Kontraindikasi NPA (dan NGT): curiga fraktur basis kranii (racoon eyes, Battle sign, rinore/otore LCS) atau fraktur midface — risiko masuk intrakranial.'); }
        S.st.airway = 'npa';
      } },
    { id: 'o2', group: 'aw', sets: ['core'], key: true, label: 'O₂ 10–15 L/mnt via NRM',
      run: function (S) { S.st.o2 = true; S.act('Oksigen aliran tinggi via non-rebreathing mask 15 L/menit.'); } },
    { id: 'bvm', group: 'aw', sets: ['core'], label: 'Ventilasi BVM + O₂',
      run: function (S) {
        S.st.o2 = true;
        if (S.phase === 'alive' && S.v.spo2 >= 92 && S.gcs().total > 8 && S.v.rr < 30 && !S.flags.apnea) {
          S.act('Upaya ventilasi BVM pada pasien yang bernapas spontan adekuat.');
          S.warn('bvm_unneeded', 'BVM pada pasien yang bernapas spontan adekuat.', 2, 'Berikan O₂ via NRM; BVM untuk apnea/hipoventilasi atau preoksigenasi.');
          return;
        }
        S.st.bvm = true; S.act('Ventilasi BVM + O₂ 15 L/mnt (dua penolong, servikal in-line).');
        if (S.p.tension && !S.p.tension.relieved && !S.p.tension.tube && S.p.tension.s > 0.2) S.tip('Ventilasi tekanan positif mempercepat tension pneumothorax.', 'Dekompresi segera bila ada tanda tension.');
      } },
    { id: 'rsi', group: 'aw', sets: ['core'], key: true, label: 'Intubasi RSI (+MILS) & kapnografi', cost: 90,
      run: function (S) {
        if (S.secured()) { S.act('Jalan napas definitif sudah terpasang.'); return; }
        var a = S.p.airway, g = S.gcs();
        if (S.phase === 'alive' && !S.needAccess('obat RSI')) return;
        S.flags.ettTries = (S.flags.ettTries || 0) + 1;
        if (S.scen.blunt && !S.st.cspine) S.err('rsi_nomils', 'Intubasi tanpa proteksi servikal (MILS) pada trauma tumpul.', 5, 'Lakukan manual in-line stabilization selama laringoskopi; bagian depan collar boleh dibuka.');
        if (a && (a.failETT || (a.type === 'edema' && a.sev >= (a.ettMax || 0.6)))) {
          S.act('Laringoskopi: ' + (a.type === 'edema' ? 'edema supraglotis & glotis masif, pita suara tidak terlihat' : 'darah masif & anatomi wajah rusak, pita suara tidak terlihat') + ' — intubasi GAGAL.');
          a.sev = clamp(a.sev + 0.15, 0, 1); S.flags.ettFailed = S.t;
          S.alert('Tidak bisa intubasi, oksigenasi memburuk (CICO).');
          if (S.flags.ettTries >= 2) S.warn('ett_repeat', 'Upaya intubasi berulang pada jalan napas yang sudah gagal.', 4, 'Setelah intubasi gagal pada trauma maksilofasial/edema glotis, segera lakukan jalan napas bedah (krikotiroidotomi).');
          return;
        }
        if (!airwayIndicated(S) && !S.scen.ettOk) S.warn('ett_unneeded', 'Intubasi tanpa indikasi jalan napas definitif yang jelas.', 3, 'Indikasi: obstruksi/ancaman jalan napas, GCS ≤8, gagal oksigenasi/ventilasi, cedera inhalasi bermakna, apnea.');
        S.flags.gcsPreRsi = 'E' + g.e + 'V' + g.v + 'M' + g.m + ' = ' + g.total;
        S.flags.rsiAt = S.t;
        if (S.phase === 'alive' && S.v.sbp < 90) {
          S.flags.rsiDipUntil = S.t + 180;
          S.warn('rsi_hypo', 'RSI pada pasien hipotensi tanpa resusitasi memadai — risiko kolaps pasca-intubasi.', 2, 'Resusitasi (darah, dekompresi) sebelum/bersamaan RSI; kurangi dosis induksi (mis. ketamin), siapkan vasopresor.');
        }
        S.st.airway = 'ett'; S.st.capno = true; S.setFix('airway');
        S.act('Intubasi RSI berhasil (preoksigenasi, induksi + pelumpuh otot, MILS); posisi dikonfirmasi kapnografi gelombang & auskultasi.');
        var tn = S.p.tension;
        if (tn && !tn.relieved && !tn.tube && tn.s > 0.2) { tn.s = clamp(tn.s + 0.2, 0, 1); S.alert('Ventilasi tekanan positif pasca-intubasi memperburuk tension pneumothorax!'); S.warn('ppv_tension', 'Intubasi sebelum dekompresi tension pneumothorax.', 4, 'Tension pneumothorax (B) diatasi segera — dekompresi dulu, ventilasi tekanan positif mempercepat kolaps.'); }
      } },
    { id: 'cric', group: 'aw', sets: ['core'], label: 'Krikotiroidotomi bedah', cost: 75,
      run: function (S) {
        if (S.secured()) { S.act('Jalan napas definitif sudah terpasang.'); return; }
        if (S.peds && S.pt.age < 12) { S.act('Upaya krikotiroidotomi bedah pada anak.'); S.err('cric_child', 'Krikotiroidotomi bedah pada anak <12 tahun.', 8, 'Pada anak <12 tahun gunakan krikotiroidotomi jarum dengan jet insufflation — kartilago krikoid adalah satu-satunya penyangga sirkumferensial trakea atas.'); return; }
        var a = S.p.airway;
        if (!(a && (a.failETT || S.flags.ettFailed || a.sev >= 0.6))) S.warn('cric_unneeded', 'Jalan napas bedah tanpa indikasi (intubasi belum gagal/tidak terhalang).', 4, 'Krikotiroidotomi bedah: bila intubasi gagal/tidak mungkin (edema glotis, fraktur laring, perdarahan orofaring/maksilofasial hebat).');
        if (S.scen.blunt && !S.st.cspine) S.warn('cric_nomils', 'Jalan napas bedah tanpa stabilisasi servikal.', 2, '');
        if (S.flags.rsiAt === undefined) { var g = S.gcs(); S.flags.gcsPreRsi = 'E' + g.e + 'V' + g.v + 'M' + g.m + ' = ' + g.total; S.flags.rsiAt = S.t; }
        S.st.airway = 'cric'; S.st.capno = true; S.setFix('airway');
        S.act('Krikotiroidotomi bedah: insisi membran krikotiroid, kanul trakeostomi/ETT 6.0 masuk; kapnografi (+).');
      } },
    { id: 'needle_cric', group: 'aw', sets: ['peds'], label: 'Krikotiroidotomi jarum (anak) + jet insufflation', cost: 60,
      run: function (S) {
        if (S.secured()) { S.act('Jalan napas definitif sudah terpasang.'); return; }
        var a = S.p.airway;
        if (!(a && (a.failETT || S.flags.ettFailed || a.sev >= 0.6))) S.warn('cric_unneeded', 'Krikotiroidotomi jarum tanpa indikasi.', 4, '');
        S.st.airway = 'cric'; S.flags.needleCric = true; S.setFix('airway');
        S.act('Krikotiroidotomi jarum 14G + jet insufflation (1 dtk on : 4 dtk off) — jembatan sementara ±30–45 menit.');
      } },
    { id: 'hypervent', group: 'aw', sets: ['core'], label: 'Hiperventilasi singkat (PaCO₂ 30–35)',
      run: function (S) {
        if (!S.ventilated()) { S.act('Hiperventilasi memerlukan BVM/ventilasi terkontrol.'); return; }
        S.act('Hiperventilasi singkat: laju napas dinaikkan, target PaCO₂ 30–35 mmHg.');
        var tb = S.p.tbi;
        if (!tb || tb.icp < 0.58) { S.err('hypervent_wrong', 'Hiperventilasi tanpa tanda herniasi.', 5, 'Hiperventilasi menyebabkan vasokonstriksi serebral & iskemia. Pertahankan PaCO₂ 35–45; hiperventilasi singkat hanya sebagai jembatan pada herniasi akut.'); return; }
        tb.icp = Math.max(0.2, tb.icp - 0.12); S.st.ventHyper = true;
        S.after(420, function (S2) { if (S2.st.ventHyper) { S2.st.ventHyper = false; S2.obs('Ventilasi dikembalikan ke normokapnia (PaCO₂ 35–45 mmHg).'); } });
      } },

    /* ===================== TORAKS ===================== */
    { id: 'needle', group: 'chest', sets: ['core'], side: true, label: 'Dekompresi jarum toraks…',
      dyn: function (S) { return 'Dekompresi jarum (' + (S && S.peds ? 'ICS 2 LMK' : 'ICS 4–5 ant. LMA') + ')…'; },
      run: function (S, side) {
        var tn = S.p.tension;
        S.act('Dekompresi jarum ' + side + ' (' + (S.peds ? 'ICS 2 linea midklavikula' : 'ICS 4–5 anterior linea midaksila, kateter 8 cm') + ').');
        if (!sideHit(side, tn)) {
          S.err('needle_wrong', 'Dekompresi jarum pada sisi tanpa tension pneumothorax.', 5, 'Tension adalah diagnosis klinis: distres napas, deviasi trakea menjauhi sisi sakit, suara napas hilang, hipersonor, vena leher distensi, hipotensi. Tusukan tanpa indikasi menimbulkan pneumotoraks iatrogenik.');
          if (side !== 'bilateral') S.p.iatroPtx = side;
          return;
        }
        if (side === 'bilateral' && S.phase === 'alive') S.warn('needle_bilat', 'Dekompresi bilateral pada pasien bernadi tanpa tanda bilateral.', 2, 'Dekompresi bilateral empiris dilakukan pada henti jantung traumatik; pada pasien bernadi, dekompresi sisi yang terbukti klinis.');
        if (tn.tube) { S.obs('Chest tube sudah terpasang di sisi ini.'); return; }
        if (tn.needleFails && !tn.needleTried) {
          tn.needleTried = true;
          S.obs('Tidak ada desisan udara — kateter tidak mencapai rongga pleura (dinding dada tebal/kateter tertekuk). Kondisi tidak membaik.');
          S.tip('Pertimbangkan torakostomi jari.', 'Dekompresi jarum sering gagal; torakostomi jari di ICS 4–5 anterior LMA lebih andal.');
          return;
        }
        tn.s = Math.min(tn.s, 0.06); tn.relieved = tn.relieved || 'needle'; tn.regrow = 0.025; S.setFix('tension');
        S.obs('Desisan udara keluar; trakea kembali ke tengah, tanda vital membaik.');
        S.tip('Dekompresi jarum hanya tindakan sementara — lanjutkan chest tube.', '');
      } },
    { id: 'finger', group: 'chest', sets: ['core'], side: true, label: 'Torakostomi jari (finger thoracostomy)…', cost: 45,
      run: function (S, side) {
        var tn = S.p.tension;
        S.act('Torakostomi jari ' + side + ' (ICS 4–5 anterior LMA, diseksi tumpul).');
        if (!sideHit(side, tn) && !sideHit(side, S.p.htx)) {
          if (S.phase === 'alive') S.err('finger_wrong', 'Torakostomi pada sisi tanpa pneumotoraks/hemotoraks.', 4, '');
          if (side !== 'bilateral') S.p.iatroPtx = side;
          return;
        }
        if (sideHit(side, tn) && !tn.tube) { tn.s = 0; tn.relieved = 'finger'; tn.regrow = 0.006; S.setFix('tension'); S.obs('Udara menyembur keluar, paru teraba mengembang; hemodinamik membaik.'); }
        if (sideHit(side, S.p.htx) && !S.p.htx.tube) S.obs('Darah mengalir keluar dari insisi — lanjutkan dengan chest tube.');
        S.tip('Lanjutkan pemasangan chest tube melalui insisi yang sama.', '');
      } },
    { id: 'chest_tube', group: 'chest', sets: ['core'], side: true, key: true, label: 'Chest tube (WSD) ICS 5 ant. LMA…', cost: 150,
      run: function (S, side) {
        var p = S.p, any = false;
        S.act('Chest tube ' + (S.peds ? '' : '28–32 Fr ') + side + ' di ICS 5 anterior linea midaksila, disambung ke WSD.');
        if (sideHit(side, p.tension) && !p.tension.tube) { any = true; p.tension.tube = true; p.tension.s = 0; p.tension.relieved = p.tension.relieved || 'tube'; S.setFix('tension'); S.obs('Udara keluar, undulasi (+), paru mengembang.'); }
        if (sideHit(side, p.open) && !p.open.tube) {
          any = true; p.open.tube = true; S.setFix('open');
          if (!p.open.sealed) S.warn('open_noseal', 'Chest tube dipasang tanpa menutup luka terbuka lebih dulu.', 2, 'Tutup luka dengan balut 3 sisi/vented chest seal dahulu; chest tube dipasang jauh dari luka.');
          else S.good('Chest tube dipasang jauh dari luka; balut oklusif dapat dirapatkan.');
          if (p.tension && !p.tension.tube) { p.tension.tube = true; p.tension.s = 0; }
        }
        if (sideHit(side, p.htx) && !p.htx.tube) {
          any = true; p.htx.tube = true; p.htx.out = p.htx.vol; var o = p.htx.vol; p.htx.vol = 0; S.setFix('htx');
          S.obs('Output awal WSD ' + r(o) + ' mL darah.');
          if (o >= 1500) S.alert('Output awal ≥1.500 mL — hemotoraks masif: indikasi torakotomi.');
        }
        if (p.iatroPtx && (side === p.iatroPtx || side === 'bilateral')) { any = true; p.iatroPtx = null; }
        if (!any) S.warn('tube_unneeded', 'Chest tube tanpa indikasi pada sisi ini.', 3, '');
      } },
    { id: 'seal3', group: 'chest', sets: ['core'], label: 'Balut oklusif 3 sisi / vented chest seal',
      run: function (S) {
        var o = S.p.open;
        S.act('Balut oklusif steril diplester 3 sisi (atau vented chest seal) di atas luka dada.');
        if (!o) { S.warn('seal_unneeded', 'Balut oklusif tanpa luka dada terbuka.', 1, ''); return; }
        if (o.sealed) return;
        o.sealed = true; S.setFix('open');
        S.obs('Bunyi udara terisap hilang; napas lebih nyaman.');
      } },
    { id: 'seal4', group: 'chest', sets: ['core'], label: 'Balut oklusif rapat 4 sisi',
      run: function (S) {
        var o = S.p.open;
        S.act('Luka dada ditutup balut kedap udara, diplester rapat di keempat sisi.');
        if (!o) return;
        o.sealed = true; o.occl4 = true; S.setFix('open');
        if (!o.tube && !S.p.tension) S.p.tension = { side: o.side, s: 0.05, grow: 0.12 };
        S.warn('seal4', 'Balut rapat 4 sisi tanpa chest tube dapat mengubah open pneumothorax menjadi tension.', 4, 'Gunakan balut 3 sisi (flutter valve) atau vented chest seal, lalu chest tube jauh dari luka.');
      } },
    { id: 'pericardio', group: 'chest', sets: ['core'], label: 'Perikardiosentesis (subxifoid, panduan USG)', cost: 60,
      run: function (S) {
        var tp = S.p.tamp;
        S.act('Perikardiosentesis subxifoid dengan panduan USG.');
        if (!tp) { S.err('pericardio_wrong', 'Perikardiosentesis tanpa bukti tamponade.', 6, 'Konfirmasi efusi perikard dengan eFAST/ekokardiografi lebih dulu.'); return; }
        if (tp.definitive) { S.act('Tamponade sudah ditangani definitif.'); return; }
        tp.s = 0.12; tp.tapped = (tp.tapped || 0) + 1; S.setFix('tamp');
        S.obs('Aspirasi ±20–30 mL darah tidak membeku — TD membaik, vena leher kempis.');
        S.tip('Perikardiosentesis hanya jembatan — darah akan terakumulasi lagi.', 'Terapi definitif tamponade traumatik: torakotomi/sternotomi atau pericardial window oleh ahli bedah.');
        if (S.fac.surgeonOnSite && !S.scen.pericardioOk) S.warn('pericardio_surgeon', 'Perikardiosentesis padahal ahli bedah tersedia di tempat.', 2, 'Bila ahli bedah tersedia, jangan menunda torakotomi/pericardial window.');
      } },
    { id: 'analgesia', group: 'chest', sets: ['core'], label: 'Analgesia IV titrasi (opioid/ketamin)',
      run: function (S) {
        if (!S.needAccess('analgesia')) return;
        S.act('Analgesia IV dititrasi (mis. fentanil 0,5–1 mcg/kg atau ketamin dosis analgesik).');
        if (S.p.flail) { S.p.flail.analg = true; S.good('Nyeri berkurang — ventilasi lebih adekuat.'); }
        if (S.v.sbp < 80) S.tip('Hipotensi berat — titrasi dosis kecil, pilih agen yang stabil hemodinamik (mis. ketamin).', '');
      } },

    /* ===================== SIRKULASI ===================== */
    { id: 'pressure', group: 'circ', sets: ['core'], label: 'Tekan langsung luka (direct pressure)',
      run: function (S) {
        var x = S.p.ext;
        S.act('Penekanan langsung yang kuat pada luka.');
        if (!x) return;
        if ((x.ctrl || 0) < 0.6) { x.ctrl = 0.6; x.how = 'penekanan langsung'; }
        if (x.site === 'head') { x.ctrl = 0.9; S.setFix('ext'); }
        if (x.site === 'limb' && x.ctrl < 1) S.tip('Perdarahan arteri ekstremitas masif — tourniquet lebih efektif.', 'Tekan langsung sambil menyiapkan tourniquet; pasang 5–7 cm proksimal luka, kencangkan sampai perdarahan berhenti & nadi distal hilang.');
      } },
    { id: 'tourniquet', group: 'circ', sets: ['core'], key: true, label: 'Tourniquet proksimal luka (catat jam)',
      run: function (S) {
        var x = S.p.ext;
        S.act('Tourniquet dipasang 5–7 cm proksimal luka, dikencangkan sampai perdarahan berhenti.');
        if (!x) { S.err('tq_none', 'Tourniquet tanpa perdarahan ekstremitas masif.', 4, ''); return; }
        if (x.site !== 'limb') { S.obs('Tourniquet tidak dapat dipasang pada lokasi ini.'); return; }
        if (x.ctrl >= 1) return;
        x.ctrl = 1; x.how = 'tourniquet, dipasang menit ' + fmt(S.t); S.flags.tqAt = S.t; S.setFix('ext');
        S.obs('Perdarahan berhenti, nadi distal tidak teraba. Waktu pemasangan dicatat.');
      } },
    { id: 'tq_loosen', group: 'circ', sets: ['tq'], label: 'Longgarkan tourniquet berkala (tiap 15–30 mnt)',
      run: function (S) {
        var x = S.p.ext;
        S.act('Tourniquet dilonggarkan untuk "memberi perfusi" ke distal.');
        S.err('tq_loosen', 'Melonggarkan tourniquet secara berkala.', 6, 'Tourniquet yang efektif dibiarkan terpasang sampai pasien tiba di fasilitas dengan kemampuan kontrol bedah; pelonggaran berulang menambah kehilangan darah. Catat jam pemasangan.');
        if (x && x.ctrl >= 1) { x.ctrl = 0.3; x.how = 'tourniquet dilonggarkan'; S.alert('Perdarahan kembali menyembur dari paha kanan!'); }
      } },
    { id: 'packing', group: 'circ', sets: ['core'], label: 'Wound packing + hemostatik',
      run: function (S) {
        var x = S.p.ext;
        S.act('Wound packing dengan kasa hemostatik + penekanan 3 menit.');
        if (!x) return;
        if ((x.ctrl || 0) < 0.85) { x.ctrl = 0.85; x.how = 'wound packing'; }
        if (x.site !== 'limb') S.setFix('ext');
      } },
    { id: 'iv', group: 'circ', sets: ['core'], key: true, label: 'Akses IV 2 jalur besar + sampel darah', cost: 60,
      run: function (S) {
        if (S.st.iv) { S.act('Akses IV sudah terpasang.'); return; }
        if (S.scen.ivFail && !S.flags.ivFailed) {
          S.flags.ivFailed = S.t;
          S.act('Upaya kanulasi IV perifer — GAGAL setelah 2 percobaan (vena kolaps).');
          S.tip('Bila akses IV sulit, gunakan intraoseus (IO).', 'ATLS: bila IV perifer gagal setelah 2 kali (anak) atau akses sulit, segera pasang IO (tibia proksimal/humerus).');
          return;
        }
        S.st.iv = true; S.flags.ivAt = S.t;
        S.act('Dua jalur IV ' + (S.peds ? '22–20G' : '16–18G') + ' terpasang; sampel darah lengkap, crossmatch, AGD-laktat diambil.');
      } },
    { id: 'io', group: 'circ', sets: ['core'], label: 'Akses intraoseus (IO)', cost: 25,
      run: function (S) {
        if (S.st.io) { S.act('IO sudah terpasang.'); return; }
        S.st.io = true; S.flags.ivAt = S.flags.ivAt === undefined ? S.t : S.flags.ivAt;
        S.act('Akses IO ' + (S.peds ? 'tibia proksimal' : 'humerus proksimal') + ' terpasang, aspirasi sumsum (+).');
        if (S.st.iv) S.tip('Akses IV sudah adekuat.', '');
      } },
    { id: 'cryst', group: 'circ', sets: ['core'], label: 'Kristaloid (RL) bolus',
      dyn: function (S) { return S && S.peds ? 'Kristaloid RL 20 mL/kg (' + r(20 * S.pt.weight) + ' mL)' : 'Kristaloid (RL) 1 L bolus'; },
      run: function (S) {
        if (!S.needAccess('kristaloid')) return;
        var vol = S.peds ? 20 * S.pt.weight : 1000, lim = S.peds ? 20 * S.pt.weight : 1000;
        S.infuse('cryst', vol, S.peds ? vol / 5 : 200);
        S.act('Bolus kristaloid ' + r(vol) + ' mL' + (S.st.warmed ? ' hangat' : '') + ' (total dipesan ' + r(S.fl.crystOrd) + ' mL).');
        if (S.p.burn && S.v.sbp >= 90) S.warn('burn_bolus', 'Bolus kristaloid pada luka bakar tanpa hipotensi.', 3, 'Luka bakar: infus kontinu sesuai formula (2 mL × kgBB × %TBSA; ½ dalam 8 jam pertama) dititrasi ke urin output; bolus berulang menyebabkan fluid creep.');
        else if (S.fl.crystOrd > lim && !S.p.neuro && !S.p.burn) S.warn('cryst_excess', 'Kristaloid melebihi ' + r(lim) + ' mL.', 4, 'Kristaloid berlebih memperburuk koagulopati, asidosis & hipotermia. Bila tidak respons, beralih ke produk darah (resusitasi hemostatik) & kontrol sumber perdarahan.');
        if (!S.st.warmed) S.tip('Gunakan cairan hangat (39 °C) untuk mencegah hipotermia.', '');
      } },
    { id: 'prbc', group: 'circ', sets: ['core'], key: true, label: 'PRC 2 unit (O-neg / crossmatch)',
      dyn: function (S) { return S && S.peds ? 'PRC 10 mL/kg (' + r(10 * S.pt.weight) + ' mL)' : 'PRC 2 unit (O-neg / crossmatch)'; },
      run: function (S) {
        if (!S.fac.blood) { S.act('Produk darah tidak tersedia di fasilitas ini.'); S.tip('Kendalikan perdarahan, batasi kristaloid, berikan TXA, dan rujuk segera.', ''); return; }
        if (!S.needAccess('produk darah')) return;
        var vol = S.peds ? 10 * S.pt.weight : 600;
        S.infuse('blood', vol, S.peds ? vol / 4 : 200);
        S.fl.prbc += S.peds ? 1 : 2;
        S.act((S.peds ? 'PRC ' + r(vol) + ' mL (10 mL/kg)' : 'PRC 2 unit') + ' ditransfusikan' + (S.st.warmed ? ' via penghangat.' : '.'));
        if (S.min.maxFrac < 0.12 && S.totalBleed() < 5) S.warn('prbc_unneeded', 'Transfusi pada pasien tanpa tanda syok hemoragik.', 2, '');
      } },
    { id: 'mtp', group: 'circ', sets: ['core'], label: 'Aktifkan protokol transfusi masif (1:1:1)',
      run: function (S) {
        if (!S.fac.blood) { S.act('Protokol transfusi masif tidak tersedia di fasilitas ini.'); return; }
        if (S.flags.mtp) { S.act('MTP sudah aktif.'); return; }
        S.flags.mtp = S.t;
        S.act('Protokol transfusi masif diaktifkan — bank darah menyiapkan cooler (PRC:FFP:TC ≈ 1:1:1).');
        if (S.min.maxFrac < 0.25 && S.totalBleed() < 15) S.warn('mtp_unneeded', 'MTP tanpa indikasi syok hemoragik berat.', 2, 'Indikasi MTP: syok kelas III–IV / perdarahan aktif berat (mis. skor ABC ≥2, shock index >1).');
        S.after(180, function (S2) { mtpCooler(S2, 1); });
      } },
    { id: 'txa', group: 'circ', sets: ['core'], label: 'Asam traneksamat (TXA)',
      dyn: function (S) { return S && S.peds ? 'Asam traneksamat 15 mg/kg IV' : 'Asam traneksamat 1 g IV (10 mnt) + 1 g/8 jam'; },
      run: function (S) {
        if (!S.needAccess('asam traneksamat')) return;
        if (S.flags.txa) { S.act('TXA dosis awal sudah diberikan (lanjutkan infus rumatan).'); return; }
        S.flags.txa = true; S.flags.txaAt = S.t; S.flags.txaInjury = S.sinceInjury();
        S.act('Asam traneksamat ' + (S.peds ? r(15 * S.pt.weight) + ' mg' : '1 g') + ' IV dalam 10 menit, lanjut infus rumatan (' + fmt(S.flags.txaInjury) + ' sejak cedera).');
        if (S.flags.txaInjury > 10800) S.warn('txa_late', 'TXA diberikan >3 jam setelah cedera.', 3, 'Manfaat TXA hanya bila diberikan ≤3 jam sejak cedera (idealnya ≤1 jam); setelah 3 jam risiko kematian akibat perdarahan justru meningkat.');
        if (!S.hemorrhagic() && !S.p.tbi) S.tip('TXA diindikasikan pada perdarahan bermakna/risiko perdarahan.', '');
      } },
    { id: 'calcium', group: 'circ', sets: ['core'], label: 'Kalsium (CaCl₂ 10% 10 mL / Ca glukonas 30 mL)',
      run: function (S) {
        if (!S.needAccess('kalsium')) return;
        S.flags.calcium = true; S.act('Kalsium klorida 10% 10 mL IV (atau Ca glukonas 10% 30 mL).');
        if (S.fl.prbc < 4) S.tip('Kalsium terutama saat transfusi masif / Ca²⁺ terionisasi rendah.', '');
      } },
    { id: 'binder', group: 'circ', sets: ['core'], label: 'Pelvic binder (setinggi trokanter mayor)',
      run: function (S) {
        S.act('Pelvic binder dipasang setinggi trokanter mayor; lutut & pergelangan kaki diikat (rotasi interna).');
        if (!S.p.pelvis) { S.warn('binder_unneeded', 'Pelvic binder tanpa tanda fraktur pelvis tidak stabil.', 1, ''); return; }
        if (S.flags.binder !== undefined) return;
        S.p.pelvis.ctrl = Math.max(S.p.pelvis.ctrl || 0, 0.5); S.flags.binder = S.t; S.setFix('pelvis');
        S.obs('Volume pelvis berkurang — membantu tamponade perdarahan vena/fraktur.');
      } },
    { id: 'splint', group: 'circ', sets: ['core'], label: 'Bidai / traksi fraktur femur',
      run: function (S) {
        S.act('Bidai traksi dipasang pada ekstremitas bawah yang deformitas.');
        if (!S.p.femur) { S.warn('splint_unneeded', 'Bidai traksi tanpa fraktur femur.', 1, ''); return; }
        S.p.femur.ctrl = 0.5; S.obs('Panjang tungkai dipulihkan; nyeri & perdarahan berkurang. Cek nadi distal: teraba.');
      } },
    { id: 'lud', group: 'circ', sets: ['preg'], key: true, label: 'Pergeseran uterus ke kiri (manual LUD)',
      run: function (S) {
        if (S.st.lud) { S.act('LUD sudah dilakukan.'); return; }
        S.st.lud = true; S.setFix('lud');
        S.act('Uterus digeser manual ke kiri (atau papan spinal dimiringkan 15–30° ke kiri) — mengurangi kompresi aortokaval.');
      } },
    { id: 'pressor', group: 'circ', sets: ['core'], label: 'Vasopresor (norepinefrin titrasi)',
      run: function (S) {
        if (!S.needAccess('vasopresor')) return;
        S.act('Infus norepinefrin dimulai 0,05–0,1 mcg/kg/mnt, dititrasi.');
        if (!S.p.neuro) {
          if (S.hemorrhagic()) S.err('pressor_hemo', 'Vasopresor pada syok hemoragik.', 6, 'Syok hemoragik diatasi dengan kontrol perdarahan + produk darah, bukan vasopresor (vasokonstriksi memperburuk perfusi jaringan).');
          return;
        }
        if (!S.did('efast') && !S.did('cxr') && !S.did('pxr')) S.warn('pressor_noexclude', 'Vasopresor sebelum menyingkirkan perdarahan.', 2, 'Pada trauma, hipotensi dianggap hipovolemia sampai terbukti lain. Singkirkan perdarahan (eFAST, foto toraks & pelvis) sebelum menyimpulkan syok neurogenik.');
        S.flags.pressor = true; S.setFix('pressor');
      } },
    { id: 'atropine', group: 'circ', sets: ['core'], label: 'Atropin 0,5–1 mg IV',
      run: function (S) {
        if (!S.needAccess('atropin')) return;
        S.act('Atropin 0,5 mg IV.');
        S.flags.atropineUntil = S.t + 600;
        if (S.v.hr > 60) S.warn('atropine_wrong', 'Atropin pada pasien tanpa bradikardia.', 2, '');
      } },
    { id: 'cpr', group: 'circ', sets: ['core'], label: 'Kompresi dada (RJP)',
      dyn: function (S) { return S && S.st.cpr ? 'Hentikan kompresi dada' : 'Kompresi dada (RJP)'; },
      run: function (S) {
        if (S.st.cpr) { S.st.cpr = false; S.act('Kompresi dada dihentikan.'); S.emit('cpr', false); return; }
        if (S.phase === 'alive') { S.act('Upaya kompresi dada pada pasien bernadi.'); S.err('cpr_pulse', 'Kompresi dada pada pasien dengan nadi.', 8, 'RJP hanya untuk pasien tanpa nadi.'); return; }
        S.st.cpr = true; S.flags.cprStart = S.t; S.act('Kompresi dada dimulai.'); S.emit('cpr', true);
        if (!S.flags.tcaTip) { S.flags.tcaTip = true; S.tip('Henti jantung traumatik: atasi penyebab reversibel lebih dulu.', 'Pada henti jantung traumatik (hipovolemia, hipoksia, tension, tamponade), kompresi saja jarang efektif — prioritaskan oksigenasi, dekompresi dada bilateral, kontrol perdarahan + darah.'); }
      } },
    { id: 'pulse', group: 'circ', sets: ['core'], label: 'Raba nadi sentral & perifer',
      run: function (S) {
        S.act('Meraba nadi karotis, femoral & radial.');
        var s = S.v.sbp;
        S.addFinding('Nadi', S.phase !== 'alive' ? 'Nadi sentral TIDAK teraba.' : s >= 85 ? 'Nadi radial, femoral & karotis teraba (' + r(S.v.hr) + '×/mnt).' : s >= 65 ? 'Nadi radial tidak teraba; femoral & karotis teraba lemah.' : 'Hanya nadi karotis teraba, sangat lemah.');
      } },

    /* ===================== DISABILITAS ===================== */
    { id: 'gds', group: 'neuro', sets: ['core'], label: 'Gula darah kapiler',
      run: function (S) { S.flags.gds = true; S.act('Pemeriksaan gula darah kapiler.'); S.addFinding('GDS', 'GDS ' + S.scen.init.gds + ' mg/dL.'); } },
    { id: 'hob', group: 'neuro', sets: ['core'], label: 'Elevasi kepala 30° (reverse Trendelenburg)',
      run: function (S) {
        if (S.st.hob) { S.act('Kepala sudah dielevasi.'); return; }
        S.st.hob = true; S.act('Kepala dielevasi 30° dengan posisi reverse Trendelenburg (servikal tetap in-line), collar tidak menekan vena leher.');
        if (S.p.tbi) S.p.tbi.icp = Math.max(0.1, S.p.tbi.icp - 0.04);
      } },
    { id: 'hyperosm', group: 'neuro', sets: ['core'], label: 'Terapi hiperosmolar (NaCl 3% / mannitol)',
      run: function (S) {
        if (!S.needAccess('terapi hiperosmolar')) return;
        var tb = S.p.tbi;
        S.act(S.v.sbp < 100 ? 'NaCl 3% 250 mL IV cepat (pilihan pada hipotensi).' : 'Mannitol 20% 1 g/kgBB IV (atau NaCl 3% 250 mL).');
        if (!tb || tb.icp < 0.45) { S.warn('hyperosm_wrong', 'Terapi hiperosmolar tanpa tanda peningkatan TIK/herniasi.', 3, 'Indikasi: tanda herniasi (anisokor, penurunan GCS ≥2, postur ekstensi) sambil menunggu bedah saraf.'); return; }
        var n = S.count('hyperosm');
        tb.icp = Math.max(0.2, tb.icp - (n === 1 ? 0.25 : 0.1)); S.setFix('icp');
        S.obs('Beberapa menit kemudian ukuran pupil mengecil & refleks cahaya membaik sementara.');
        S.tip('Terapi hiperosmolar hanya jembatan — segera CT & bedah saraf.', '');
      } },
    { id: 'anticonv', group: 'neuro', sets: ['core'], label: 'Profilaksis kejang (levetiracetam / fenitoin)',
      run: function (S) {
        if (!S.needAccess('antikonvulsan')) return;
        S.act('Levetiracetam 20 mg/kg IV (atau fenitoin) untuk profilaksis kejang pasca-cedera kepala.');
        if (!S.p.tbi) S.warn('anticonv_wrong', 'Antikonvulsan tanpa cedera otak.', 1, '');
      } },
    { id: 'reversal', group: 'neuro', sets: ['core'], label: 'Reversal antikoagulan (PCC + vitamin K)',
      run: function (S) {
        if (!S.needAccess('reversal antikoagulan')) return;
        S.act('PCC 4-faktor 25–50 IU/kg + vitamin K 10 mg IV pelan.');
        if (!S.p.anticoag) { S.warn('reversal_wrong', 'Reversal antikoagulan pada pasien tanpa antikoagulan.', 3, 'Risiko trombosis tanpa manfaat.'); return; }
        S.flags.reversed = S.t; S.setFix('reverse');
        S.obs('INR ulang 15 menit kemudian diharapkan ≤1,5.');
      } },
    { id: 'steroid', group: 'neuro', sets: ['core'], label: 'Metilprednisolon dosis tinggi',
      run: function (S) {
        S.act('Metilprednisolon dosis tinggi IV.');
        S.err('steroid', 'Steroid dosis tinggi tidak direkomendasikan pada trauma (cedera medula spinalis/cedera otak).', 6, 'Tidak terbukti memperbaiki luaran neurologis & meningkatkan komplikasi (infeksi, perdarahan GI).');
      } },

    /* ===================== ADJUVAN ===================== */
    { id: 'monitor', group: 'adj', sets: ['core'], key: true, label: 'Pasang monitor (EKG, SpO₂, TD, suhu)',
      run: function (S) { if (S.st.monitor) { S.act('Monitor sudah terpasang.'); return; } S.st.monitor = true; S.flags.monAt = S.t; S.act('Monitor EKG 3 sadapan, pulse oximetry, TD non-invasif tiap 3 menit & probe suhu dipasang.'); } },
    { id: 'efast', group: 'adj', sets: ['core'], key: true, label: 'eFAST', cost: 60,
      run: function (S) { S.act('eFAST dikerjakan (perikardium, RUQ, LUQ, pelvis, kedua hemitoraks).'); S.addFinding('eFAST', E.efast(S)); } },
    { id: 'cxr', group: 'adj', sets: ['core'], label: 'Foto toraks AP (portabel)', cost: 120,
      run: function (S) {
        S.act('Foto toraks AP portabel.');
        var tn = S.p.tension;
        if (tn && !tn.relieved && !tn.tube && tn.s > 0.3) S.err('cxr_tension', 'Menunggu foto toraks sebelum dekompresi tension pneumothorax.', 6, 'Tension pneumothorax adalah diagnosis KLINIS — dekompresi segera, jangan menunggu radiologi.');
        S.addFinding('Foto toraks', E.cxr(S));
      } },
    { id: 'pxr', group: 'adj', sets: ['core'], label: 'Foto pelvis AP', cost: 120,
      run: function (S) { S.act('Foto pelvis AP portabel.'); S.addFinding('Foto pelvis', E.pxr(S)); } },
    { id: 'labs', group: 'adj', sets: ['core'], label: 'Lab: DL, crossmatch, AGD-laktat-BD, koagulasi, β-hCG',
      run: function (S) { S.act('Sampel lab: darah lengkap, golongan & crossmatch, AGD + laktat + base deficit, koagulasi, β-hCG (perempuan).'); S.addFinding('Lab POC', S.labs()); } },
    { id: 'ecg12', group: 'adj', sets: ['core'], label: 'EKG 12 sadapan', cost: 30,
      run: function (S) {
        S.act('EKG 12 sadapan.');
        var hr = r(S.v.hr);
        S.addFinding('EKG 12 sadapan', S.phase !== 'alive' ? 'Aktivitas listrik tanpa nadi.' : (hr > 100 ? 'Sinus takikardia ' : hr < 60 ? 'Sinus bradikardia ' : 'Ritme sinus ') + hr + '×/mnt' + (F(S, 'ecg') ? '; ' + F(S, 'ecg') : ', tanpa aritmia atau perubahan ST bermakna') + '.');
      } },
    { id: 'foley', group: 'adj', sets: ['core'], label: 'Kateter urin (Foley)', cost: 30,
      run: function (S) {
        S.act('Pemasangan kateter urin.');
        if (S.p.urethral) { S.err('foley_urethral', 'Kateter urin pada curiga cedera uretra (darah di meatus).', 8, 'Darah di meatus/hematoma perineum → kontraindikasi kateter transuretra; lakukan uretrografi retrograd dulu, alternatif sistostomi suprapubik.'); return; }
        S.st.catheter = true; S.obs('Urin keluar ' + (S.p.abdo || S.p.pelvis ? 'kemerahan' : 'jernih') + '; pantau urin output (target ≥0,5 mL/kg/jam dewasa, ≥1 mL/kg/jam anak).');
      } },
    { id: 'ogt', group: 'adj', sets: ['core'], label: 'Pipa orogastrik (OGT)',
      run: function (S) { S.st.gastric = 'ogt'; S.act('Pipa orogastrik dipasang untuk dekompresi lambung.'); } },
    { id: 'ngt', group: 'adj', sets: ['core'], label: 'Pipa nasogastrik (NGT)',
      run: function (S) {
        S.act('Pipa nasogastrik dipasang.');
        if (S.p.basal) { S.err('ngt_basal', 'NGT pada curiga fraktur basis kranii/midface.', 6, 'Gunakan pipa orogastrik — NGT dapat masuk intrakranial melalui lamina kribrosa yang patah.'); }
        S.st.gastric = 'ngt';
      } },
    { id: 'ct', group: 'adj', sets: ['core'], label: 'CT scan (kepala / whole-body) — ±10 mnt', cost: 600,
      run: function (S) {
        if (!S.fac.ct) { S.act('CT scan tidak tersedia di fasilitas ini.'); return; }
        var uns = S.unstable();
        S.act('Pasien dibawa ke CT scan.');
        if (uns) S.err('ct_unstable', 'Pasien TIDAK STABIL dikirim ke CT scan.', 10, 'CT hanya untuk pasien yang hemodinamik normal/terkontrol. Pasien tidak stabil: atasi ancaman nyawa, gunakan adjuvan di IGD (eFAST, foto toraks/pelvis), lalu ke OK/rujuk.');
        S.addFinding('CT scan', F(S, 'ct') || 'Tidak tampak cedera tambahan yang mengubah tata laksana.');
      } },
    { id: 'secondary', group: 'adj', sets: ['core'], label: 'Survei sekunder (AMPLE + head-to-toe)', cost: 240,
      run: function (S) {
        S.act('Survei sekunder: anamnesis AMPLE & pemeriksaan head-to-toe.');
        if (!S.psDone() || S.unstable()) S.warn('secondary_early', 'Survei sekunder dimulai sebelum primary survey selesai/pasien stabil.', 3, 'Survei sekunder dilakukan setelah primary survey selesai, resusitasi berjalan, dan tanda vital mulai normal. Bila memburuk, kembali ke primary survey.');
        S.addFinding('AMPLE', F(S, 'ample') || '—');
        S.addFinding('Survei sekunder', F(S, 'secondary') || 'Tidak ada temuan tambahan bermakna.');
      } },
    { id: 'logroll', group: 'adj', sets: ['core'], label: 'Log roll (periksa punggung)', cost: 30,
      run: function (S) {
        S.act('Log roll dengan 4 orang, servikal in-line; punggung & perineum diperiksa.');
        if (S.scen.blunt && !S.st.cspine) S.warn('logroll_nocspine', 'Log roll tanpa restriksi servikal.', 3, '');
        S.addFinding('Log roll', E.back(S));
      } },
    { id: 'fetal', group: 'adj', sets: ['preg'], label: 'Pemantauan janin (CTG / Doppler)',
      run: function (S) {
        S.act('Pemantauan denyut jantung janin & kontraksi (CTG).');
        var b = S.flags.fetalBad || 0;
        S.addFinding('CTG', b < 60 ? 'DJJ 145×/mnt, variabilitas baik, kontraksi tiap 4–5 menit.' : b < 240 ? 'DJJ 165×/mnt, variabilitas menurun, deselerasi lambat berulang; kontraksi tiap 2–3 menit.' : 'Bradikardia janin 95×/mnt dengan variabilitas minimal → gawat janin.');
        S.flags.fetalChecked = S.t;
      } },

    /* ===================== EKSPOSUR & LAIN ===================== */
    { id: 'warm', group: 'env', sets: ['core'], key: true, label: 'Cegah hipotermia (selimut hangat + cairan/darah hangat)',
      run: function (S) {
        if (S.st.warmed) { S.act('Penghangatan sudah berjalan.'); return; }
        S.st.warmed = true; S.flags.warmAt = S.t;
        S.act('Selimut hangat/forced-air warmer, suhu ruangan dinaikkan, cairan & darah melalui penghangat.');
        if (!S.st.exposed) S.tip('Jangan lupa eksposur lengkap (E) sebelum/di sela penghangatan.', '');
      } },
    { id: 'stopburn', group: 'env', sets: ['burn'], label: 'Hentikan proses luka bakar (lepas pakaian & perhiasan)',
      run: function (S) { S.flags.stopBurn = S.t; S.act('Pakaian terbakar, cincin, jam & perhiasan dilepas; serbuk kimia disikat (bila ada).'); } },
    { id: 'burncalc', group: 'env', sets: ['burn'], label: 'Estimasi %TBSA & mulai cairan luka bakar…', modal: 'burn',
      run: function (S, res) {
        if (!S.needAccess('cairan luka bakar')) return;
        if (!res) return;
        S.burnCalc = res;
        var per8 = 2 * S.pt.weight * res.tbsa / 2, rate = per8 / 8;
        S.act('Estimasi luas luka bakar ' + res.tbsa + '% TBSA → RL ' + r(2 * S.pt.weight * res.tbsa) + ' mL/24 jam; ' + r(rate) + ' mL/jam untuk 8 jam pertama (titrasi ke urin output 0,5 mL/kg/jam).');
        S.inf.push({ kind: 'burn', ml: per8, rate: rate / 60 });
      } },
    { id: 'escharotomy', group: 'env', sets: ['burn'], label: 'Konsul eskarotomi (luka bakar melingkar)',
      run: function (S) {
        S.act('Konsultasi bedah plastik/luka bakar untuk eskarotomi.');
        if (S.p.burn && (S.p.burn.circChest || S.p.burn.circArms)) { S.flags.eschar = S.t; S.good('Eskarotomi direncanakan untuk luka bakar melingkar (kompartemen & ventilasi).'); }
        else S.warn('eschar_wrong', 'Eskarotomi tanpa luka bakar melingkar.', 2, '');
      } },
    { id: 'tetanus', group: 'env', sets: ['core'], label: 'Profilaksis tetanus (± antibiotik fraktur terbuka)',
      run: function (S) { S.flags.tetanus = true; S.act('Profilaksis tetanus (toksoid ± imunoglobulin sesuai status imunisasi)' + (S.scen.openFx ? ' + sefazolin IV untuk fraktur terbuka.' : '.')); } },
    { id: 'antid', group: 'env', sets: ['preg'], label: 'Imunoglobulin anti-D (Rh negatif)',
      run: function (S) {
        S.act('Imunoglobulin anti-D 300 mcg IM.');
        if (!S.p.preg) return;
        if (!S.did('labs')) S.tip('Periksa golongan darah & rhesus dahulu.', '');
        if (S.p.preg.rhNeg) S.flags.antid = S.t; else S.warn('antid_wrong', 'Anti-D pada ibu Rh positif.', 2, '');
      } },

    /* ===================== DEFINITIF & TIM ===================== */
    { id: 'call_surg', group: 'dispo', sets: ['core'], label: 'Hubungi dokter bedah / aktifkan tim trauma',
      run: function (S) {
        if (S.flags.surgeon !== undefined) { S.act('Dokter bedah sudah dihubungi.'); return; }
        S.flags.surgeon = S.t;
        S.act(S.fac.surgeon ? 'Dokter bedah & tim trauma diaktifkan; OK diberi tahu.' : 'Konsultasi telepon ke dokter bedah RS rujukan (fasilitas ini tidak memiliki dokter bedah).');
      } },
    { id: 'consult_ns', group: 'dispo', sets: ['core'], label: 'Konsul bedah saraf',
      run: function (S) { S.flags.ns = S.t; S.act(S.fac.neurosurg ? 'Konsultasi bedah saraf — tim bersiap.' : 'Konsultasi bedah saraf RS rujukan via telepon (tidak ada bedah saraf di fasilitas ini).'); } },
    { id: 'consult_obg', group: 'dispo', sets: ['preg'], label: 'Konsul obstetri',
      run: function (S) { S.flags.obg = S.t; S.act('Dokter obstetri dipanggil ke IGD untuk evaluasi ibu & janin.'); } },
    { id: 'or_lap', group: 'dispo', sets: ['core'], label: 'Laparotomi emergensi (OK)', run: function (S) { definitive(S, 'or_lap'); } },
    { id: 'or_thor', group: 'dispo', sets: ['core'], label: 'Torakotomi / pericardial window (OK)', run: function (S) { definitive(S, 'or_thor'); } },
    { id: 'angio', group: 'dispo', sets: ['core'], label: 'Kontrol perdarahan pelvis (angio / preperitoneal packing)', run: function (S) { definitive(S, 'angio'); } },
    { id: 'crani', group: 'dispo', sets: ['core'], label: 'Kraniotomi emergensi (bedah saraf)', run: function (S) { definitive(S, 'crani'); } },
    { id: 'or_cs', group: 'dispo', sets: ['preg'], label: 'Seksio sesarea emergensi', run: function (S) { definitive(S, 'or_cs'); } },
    { id: 'pmcs', group: 'dispo', sets: ['preg'], label: 'Seksio sesarea perimortem (henti jantung)',
      run: function (S) {
        S.act('Seksio sesarea perimortem.');
        if (S.phase === 'alive') { S.err('pmcs_alive', 'SC perimortem pada ibu yang masih bernadi.', 10, 'SC perimortem hanya pada henti jantung maternal dengan usia kehamilan ≥20 minggu (fundus ≥ pusat), dimulai dalam 4 menit.'); return; }
        S.flags.pmcs = S.t; S.st.lud = true; if (S.p.preg) S.p.preg.ctrl = 1;
        S.obs('Bayi dilahirkan; kompresi aortokaval hilang — peluang ROSC ibu meningkat.');
      } },
    { id: 'admit', group: 'dispo', sets: ['core'], label: 'Rawat ICU/HCU (setelah stabil)', run: function (S) { definitive(S, 'admit'); } },
    { id: 'transfer', group: 'dispo', sets: ['core'], key: true, label: 'Rujuk ke RS/trauma center (SBAR)…', modal: 'sbar',
      run: function (S, res) {
        if (S.flags.dispo) { S.act('Disposisi sudah diputuskan: ' + S.flags.dispo.label + '.'); return; }
        S.sbar = res;
        var dest = S.fac.referTo || 'trauma center';
        S.flags.dispo = { kind: 'transfer', t: S.t, label: 'Rujuk ke ' + dest };
        S.act('Komunikasi dokter-ke-dokter (SBAR) dengan ' + dest + '; pasien diterima. Ambulans disiapkan (±' + r((S.fac.transferDelay || 240) / 60) + ' menit).');
        if ((S.scen.definitive || []).indexOf('transfer') < 0) S.warn('transfer_unneeded', 'Rujukan padahal tata laksana definitif tersedia di fasilitas ini.', 4, 'Rujukan menunda terapi definitif bila fasilitas sendiri mampu.');
        S.after(S.fac.transferDelay || 240, function (S2) {
          if (S2.phase === 'dead') return;
          if (S2.phase === 'arrest') { S2.alert('Pasien henti jantung — keberangkatan ambulans dibatalkan.'); S2.flags.dispo = null; return; }
          S2.addLog('Ambulans berangkat dengan pendamping ke ' + dest + '.', 'good');
          S2.after(15, function (S3) { S3.end('dispo'); });
        });
      } },
    { id: 'handover', group: 'dispo', sets: ['core'], label: 'Akhiri skenario', end: true, run: function () {} }
  ];

  /* Daftar cedera mengancam nyawa untuk diagnosis kerja */
  T.INJURIES = [
    { id: 'airway_obs', label: 'Obstruksi / ancaman jalan napas' },
    { id: 'tension', label: 'Tension pneumothorax' },
    { id: 'open_ptx', label: 'Open pneumothorax' },
    { id: 'massive_htx', label: 'Hemotoraks masif' },
    { id: 'flail', label: 'Flail chest / kontusio paru' },
    { id: 'tamponade', label: 'Tamponade jantung' },
    { id: 'abdo_bleed', label: 'Perdarahan intraabdomen (organ solid)' },
    { id: 'pelvis', label: 'Fraktur pelvis tidak stabil' },
    { id: 'ext_bleed', label: 'Perdarahan eksternal masif ekstremitas' },
    { id: 'femur', label: 'Fraktur femur/panggul' },
    { id: 'tbi_herniation', label: 'Cedera otak berat dengan herniasi' },
    { id: 'tbi_ich', label: 'Perdarahan intrakranial (dengan koagulopati)' },
    { id: 'sci_neuro', label: 'Cedera medula servikal + syok neurogenik' },
    { id: 'inhalation', label: 'Cedera inhalasi' },
    { id: 'co', label: 'Keracunan karbon monoksida' },
    { id: 'burn_major', label: 'Luka bakar luas (>20% TBSA)' },
    { id: 'abruption', label: 'Solusio plasenta' },
    { id: 'urethra', label: 'Cedera uretra' },
    { id: 'maxfac', label: 'Fraktur maksilofasial berat' },
    { id: 'shock_comp', label: 'Syok hemoragik terkompensasi (anak)' }
  ];
  T.INJ_BY_ID = {};
  T.INJURIES.forEach(function (x) { T.INJ_BY_ID[x.id] = x; });

  T.GROUPS = GROUPS;
  T.ACTIONS = A;
  T.ACTIONS_BY_ID = {};
  A.forEach(function (a) { T.ACTIONS_BY_ID[a.id] = a; });
})();
