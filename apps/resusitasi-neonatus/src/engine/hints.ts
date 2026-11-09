/**
 * Petunjuk Mode Belajar: langkah berikutnya menurut algoritma, berdasarkan apa yang
 * TERLIHAT (bukan variabel tersembunyi), kecuali tanda klinis khas yang dapat dilihat
 * pemeriksa (mis. abdomen skafoid, micrognathia).
 */
import type { Scenario } from './schema';
import type { SimState } from './state';
import { observe } from './observe';
import { HEART_RATE, OXYGEN, TEMPERATURE, TIMING, initialFio2Range } from '../clinical/guidelines';

export interface Hint {
  text: string;
  actions: string[];
}

const did = (s: SimState, id: string) => s.log.some((l) => l.action === id);

export function getHint(s: SimState, sc: Scenario): Hint | null {
  if (s.phase === 'ended') return null;
  const o = observe(s, sc);
  const ga = sc.hidden.gaWeeks;
  if (s.phase === 'prebirth') {
    if (!did(s, 'prep-risk')) return { text: 'Mulai dengan 4 pertanyaan pra-kelahiran untuk menilai risiko.', actions: ['prep-risk'] };
    if (!did(s, 'prep-team')) return { text: 'Lakukan briefing tim dan bagi peran.', actions: ['prep-team'] };
    if (!did(s, 'prep-equipment')) return { text: 'Periksa kelengkapan dan fungsi alat.', actions: ['prep-equipment'] };
    return { text: 'Persiapan selesai. Bila risiko tinggi, panggil tambahan personel. Lalu tekan "Bayi lahir".', actions: ['call-help', 'birth'] };
  }
  const needsVent = o.breathing === 'apnea' || o.breathing === 'megap-megap' || s.hr < HEART_RATE.PPV_BELOW_BPM;
  if (s.cord.decision === 'belum')
    return { text: 'Putuskan tali pusat: bayi bugar → tunda penjepitan; bayi tidak bugar yang perlu VTP → jangan tunda resusitasi.', actions: ['initial-assess', 'cord'] };
  if (!s.initialAssessed) return { text: 'Penilaian awal: cukup bulan? tonus baik? bernapas/menangis?', actions: ['initial-assess'] };

  // bayi bugar
  if (sc.vigorousAtBirth && !needsVent && s.vent.mode === 'none' && !s.compressions.active) {
    if (!s.skinToSkin && !s.warmer) return { text: 'Bayi bugar: keringkan, kontak kulit ke kulit dengan ibu, pantau napas, tonus, warna, dan suhu.', actions: ['dry', 'skin-to-skin'] };
    if (!s.dried && ga >= TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS) return { text: 'Keringkan bayi.', actions: ['dry'] };
    if (!s.tempProbe) return { text: 'Ukur suhu aksila.', actions: ['temp-probe'] };
    return { text: 'Bayi stabil: hindari intervensi yang tidak perlu. Informasikan keluarga lalu akhiri skenario.', actions: ['inform-family', 'end'] };
  }

  // termoregulasi awal
  if (!s.warmer && !s.skinToSkin && sc.equipment.radiantWarmer && (s.cord.clampedAt ?? Infinity) <= s.t)
    return { text: 'Bawa bayi ke penghangat radiant untuk langkah awal.', actions: ['warmer'] };
  if (ga < TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS && !s.wrapped)
    return { text: `Prematur <${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} minggu: bungkus plastik tanpa dikeringkan + topi.`, actions: ['wrap', 'hat'] };
  if (ga >= TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS && !s.dried && s.t < 90) return { text: 'Keringkan dan stimulasi; posisikan kepala menghidu.', actions: ['dry', 'position'] };
  if (!s.positioned && s.t < 90) return { text: 'Posisikan kepala menghidu; isap hanya bila ada sumbatan.', actions: ['position'] };

  // kelainan khas
  if (sc.hidden.obstruction === 'robin' && !s.prone && !s.npa && !s.lma && !s.ett.placed)
    return { text: 'Rahang kecil dan lidah jatuh ke belakang (Pierre Robin): posisikan tengkurap; bila masih tersumbat pasang pipa nasofaring atau LMA.', actions: ['prone', 'npa', 'lma'] };
  if (sc.hidden.obstruction === 'choanal' && !s.oralAirway && o.color !== 'merah-muda')
    return { text: 'Sianosis yang membaik saat menangis — curigai atresia koana. Pasang jalan napas oral.', actions: ['oral-airway'] };
  if (sc.hidden.cdh && !s.ett.placed && s.t > 0)
    return { text: 'Abdomen skafoid, suara napas kiri menurun: curigai hernia diafragmatika. Hindari VTP masker berkepanjangan; intubasi segera dan pasang OGT dengan isap.', actions: ['intubate', 'ogt'] };
  if (sc.hidden.cdh && s.ett.placed && !s.ogt) return { text: 'Pasang pipa orogastrik untuk dekompresi lambung.', actions: ['ogt'] };

  // ventilasi
  if (needsVent && s.vent.mode !== 'ppv') {
    const fr = initialFio2Range(ga);
    return {
      text: `Apnea/megap-megap atau HR <${HEART_RATE.PPV_BELOW_BPM}: mulai VTP (target ≤${TIMING.PPV_START_DEADLINE_S} detik), FiO₂ awal ${fr.min === fr.max ? fr.min : fr.min + '–' + fr.max}%. Pasang oksimeter tangan kanan; pertimbangkan EKG. Panggil bantuan.`,
      actions: ['ppv-start', 'pulse-ox', 'call-help'],
    };
  }
  if (s.vent.mode === 'ppv' && !s.pulseOx.site && sc.equipment.pulseOximeter) return { text: 'Pasang pulse oximeter di tangan kanan (preduktal).', actions: ['pulse-ox'] };
  if (s.vent.mode === 'ppv' && o.chest !== 'baik' && !s.busy.some((b) => b.interruptsVent)) {
    const next = !s.mr.M && s.vent.iface === 'mask' ? 'mr-m' : !s.mr.R && s.vent.iface === 'mask' ? 'mr-r' : !s.mr.S ? 'mr-s' : !s.mr.O && s.vent.iface === 'mask' ? 'mr-o' : s.mr.P < 2 ? 'mr-p' : !s.mr.A ? 'lma' : 'check-chest';
    if (s.pneumothorax.active) return { text: 'Perburukan mendadak dengan suara napas asimetris: curigai pneumotoraks — transiluminasi, lalu aspirasi jarum.', actions: ['check-chest', 'transillumination', 'needle'] };
    return { text: 'Dada tidak mengembang: lakukan langkah koreksi MR. SOPA secara berurutan.', actions: [next] };
  }
  if (s.pneumothorax.active) return { text: 'Perburukan mendadak, suara napas asimetris: curigai pneumotoraks — transiluminasi, aspirasi jarum.', actions: ['check-chest', 'transillumination', 'needle'] };

  // kompresi
  const effS = (s.flags.ppvEffectiveS as number) ?? 0;
  if (!s.compressions.active && s.hr < HEART_RATE.COMPRESSIONS_BELOW_BPM && effS >= TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S)
    return {
      text: `HR <${HEART_RATE.COMPRESSIONS_BELOW_BPM} setelah ≥${TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S} detik ventilasi efektif: pasang jalan napas alternatif, mulai kompresi 3:1, FiO₂ ${OXYGEN.FIO2_DURING_COMPRESSIONS}%, EKG, panggil bantuan.`,
      actions: [s.ett.placed || s.lma ? 'compressions-start' : 'intubate', 'compressions-start', 'fio2', 'ecg'],
    };
  if (s.compressions.active && s.hr >= HEART_RATE.COMPRESSIONS_BELOW_BPM) return { text: `HR ≥${HEART_RATE.COMPRESSIONS_BELOW_BPM}: hentikan kompresi, lanjutkan VTP.`, actions: ['compressions-stop'] };
  if (s.compressions.active) {
    if (!s.ett.placed && !s.lma) return { text: 'Kompresi sebaiknya disertai ventilasi lewat ETT/LMA.', actions: ['intubate', 'lma'] };
    if (s.ecg.placedAt === null && sc.equipment.ecgMonitor) return { text: 'Pasang EKG untuk HR akurat.', actions: ['ecg'] };
    if (s.access.uvcAt === null && sc.equipment.uvc) return { text: 'Siapkan akses UVC untuk obat.', actions: ['uvc', 'call-help'] };
    if (s.compressions.totalS >= TIMING.COMPRESSIONS_REASSESS_S && s.hr < HEART_RATE.EPINEPHRINE_BELOW_BPM) {
      const lastEpi = [...s.drugs].reverse().find((d) => d.drug === 'epinefrin');
      if (!lastEpi || s.t - lastEpi.t >= TIMING.EPINEPHRINE_REPEAT_S.min)
        return { text: `HR tetap <${HEART_RATE.EPINEPHRINE_BELOW_BPM} setelah kompresi + ventilasi efektif: berikan epinefrin (IV/IO lebih dipilih; ETT sambil menunggu akses).`, actions: ['epinephrine'] };
      return { text: 'Bila HR tidak membaik: periksa ventilasi & kompresi; pertimbangkan hipovolemia (cairan) dan pneumotoraks.', actions: ['check-chest', 'nacl'] };
    }
    return { text: `Lanjutkan kompresi 3:1 terkoordinasi; nilai ulang HR setelah ${TIMING.COMPRESSIONS_REASSESS_S} detik.`, actions: ['auscultate'] };
  }

  // titrasi oksigen
  if (o.target && s.vent.mode !== 'none') {
    if (o.spo2Display !== null && o.spo2Display < o.target.min - OXYGEN.SPO2_TOLERANCE_BELOW)
      return { text: `SpO₂ di bawah target menit ini (${o.target.min}–${o.target.max}%): pastikan ventilasi efektif lalu naikkan FiO₂.`, actions: ['fio2', 'ppv-adjust'] };
    if (o.spo2Display !== null && o.spo2Display > OXYGEN.SPO2_HYPEROXIA_ABOVE && o.fio2 > OXYGEN.SIB_FIO2_ROOM_AIR)
      return { text: 'SpO₂ tinggi: turunkan FiO₂ bertahap.', actions: ['fio2'] };
  }
  if (s.vent.mode === 'ppv' && s.hr >= HEART_RATE.PPV_BELOW_BPM && (o.breathing === 'teratur' || o.breathing === 'menangis'))
    return { text: 'HR ≥100 dan napas spontan: kurangi/hentikan VTP; pertimbangkan CPAP bila ada distres.', actions: ['ppv-stop', 'cpap-start'] };
  if (sc.hidden.rds && s.vent.mode === 'none' && s.hr >= HEART_RATE.PPV_BELOW_BPM && o.breathing !== 'apnea')
    return { text: 'Prematur bernapas spontan dengan distres/SpO₂ rendah: mulai CPAP.', actions: ['cpap-start'] };

  if (s.stabilizedAt !== null) {
    if (!s.tempProbe) return { text: 'Ukur suhu.', actions: ['temp-probe'] };
    if (!did(s, 'post-monitor')) return { text: 'Mulai monitoring pascaresusitasi.', actions: ['post-monitor'] };
    if (!did(s, 'glucose-check')) return { text: 'Periksa glukosa darah.', actions: ['glucose-check'] };
    if (!did(s, 'inform-family')) return { text: 'Informasikan keluarga.', actions: ['inform-family'] };
    if (!did(s, 'refer')) return { text: 'Tentukan tempat perawatan / rujukan dan stabilisasi transport.', actions: ['refer'] };
    return { text: 'Bayi stabil — serah terima dan akhiri skenario.', actions: ['end'] };
  }
  return { text: 'Nilai ulang HR, napas, dan SpO₂; pertahankan ventilasi efektif.', actions: ['auscultate', 'check-chest'] };
}
