/* CHA2DS2-VASc — AHA/ACC/ACCP/HRS 2023 (with sex category point). */
window.CVCalc = window.CVCalc || {};

(function () {
  // Adjusted annual stroke rate (%) per total score, per Friberg L, et al. Eur Heart J. 2012.
  var ANNUAL_STROKE_RATE = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];

  function compute(input) {
    var ageScore = input.age >= 75 ? 2 : (input.age >= 65 ? 1 : 0);
    var c = input.chf ? 1 : 0;
    var h = input.htn ? 1 : 0;
    var d = input.dm ? 1 : 0;
    var s = input.stroke ? 2 : 0;
    var v = input.vasc ? 1 : 0;
    var sexScore = input.sex === 'F' ? 1 : 0;
    var nonSexScore = ageScore + c + h + d + s + v;
    var total = nonSexScore + sexScore;

    var riskLevel, recommendation, recClass;
    if (nonSexScore === 0) {
      riskLevel = 'low';
      recClass = 'Class III (tidak bermanfaat)';
      recommendation = 'Risiko stroke rendah. Antikoagulasi rutin tidak direkomendasikan.';
    } else if (nonSexScore === 1) {
      riskLevel = 'moderate';
      recClass = 'Class IIa';
      recommendation = 'Risiko stroke sedang. Pertimbangkan antikoagulasi oral secara individual, dengan mempertimbangkan preferensi pasien dan risiko perdarahan.';
    } else {
      riskLevel = 'high';
      recClass = 'Class I';
      recommendation = 'Risiko stroke tinggi. Antikoagulasi oral (DOAC lebih diutamakan dibanding warfarin pada AF non-valvular) direkomendasikan.';
    }

    var annualRisk = ANNUAL_STROKE_RATE[Math.min(total, 9)];

    return {
      total: total,
      ageScore: ageScore,
      sexScore: sexScore,
      nonSexScore: nonSexScore,
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
      + '  <div class="score-label">dari maksimal 9 poin</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.riskLevel) + '">Estimasi risiko stroke/tahun: ' + CVUtils.fmt(result.annualRisk, 1) + '%</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Rincian skor</h4>'
      + '  <div class="result-breakdown">'
      + '    <div><span>Skor usia</span><span>' + result.ageScore + '</span></div>'
      + '    <div><span>Skor faktor risiko lain</span><span>' + (result.nonSexScore - result.ageScore) + '</span></div>'
      + '    <div><span>Skor jenis kelamin (sex category)</span><span>' + result.sexScore + '</span></div>'
      + '  </div>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana (' + result.recClass + ')</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('cvasc-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-chadsvasc');

    var age = CVUtils.getNumberValue('cvasc-age');
    var ageValid = CVUtils.validateRange('cvasc-age', age, 18, 120, 'Usia');

    if (!ageValid) return;

    var input = {
      sex: CVUtils.getSelectValue('cvasc-sex'),
      age: age,
      chf: CVUtils.getChecked('cvasc-chf'),
      htn: CVUtils.getChecked('cvasc-htn'),
      dm: CVUtils.getChecked('cvasc-dm'),
      stroke: CVUtils.getChecked('cvasc-stroke'),
      vasc: CVUtils.getChecked('cvasc-vasc')
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-chadsvasc');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-chadsvasc');
      CVUtils.showResult('cvasc-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Exposed for unit testing (Node) and reuse.
  window.CVCalc.chadsvasc = { compute: compute };
})();
