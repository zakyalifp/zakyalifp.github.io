/* HAS-BLED bleeding risk score. Pisters R, et al. Chest. 2010. */
window.CVCalc = window.CVCalc || {};

(function () {
  // Approximate major-bleeding rate per 100 patient-years, per original HAS-BLED derivation cohort.
  var BLEED_RATE = { 0: 1.13, 1: 1.02, 2: 1.88, 3: 3.74, 4: 8.70, 5: 12.5 };

  function compute(input) {
    var elderly = input.age > 65 ? 1 : 0;
    var htn = input.htn ? 1 : 0;
    var renal = input.renal ? 1 : 0;
    var hepatic = input.hepatic ? 1 : 0;
    var stroke = input.stroke ? 1 : 0;
    var bleeding = input.bleeding ? 1 : 0;
    var inr = (input.warfarin === 'yes' && input.inr) ? 1 : 0;
    var drugs = input.drugs ? 1 : 0;
    var alcohol = input.alcohol ? 1 : 0;

    var total = elderly + htn + renal + hepatic + stroke + bleeding + inr + drugs + alcohol;

    var riskLevel = total >= 3 ? 'high' : 'low';
    var bleedRate = BLEED_RATE[Math.min(total, 5)];

    var recommendation = total >= 3
      ? 'Risiko perdarahan tinggi. Bukan kontraindikasi antikoagulasi, namun perlu kehati-hatian ekstra: koreksi faktor risiko yang dapat dimodifikasi (kontrol tekanan darah, hindari NSAID/antiplatelet ganda bila memungkinkan, batasi alkohol, jaga TTR bila memakai warfarin), dan lakukan pemantauan lebih ketat serta kontrol lebih sering.'
      : 'Risiko perdarahan rendah. Tetap lakukan pemantauan berkala sesuai standar pada pasien dengan terapi antikoagulasi.';

    return {
      total: total,
      riskLevel: riskLevel,
      bleedRate: bleedRate,
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + result.total + '</div>'
      + '  <div class="score-label">dari maksimal 9 poin</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.riskLevel) + '">Estimasi perdarahan mayor: ~' + CVUtils.fmt(result.bleedRate, 2) + ' / 100 pasien-tahun</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '  <p><strong>Skor &ge; 3</strong> = risiko perdarahan tinggi. <strong>Skor &lt; 3</strong> = risiko perdarahan rendah.</p>'
      + '</div>';
    CVUtils.showResult('hb-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-hasbled');

    var age = CVUtils.getNumberValue('hb-age');
    var ageValid = CVUtils.validateRange('hb-age', age, 18, 120, 'Usia');
    if (!ageValid) return;

    var input = {
      age: age,
      warfarin: CVUtils.getSelectValue('hb-warfarin'),
      htn: CVUtils.getChecked('hb-htn'),
      renal: CVUtils.getChecked('hb-renal'),
      hepatic: CVUtils.getChecked('hb-hepatic'),
      stroke: CVUtils.getChecked('hb-stroke'),
      bleeding: CVUtils.getChecked('hb-bleeding'),
      inr: CVUtils.getChecked('hb-inr'),
      drugs: CVUtils.getChecked('hb-drugs'),
      alcohol: CVUtils.getChecked('hb-alcohol')
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-hasbled');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-hasbled');
      CVUtils.showResult('hb-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.hasbled = { compute: compute };
})();
