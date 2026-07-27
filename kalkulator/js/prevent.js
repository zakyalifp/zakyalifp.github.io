/* AHA PREVENT — base model, 10-year and 30-year ASCVD risk.
   Khan SS, et al. Development and Validation of the American Heart Association's
   PREVENT Equations. Circulation. 2024;149:430-449.

   Coefficients below are the official base-model logistic regression coefficients
   (age, age^2, non-HDL-C, HDL-C, SBP split at 110 mmHg, diabetes, current smoking,
   BMI split at 30 kg/m^2, eGFR split at 60 mL/min/1.73m^2, antihypertensive use,
   statin use, treatment interactions, and age interactions), sex-specific, for the
   10-year and 30-year ASCVD outcome. Extracted from the PooledCohort R package
   (Byron Jaeger, CRAN, MIT license — data-raw/coefs_prevent.xlsx) and verified to
   reproduce, to the reported decimal, the worked examples in Khan et al. 2024
   Supplemental Table S12 (age 50, TC 200 mg/dL, HDL 45 mg/dL, SBP 160 mmHg treated,
   diabetes, BMI 35, eGFR 90 -> 10-yr risk 9.2% women / 10.19% men; 30-yr risk
   35.4% women / 34.9% men). */
window.CVCalc = window.CVCalc || {};

(function () {
  var COEF = {
    10: {
      women: {
        age: 0.719883, age2: 0, nonHdl: 0.1176967, hdl: -0.151185,
        sbpLt110: -0.0835358, sbpGteq110: 0.3592852, diabetes: 0.8348585, smoking: 0.4831078,
        bmiLt30: 0, bmiGt30: 0, egfrLt60: 0.4864619, egfrGteq60: 0.0397779,
        bpMeds: 0.2265309, statin: -0.0592374,
        treatedSbp: -0.0395762, treatedNonHdl: 0.0844423,
        ageXNonHdl: -0.0567839, ageXHdl: 0.0325692, ageXSbp: -0.1035985,
        ageXDiabetes: -0.2417542, ageXSmoking: -0.0791142, ageXBmiGt30: 0, ageXEgfrLt60: -0.1671492,
        const: -3.819975
      },
      men: {
        age: 0.7099847, age2: 0, nonHdl: 0.1658663, hdl: -0.1144285,
        sbpLt110: -0.2837212, sbpGteq110: 0.3239977, diabetes: 0.7189597, smoking: 0.3956973,
        bmiLt30: 0, bmiGt30: 0, egfrLt60: 0.3690075, egfrGteq60: 0.0203619,
        bpMeds: 0.2036522, statin: -0.0865581,
        treatedSbp: -0.0322916, treatedNonHdl: 0.114563,
        ageXNonHdl: -0.0300005, ageXHdl: 0.0232747, ageXSbp: -0.0927024,
        ageXDiabetes: -0.2018525, ageXSmoking: -0.0970527, ageXBmiGt30: 0, ageXEgfrLt60: -0.1217081,
        const: -3.500655
      }
    },
    30: {
      women: {
        age: 0.4669202, age2: -0.0893118, nonHdl: 0.1256901, hdl: -0.1542255,
        sbpLt110: -0.0018093, sbpGteq110: 0.322949, diabetes: 0.6296707, smoking: 0.268292,
        bmiLt30: 0, bmiGt30: 0, egfrLt60: 0.100106, egfrGteq60: 0.0499663,
        bpMeds: 0.1875292, statin: 0.0152476,
        treatedSbp: -0.0276123, treatedNonHdl: 0.0736147,
        ageXNonHdl: -0.0521962, ageXHdl: 0.0316918, ageXSbp: -0.1046101,
        ageXDiabetes: -0.2727793, ageXSmoking: -0.1530907, ageXBmiGt30: 0, ageXEgfrLt60: -0.1299149,
        const: -1.974074
      },
      men: {
        age: 0.3994099, age2: -0.0937484, nonHdl: 0.1744643, hdl: -0.120203,
        sbpLt110: -0.0665117, sbpGteq110: 0.2753037, diabetes: 0.4790257, smoking: 0.1782635,
        bmiLt30: 0, bmiGt30: 0, egfrLt60: -0.0218789, egfrGteq60: 0.0602553,
        bpMeds: 0.1421182, statin: 0.0135996,
        treatedSbp: -0.0218265, treatedNonHdl: 0.1013148,
        ageXNonHdl: -0.0312619, ageXHdl: 0.020673, ageXSbp: -0.0920935,
        ageXDiabetes: -0.2159947, ageXSmoking: -0.1548811, ageXBmiGt30: 0, ageXEgfrLt60: -0.0712547,
        const: -1.736444
      }
    }
  };

  var MGDL_TO_MMOL = 0.02586;

  function riskFor(years, input) {
    var c = COEF[years][input.sex === 'F' ? 'women' : 'men'];

    var age10 = (input.age - 55) / 10;
    var age10sq = age10 * age10;
    var nonHdl = (input.tchol - input.hdl) * MGDL_TO_MMOL - 3.5;
    var hdl = (input.hdl * MGDL_TO_MMOL - 1.3) / 0.3;
    var sbpLt110 = (Math.min(input.sbp, 110) - 110) / 20;
    var sbpGteq110 = (Math.max(input.sbp, 110) - 130) / 20;
    var bmiLt30 = (Math.min(input.bmi, 30) - 25) / 5;
    var bmiGt30 = (Math.max(input.bmi, 30) - 30) / 5;
    var egfrLt60 = (Math.min(input.egfr, 60) - 60) / -15;
    var egfrGteq60 = (Math.max(input.egfr, 60) - 90) / -15;
    var diabetes = input.diabetes ? 1 : 0;
    var smoking = input.smoking ? 1 : 0;
    var bpMeds = input.treated ? 1 : 0;
    var statin = input.statin ? 1 : 0;
    var treatedSbp = sbpGteq110 * bpMeds;
    var treatedNonHdl = nonHdl * statin;

    var indSum = c.const
      + c.age * age10 + c.age2 * age10sq
      + c.nonHdl * nonHdl + c.hdl * hdl
      + c.sbpLt110 * sbpLt110 + c.sbpGteq110 * sbpGteq110
      + c.diabetes * diabetes + c.smoking * smoking
      + c.bmiLt30 * bmiLt30 + c.bmiGt30 * bmiGt30
      + c.egfrLt60 * egfrLt60 + c.egfrGteq60 * egfrGteq60
      + c.bpMeds * bpMeds + c.statin * statin
      + c.treatedSbp * treatedSbp + c.treatedNonHdl * treatedNonHdl
      + c.ageXNonHdl * (age10 * nonHdl) + c.ageXHdl * (age10 * hdl)
      + c.ageXSbp * (age10 * sbpGteq110) + c.ageXDiabetes * (age10 * diabetes)
      + c.ageXSmoking * (age10 * smoking) + c.ageXBmiGt30 * (age10 * bmiGt30)
      + c.ageXEgfrLt60 * (age10 * egfrLt60);

    var e = Math.exp(indSum);
    return (e / (1 + e)) * 100;
  }

  // Risk categories specific to PREVENT-ASCVD (NOT the older Pooled Cohort Equations
  // thresholds of 5/7.5/20%). Per the 2026 ACC/AHA/Multisociety Guideline on the
  // Management of Dyslipidemia: <3% low, 3-<5% borderline, 5-<10% intermediate, >=10% high.
  function categorize(risk10) {
    if (risk10 < 3) return { level: 'low', label: 'Risiko rendah' };
    if (risk10 < 5) return { level: 'moderate', label: 'Risiko batas (borderline)' };
    if (risk10 < 10) return { level: 'high', label: 'Risiko menengah (intermediate)' };
    return { level: 'veryhigh', label: 'Risiko tinggi' };
  }

  function compute(input) {
    var risk10 = riskFor(10, input);
    var risk30 = input.age <= 59 ? riskFor(30, input) : null;
    var category = categorize(risk10);

    var recommendation;
    if (category.level === 'veryhigh') {
      recommendation = 'Risiko tinggi (&ge;10%). Terapi statin (umumnya intensitas sedang–tinggi) direkomendasikan bersama optimalisasi kontrol tekanan darah/gula darah dan intervensi gaya hidup.';
    } else if (category.level === 'high') {
      recommendation = 'Risiko menengah/intermediate (5–&lt;10%). Terapi statin intensitas sedang sebaiknya dipertimbangkan untuk pencegahan primer ASCVD.';
    } else if (category.level === 'moderate') {
      recommendation = 'Risiko batas/borderline (3–&lt;5%). Terapi statin intensitas sedang dapat dipertimbangkan, personalisasi dengan risk-enhancing factors (riwayat keluarga PJK dini, ApoB, Lp(a), skor kalsium koroner/CAC bila tersedia).';
    } else {
      recommendation = 'Risiko rendah (&lt;3%). Prioritaskan edukasi gaya hidup sehat; terapi farmakologis umumnya belum diperlukan.';
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
      statin: CVUtils.getSelectValue('pv-statin') === 'yes',
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
