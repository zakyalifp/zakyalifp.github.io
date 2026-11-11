/*
 * Penghitung kunjungan situs (GoatCounter) — anonim: tanpa cookie, tanpa data pribadi.
 * GoatCounter hanya mencatat halaman yang dibuka, perujuk, negara, dan jenis perangkat.
 *
 * Dipakai di semua halaman zakyalifp.github.io:
 *  - halaman utama (index, research, cv, contact) memuatnya langsung;
 *  - simulator lama (ACLS, ATLS, kalkulator, resusitasi neonatus) disisipkan otomatis saat
 *    deploy oleh .github/scripts/inject-counter.sh;
 *  - Simulator EKG punya versi bawaan sendiri (src/lib/visits.ts) dengan kode yang sama.
 *
 * Elemen dengan atribut data-visit-count akan diisi jumlah kunjungan seluruh situs.
 * Bungkus elemen dengan atribut data-visit-wrap (dan hidden) agar baru tampil bila angka ada.
 *
 * Ganti CODE bila kode situs GoatCounter Anda berbeda (lihat docs/GOATCOUNTER.md).
 */
(function () {
  'use strict';
  var CODE = 'zakyalifp';
  var BASE = 'https://' + CODE + '.goatcounter.com';
  var h = location.hostname;
  var local =
    !h ||
    location.protocol === 'file:' ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    /^(10|192\.168)\./.test(h) ||
    navigator.webdriver === true;

  if (!local && !window.__zapCounterLoaded) {
    window.__zapCounterLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', BASE + '/count');
    document.head.appendChild(s);
  }

  function fill() {
    var els = document.querySelectorAll('[data-visit-count]');
    if (!els.length || local || !window.fetch) return;
    fetch(BASE + '/counter/TOTAL.json')
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        // Sembunyikan bila belum ada kunjungan (0) atau data tidak tersedia.
        if (!d || !d.count || !/[1-9]/.test(String(d.count))) return;
        // GoatCounter memakai koma sebagai pemisah ribuan. data-visit-count="en" → tetap
        // koma (halaman berbahasa Inggris); selain itu format Indonesia (titik).
        var raw = String(d.count).replace(/[^0-9]+/g, ',');
        for (var i = 0; i < els.length; i++) {
          els[i].textContent = els[i].getAttribute('data-visit-count') === 'en' ? raw : raw.replace(/,/g, '.');
          var w = els[i].closest ? els[i].closest('[data-visit-wrap]') : null;
          if (w) w.removeAttribute('hidden');
        }
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();

