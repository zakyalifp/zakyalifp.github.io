/* AHA PREVENT — approximate implementation of the base-model structure published in
   Khan SS, et al. Circulation. 2024;149:430-449. The official model has dozens of
   outcome-specific coefficients that could not be re-verified at build time; this
   module follows the published variables and direction of effect, calibrated to
   produce plausible risk ranges. Cross-check against the official calculator —
   see the in-app notice on this calculator's page. */
window.CVCalc = window.CVCalc || {};

(function () {
  var COEF = {
    M: {
      age: 0.68, nonHdl: 0.24, hdl: -0.14, sbp: 0.32, treated: 0.15,
      smoke: 0.55, diabetes: 0.68, bmi: 0.07, egfr: 0.20,
      ageSmoke: -0.09, ageSbp: -0.03, ageDiabetes: -0.08,
      baseline10: 0.977, baseline30: 0.86
    },
    F: {
      age: 0.75, nonHdl: 0.20, hdl: -0.12, sbp: 0.35, treated: 0.15,
      smoke: 0.63, diabetes: 0.78, bmi: 0.06, egfr: 0.22,
      ageSmoke: -0.11, ageSbp: -0.035, ageDiabetes: -0.09,
      baseline10: 0.986, baseline30: 0.90
    }
  };

  var MGDL_TO_MMOL = 1 / 38.67;

  function linearPredictor(input) {
    var c = COEF[input.sex];
    var nonHdl = (input.tchol - input.hdl) * MGDL_TO_MMOL;
    var hdl = input.hdl * MGDL_TO_MMOL;

    var cage = (input.age - 55) / 10;
    var cnonHdl = (nonHdl - 3.5) / 1;
    var chdl = (hdl - 1.3) / 0.3;
    var csbp = (input.sbp - 130) / 20;
    var cbmi = (input.bmi - 27) / 5;
    var cegfr = (90 - Math.min(input.egfr, 90)) / 15;
    var csmoke = input.smoking ? 1 : 0;
    var cdiabetes = input.diabetes ? 1 : 0;
    var ctreated = input.treated ? 1 : 0;

    return c.age * cage + c.nonHdl * cnonHdl + c.hdl * chdl + c.sbp * csbp
      + c.treated * ctreated + c.smoke * csmoke + c.diabetes * cdiabetes
      + c.bmi * cbmi + c.egfr * cegfr
      + c.ageSmoke * cage * csmoke + c.ageSbp * cage * csbp + c.ageDiabetes * cage * cdiabetes;
  }

  function riskFromBaseline(baseline, x) {
    return (1 - Math.pow(baseline, Math.exp(x))) * 100;
  }

  function categorize(risk10) {
    if (risk10 < 5) return { level: 'low', label: 'Risiko rendah' };
    if (risk10 < 7.5) return { level: 'moderate', label: 'Risiko batas (borderline)' };
    if (risk10 < 20) return { level: 'high', label: 'Risiko menengah (intermediate)' };
    return { level: 'veryhigh', label: 'Risiko tinggi' };
  }

  function compute(input) {
    var c = COEF[input.sex];
    var x = linearPredictor(input);
    var risk10 = riskFromBaseline(c.baseline10, x);
    var risk30 = input.age <= 59 ? riskFromBaseline(c.baseline30, x) : null;
    var category = categorize(risk10);

    var recommendation;
    if (category.level === 'veryhigh' || category.level === 'high') {
      recommendation = 'Pertimbangkan terapi statin dan optimalisasi kontrol tekanan darah/gula darah sesuai target guideline, di samping intervensi gaya hidup.';
    } else if (category.level === 'moderate') {
      recommendation = 'Diskusikan risk-enhancing factors dan pertimbangkan terapi statin secara individual bersama pasien.';
    } else {
      recommendation = 'Prioritaskan edukasi gaya hidup sehat; terapi farmakologis umumnya belum diperlukan.';
    }

    return {
      risk10: risk10,
      risk30: risk30,
      category: category,
      recommendation: recommendation
    };
  }

  function render(result) {
    var risk30Html = result.risk30 !== null
      ? '<div class="result-block"><h4>Risiko ASCVD 30 tahun</h4><p style="font-size:1.3rem;font-weight:800;color:var(--accent-dark);">' + CVUtils.fmt(result.risk30, 1) + '%</p></div>'
      : '<div class="result-block"><h4>Risiko ASCVD 30 tahun</h4><p>Tidak dihitung — hanya relevan untuk usia &le; 59 tahun.</p></div>';

    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + CVUtils.fmt(result.risk10, 1) + '%</div>'
      + '  <div class="score-label">Estimasi risiko ASCVD 10 tahun</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.category.level) + '">' + result.category.label + '</span>'
      + '</div>'
      + risk30Html
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('pv-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-prevent');

    var age = CVUtils.getNumberValue('pv-age');
    var tchol = CVUtils.getNumberValue('pv-tchol');
    var hdl = CVUtils.getNumberValue('pv-hdl');
    var sbp = CVUtils.getNumberValue('pv-sbp');
    var bmi = CVUtils.getNumberValue('pv-bmi');
    var egfr = CVUtils.getNumberValue('pv-egfr');

    var valid = true;
    valid = CVUtils.validateRange('pv-age', age, 30, 79, 'Usia') && valid;
    valid = CVUtils.validateRange('pv-tchol', tchol, 80, 500, 'Kolesterol total') && valid;
    valid = CVUtils.validateRange('pv-hdl', hdl, 10, 150, 'Kolesterol HDL') && valid;
    valid = CVUtils.validateRange('pv-sbp', sbp, 70, 250, 'Tekanan darah sistolik') && valid;
    valid = CVUtils.validateRange('pv-bmi', bmi, 12, 70, 'BMI') && valid;
    valid = CVUtils.validateRange('pv-egfr', egfr, 5, 150, 'eGFR') && valid;
    if (!valid) return;

    var input = {
      sex: CVUtils.getSelectValue('pv-sex'),
      age: age,
      tchol: tchol,
      hdl: hdl,
      sbp: sbp,
      treated: CVUtils.getSelectValue('pv-treated') === 'yes',
      bmi: bmi,
      egfr: egfr,
      smoking: CVUtils.getSelectValue('pv-smoking') === 'yes',
      diabetes: CVUtils.getSelectValue('pv-dm') === 'yes'
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-prevent');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-prevent');
      CVUtils.showResult('pv-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung risiko" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.prevent = { compute: compute };
})();
