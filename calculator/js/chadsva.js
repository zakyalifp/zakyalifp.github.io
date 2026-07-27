/* CHA2DS2-VA — ESC 2024 (sex category removed). */
window.CVCalc = window.CVCalc || {};

(function () {
  var ANNUAL_STROKE_RATE = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7];

  function compute(input) {
    var ageScore = input.age >= 75 ? 2 : (input.age >= 65 ? 1 : 0);
    var c = input.chf ? 1 : 0;
    var h = input.htn ? 1 : 0;
    var d = input.dm ? 1 : 0;
    var s = input.stroke ? 2 : 0;
    var v = input.vasc ? 1 : 0;
    var total = ageScore + c + h + d + s + v;

    var riskLevel, recommendation, recClass;
    if (total === 0) {
      riskLevel = 'low';
      recClass = 'tidak direkomendasikan';
      recommendation = 'Risiko stroke rendah. Antikoagulasi oral tidak direkomendasikan.';
    } else if (total === 1) {
      riskLevel = 'moderate';
      recClass = 'dapat dipertimbangkan';
      recommendation = 'Risiko stroke sedang. Antikoagulasi oral dapat dipertimbangkan secara individual, dengan mempertimbangkan preferensi pasien dan risiko perdarahan.';
    } else {
      riskLevel = 'high';
      recClass = 'direkomendasikan';
      recommendation = 'Risiko stroke tinggi. Antikoagulasi oral (DOAC lebih diutamakan dibanding warfarin pada AF non-valvular) direkomendasikan.';
    }

    var annualRisk = ANNUAL_STROKE_RATE[Math.min(total, 8)];

    return {
      total: total,
      ageScore: ageScore,
      annualRisk: annualRisk,
      riskLevel: riskLevel,
      recClass: recClass,
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + result.total + '</div>'
      + '  <div class="score-label">dari maksimal 8 poin</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.riskLevel) + '">Estimasi risiko stroke/tahun: ' + CVUtils.fmt(result.annualRisk, 1) + '%</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Rincian skor</h4>'
      + '  <div class="result-breakdown">'
      + '    <div><span>Skor usia</span><span>' + result.ageScore + '</span></div>'
      + '    <div><span>Skor faktor risiko lain</span><span>' + (result.total - result.ageScore) + '</span></div>'
      + '  </div>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana (OAC ' + result.recClass + ')</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('cva-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-chadsva');

    var age = CVUtils.getNumberValue('cva-age');
    var ageValid = CVUtils.validateRange('cva-age', age, 18, 120, 'Usia');
    if (!ageValid) return;

    var input = {
      age: age,
      chf: CVUtils.getChecked('cva-chf'),
      htn: CVUtils.getChecked('cva-htn'),
      dm: CVUtils.getChecked('cva-dm'),
      stroke: CVUtils.getChecked('cva-stroke'),
      vasc: CVUtils.getChecked('cva-vasc')
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-chadsva');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-chadsva');
      CVUtils.showResult('cva-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.chadsva = { compute: compute };
})();
