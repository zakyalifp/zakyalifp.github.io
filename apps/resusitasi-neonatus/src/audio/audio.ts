/**
 * Semua suara disintesis dengan Web Audio API (tanpa file rekaman → bebas hak cipta).
 * Modul ini dimuat secara lazy hanya saat simulasi berjalan.
 */
type Voice = 'satu' | 'dua' | 'tiga' | 'napas';

export class SimAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.6;
  private enabled = true;
  private nextCryAt = 0;
  private lastAlarmAt = 0;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on && this.ctx) void this.ctx.suspend();
    if (on) this.ensure();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** "Bip" oksimeter: nada naik-turun mengikuti SpO2 (makin rendah SpO2 makin rendah nadanya). */
  pulseBeep(spo2: number | null) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const f = spo2 === null ? 520 : 300 + Math.max(0, Math.min(100, spo2)) * 5;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Bunyi jantung "lub-dub" untuk stetoskop. */
  heartbeat() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const thump = (start: number, freq: number, gain: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, start);
      o.frequency.exponentialRampToValueAtTime(freq * 0.6, start + 0.08);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
      o.connect(g).connect(this.master!);
      o.start(start);
      o.stop(start + 0.12);
    };
    thump(t, 70, 0.9);
    thump(t + 0.12, 90, 0.6);
  }

  /** Alarm prioritas sedang (dua nada), dibatasi tiap 4 detik. */
  alarm() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.currentTime - this.lastAlarmAt < 4) return;
    this.lastAlarmAt = ctx.currentTime;
    const t = ctx.currentTime;
    [0, 0.22, 0.44].forEach((d, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = i === 1 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.connect(g).connect(this.master!);
      o.start(t + d);
      o.stop(t + d + 0.2);
    });
  }

  /** Metronom kompresi: "satu-dan-dua-dan-tiga-dan-napas" (3 klik + 1 nada napas). */
  metronome(beat: Voice) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (beat === 'napas') {
      o.type = 'sine';
      o.frequency.setValueAtTime(440, t);
      o.frequency.linearRampToValueAtTime(330, t + 0.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.stop(t + 0.36);
    } else {
      o.type = 'square';
      o.frequency.value = beat === 'satu' ? 1200 : 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.stop(t + 0.05);
    }
    o.connect(g).connect(this.master);
    o.start(t);
  }

  /** Tangis bayi sintetis: osilator gigi gergaji + filter formant + vibrato. */
  cry() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.currentTime < this.nextCryAt) return;
    const t = ctx.currentTime;
    const dur = 0.9;
    this.nextCryAt = t + dur + 0.6;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(560, t + 0.25);
    o.frequency.linearRampToValueAtTime(500, t + 0.6);
    o.frequency.linearRampToValueAtTime(360, t + dur);
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 7;
    vibGain.gain.value = 18;
    vib.connect(vibGain).connect(o.frequency);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 1100;
    f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 2800;
    f2.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.setValueAtTime(0.35, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(g);
    o.connect(f2).connect(g);
    g.connect(this.master);
    o.start(t);
    vib.start(t);
    o.stop(t + dur);
    vib.stop(t + dur);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}

let instance: SimAudio | null = null;
export function getAudio(): SimAudio {
  if (!instance) instance = new SimAudio();
  return instance;
}
