/* SCORE2 / SCORE2-OP — ESC 2021 CVD risk prediction algorithms.
   SCORE2 (age 40-69) coefficients per SCORE2 working group, Eur Heart J. 2021;42:2439-2454.
   SCORE2-OP (age >=70) is extrapolated from the SCORE2 formula shape (see in-app disclaimer):
   official SCORE2-OP has its own distinct coefficient set that could not be verified
   at build time, so results for age >=70 should be cross-checked against the official tool. */
window.CVCalc = window.CVCalc || {};

(function () {
  var COEF = {
    M: { age: 0.3742, smoke: 0.6012, sbp: 0.2777, tchol: 0.1458, hdl: -0.2698,
         ageSmoke: -0.0755, ageSbp: -0.0255, ageTchol: -0.0281, ageHdl: 0.0426,
         baseline: 0.9605 },
    F: { age: 0.4648, smoke: 0.7744, sbp: 0.3131, tchol: 0.1002, hdl: -0.2606,
         ageSmoke: -0.1088, ageSbp: -0.0277, ageTchol: -0.0226, ageHdl: 0.0613,
         baseline: 0.9776 }
  };

  var REGION_SCALE = {
    low: { M: [-0.5699, 0.7476], F: [-0.7380, 0.7019] },
    moderate: { M: [-0.1565, 0.8009], F: [-0.3143, 0.7701] },
    high: { M: [0.3207, 0.9360], F: [0.5710, 0.9369] },
    veryhigh: { M: [0.5836, 0.8294], F: [0.9412, 0.8329] }
  };

  var MGDL_TO_MMOL = 1 / 38.67;

  function computeRisk(sex, age, smoking, sbp, tcholMgdl, hdlMgdl, region, diabetes) {
    var tchol = tcholMgdl * MGDL_TO_MMOL;
    var hdl = hdlMgdl * MGDL_TO_MMOL;
    var c = COEF[sex];

    var cage = (age - 60) / 5;
    var csmoke = smoking ? 1 : 0;
    var csbp = (sbp - 120) / 20;
    var ctchol = (tchol - 6) / 1;
    var chdl = (hdl - 1.3) / 0.5;

    var x = c.age * cage + c.smoke * csmoke + c.sbp * csbp + c.tchol * ctchol + c.hdl * chdl
      + c.ageSmoke * cage * csmoke + c.ageSbp * cage * csbp + c.ageTchol * cage * ctchol + c.ageHdl * cage * chdl;

    // SCORE2-OP extrapolation: add an approximate diabetes hazard contribution (age >= 70 only).
    if (age >= 70 && diabetes) {
      x += 0.65;
    }

    var rawRisk = 1 - Math.pow(c.baseline, Math.exp(x));
    var lp = Math.log(-Math.log(1 - rawRisk));
    var scale = REGION_SCALE[region][sex];
    var calLp = scale[0] + scale[1] * lp;
    var risk = 1 - Math.exp(-Math.exp(calLp));

    return risk * 100;
  }

  function categorize(age, riskPct) {
    var lowModCutoff, highCutoff;
    if (age < 50) {
      lowModCutoff = 2.5; highCutoff = 7.5;
    } else if (age < 70) {
      lowModCutoff = 5; highCutoff = 10;
    } else {
      lowModCutoff = 7.5; highCutoff = 15;
    }

    if (riskPct < lowModCutoff) return { level: 'low', label: 'Risiko rendah–sedang' };
    if (riskPct < highCutoff) return { level: 'high', label: 'Risiko tinggi' };
    return { level: 'veryhigh', label: 'Risiko sangat tinggi' };
  }

  function compute(input) {
    var model = input.age >= 70 ? 'SCORE2-OP' : 'SCORE2';
    var riskPct = computeRisk(input.sex, input.age, input.smoking, input.sbp, input.tchol, input.hdl, input.region, input.diabetes);
    var category = categorize(input.age, riskPct);

    var recommendation;
    if (category.level === 'veryhigh') {
      recommendation = 'Risiko sangat tinggi. Intervensi gaya hidup intensif dan pertimbangkan terapi farmakologis (statin ± antihipertensi) sesuai target LDL dan tekanan darah pada guideline ESC.';
    } else if (category.level === 'high') {
      recommendation = 'Risiko tinggi. Pertimbangkan terapi farmakologis di samping modifikasi gaya hidup, sesuai penilaian faktor risiko tambahan (risk-enhancers).';
    } else {
      recommendation = 'Risiko rendah–sedang. Prioritaskan edukasi gaya hidup sehat; terapi farmakologis umumnya belum diperlukan kecuali terdapat faktor pemberat lain.';
    }

    return {
      model: model,
      riskPct: riskPct,
      category: category,
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + CVUtils.fmt(result.riskPct, 1) + '%</div>'
      + '  <div class="score-label">Estimasi risiko ASCVD 10 tahun (' + result.model + ')</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.category.level) + '">' + result.category.label + '</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('s2-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-score2');

    var age = CVUtils.getNumberValue('s2-age');
    var sbp = CVUtils.getNumberValue('s2-sbp');
    var tchol = CVUtils.getNumberValue('s2-tchol');
    var hdl = CVUtils.getNumberValue('s2-hdl');

    var valid = true;
    valid = CVUtils.validateRange('s2-age', age, 40, 89, 'Usia') && valid;
    valid = CVUtils.validateRange('s2-sbp', sbp, 70, 250, 'Tekanan darah sistolik') && valid;
    valid = CVUtils.validateRange('s2-tchol', tchol, 80, 500, 'Kolesterol total') && valid;
    valid = CVUtils.validateRange('s2-hdl', hdl, 10, 150, 'Kolesterol HDL') && valid;
    if (!valid) return;

    var input = {
      sex: CVUtils.getSelectValue('s2-sex'),
      age: age,
      smoking: CVUtils.getSelectValue('s2-smoking') === 'yes',
      region: CVUtils.getSelectValue('s2-region'),
      sbp: sbp,
      tchol: tchol,
      hdl: hdl,
      diabetes: CVUtils.getSelectValue('s2-dm') === 'yes'
    };

    document.getElementById('score2-op-warning').style.display = age >= 70 ? '' : 'none';
    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-score2');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-score2');
      document.getElementById('score2-op-warning').style.display = 'none';
      CVUtils.showResult('s2-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung risiko" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.score2 = { compute: compute };
})();
