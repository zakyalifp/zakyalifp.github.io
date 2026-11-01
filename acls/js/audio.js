/* ==========================================================================
   ACLS Simulator — suara monitor (Web Audio API, tanpa file audio)
   ========================================================================== */
(function () {
  'use strict';
  var ACLS = window.ACLS = window.ACLS || {};

  var Audio = {
    ctx: null,
    on: { beep: true, metro: true, alarm: false },

    init: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
    },

    tone: function (freq, dur, vol, type) {
      var ctx = this.ctx;
      if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },

    // Nada beep QRS: makin rendah SpO2, makin rendah nadanya (seperti monitor sungguhan)
    beep: function (spo2) {
      if (!this.on.beep) return;
      var f = spo2 ? 520 + (Math.max(70, Math.min(100, spo2)) - 70) * 13 : 700;
      this.tone(f, 0.08, 0.12, 'sine');
    },

    click: function () {
      if (!this.on.metro) return;
      this.tone(1650, 0.025, 0.09, 'square');
    },

    alarm: function () {
      if (!this.on.alarm) return;
      var self = this;
      this.tone(988, 0.16, 0.08, 'triangle');
      setTimeout(function () { self.tone(784, 0.16, 0.08, 'triangle'); }, 190);
    },

    shock: function () {
      if (!this.on.beep && !this.on.alarm) return;
      this.tone(160, 0.25, 0.15, 'sawtooth');
    }
  };

  ACLS.Audio = Audio;
})();
