/* TIMI Risk Score — two variants: UA/NSTEMI (Antman EM, et al. JAMA. 2000) and
   STEMI (Morrow DA, et al. Circulation. 2000). */
window.CVCalc = window.CVCalc || {};

(function () {
  var UANSTEMI_RISK = { 0: 4.7, 1: 4.7, 2: 8.3, 3: 13.2, 4: 19.9, 5: 26.2, 6: 40.9, 7: 40.9 };
  var STEMI_MORTALITY = { 0: 0.8, 1: 1.6, 2: 2.2, 3: 4.4, 4: 7.3, 5: 12.4, 6: 16.1, 7: 23.4, 8: 26.8 };

  function computeUANSTEMI(input) {
    var total = 0;
    ['age', 'riskFactors', 'knownCad', 'aspirin', 'angina', 'stDeviation', 'marker'].forEach(function (k) {
      if (input[k]) total += 1;
    });

    var riskLevel = total <= 2 ? 'low' : (total <= 4 ? 'moderate' : 'high');
    var eventRisk = UANSTEMI_RISK[Math.min(total, 7)];

    var recommendation = total >= 3
      ? 'Risiko sedang–tinggi. Pertimbangkan strategi invasif dini (kateterisasi jantung dalam 24–48 jam) sesuai penilaian klinis.'
      : 'Risiko rendah. Strategi konservatif dengan terapi medis optimal dapat dipertimbangkan, evaluasi ulang sesuai perjalanan klinis.';

    return {
      variant: 'uanstemi',
      total: total,
      max: 7,
      riskLevel: riskLevel,
      eventRisk: eventRisk,
      eventLabel: 'Risiko kematian/infark miokard/revaskularisasi urgensi dalam 14 hari',
      recommendation: recommendation
    };
  }

  function computeSTEMI(input) {
    var agePts = input.age >= 75 ? 3 : (input.age >= 65 ? 2 : 0);
    var historyPts = input.history ? 1 : 0;
    var sbpPts = input.sbp < 100 ? 3 : 0;
    var hrPts = input.hr > 100 ? 2 : 0;
    var killipPts = input.killip >= 2 ? 2 : 0;
    var weightPts = input.weight < 67 ? 1 : 0;
    var anteriorPts = input.anterior ? 1 : 0;
    var timePts = input.delayedTreatment ? 1 : 0;

    var total = agePts + historyPts + sbpPts + hrPts + killipPts + weightPts + anteriorPts + timePts;
    var cappedTotal = Math.min(total, 8);

    var riskLevel = total <= 2 ? 'low' : (total <= 4 ? 'moderate' : 'high');
    var mortality = total > 8 ? 35.9 : STEMI_MORTALITY[cappedTotal];

    var recommendation = total >= 5
      ? 'Risiko mortalitas tinggi. Reperfusi segera (PCI primer diutamakan), pemantauan intensif, dan pertimbangkan terapi tambahan sesuai guideline STEMI.'
      : 'Risiko mortalitas rendah–sedang. Tetap lakukan reperfusi sesegera mungkin sesuai guideline STEMI standar.';

    return {
      variant: 'stemi',
      total: total,
      max: 14,
      riskLevel: riskLevel,
      eventRisk: mortality,
      eventLabel: 'Risiko mortalitas 30 hari',
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + result.total + '</div>'
      + '  <div class="score-label">dari maksimal ' + result.max + ' poin</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.riskLevel) + '">' + result.eventLabel + ': ' + CVUtils.fmt(result.eventRisk, 1) + '%</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('timi-result', html);
  }

  function currentVariant() {
    return CVUtils.getRadioValue('timi-variant') || 'uanstemi';
  }

  function toggleFields() {
    var variant = currentVariant();
    document.getElementById('timi-uanstemi-fields').style.display = variant === 'uanstemi' ? '' : 'none';
    document.getElementById('timi-stemi-fields').style.display = variant === 'stemi' ? '' : 'none';
    CVUtils.showResult('timi-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-timi');
    var variant = currentVariant();

    if (variant === 'uanstemi') {
      var input = {
        age: CVUtils.getChecked('timi-u-age'),
        riskFactors: CVUtils.getChecked('timi-u-riskfactors'),
        knownCad: CVUtils.getChecked('timi-u-knowncad'),
        aspirin: CVUtils.getChecked('timi-u-aspirin'),
        angina: CVUtils.getChecked('timi-u-angina'),
        stDeviation: CVUtils.getChecked('timi-u-stdev'),
        marker: CVUtils.getChecked('timi-u-marker')
      };
      render(computeUANSTEMI(input));
    } else {
      var age = CVUtils.getNumberValue('timi-s-age');
      var sbp = CVUtils.getNumberValue('timi-s-sbp');
      var hr = CVUtils.getNumberValue('timi-s-hr');
      var weight = CVUtils.getNumberValue('timi-s-weight');

      var valid = true;
      valid = CVUtils.validateRange('timi-s-age', age, 18, 120, 'Usia') && valid;
      valid = CVUtils.validateRange('timi-s-sbp', sbp, 40, 300, 'Tekanan darah sistolik') && valid;
      valid = CVUtils.validateRange('timi-s-hr', hr, 20, 300, 'Denyut jantung') && valid;
      valid = CVUtils.validateRange('timi-s-weight', weight, 20, 300, 'Berat badan') && valid;
      if (!valid) return;

      var sInput = {
        age: age,
        sbp: sbp,
        hr: hr,
        weight: weight,
        killip: parseInt(CVUtils.getSelectValue('timi-s-killip'), 10),
        delayedTreatment: CVUtils.getSelectValue('timi-s-time') === 'yes',
        history: CVUtils.getChecked('timi-s-history'),
        anterior: CVUtils.getChecked('timi-s-anterior')
      };
      render(computeSTEMI(sInput));
    }
  }

  function init() {
    var form = document.getElementById('form-timi');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-timi');
      setTimeout(function () {
        CVUtils.showResult('timi-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
      }, 0);
    });

    CVUtils.qsa('input[name="timi-variant"]').forEach(function (radio) {
      radio.addEventListener('change', toggleFields);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.timi = { computeUANSTEMI: computeUANSTEMI, computeSTEMI: computeSTEMI };
})();
