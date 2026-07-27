/* Framingham Risk Score for CHD — Wilson PW, et al. Circulation. 1998;97:1837-1847,
   as adapted in the NCEP ATP III point tables. */
window.CVCalc = window.CVCalc || {};

(function () {
  function ageBandIndex(age) {
    if (age < 40) return 0;
    if (age < 50) return 1;
    if (age < 60) return 2;
    if (age < 70) return 3;
    return 4;
  }

  var AGE_POINTS = {
    M: [-9, -4, 0, 3, 6, 8, 10, 11, 12, 13], // 20-34,35-39,40-44,45-49,50-54,55-59,60-64,65-69,70-74,75-79
    F: [-7, -3, 0, 3, 6, 8, 10, 12, 14, 16]
  };

  function agePoints(sex, age) {
    var table = AGE_POINTS[sex];
    var idx;
    if (age < 35) idx = 0;
    else if (age < 40) idx = 1;
    else if (age < 45) idx = 2;
    else if (age < 50) idx = 3;
    else if (age < 55) idx = 4;
    else if (age < 60) idx = 5;
    else if (age < 65) idx = 6;
    else if (age < 70) idx = 7;
    else if (age < 75) idx = 8;
    else idx = 9;
    return table[idx];
  }

  var TCHOL_POINTS = {
    M: [
      [0, 4, 7, 9, 11],   // age 20-39
      [0, 3, 5, 6, 8],    // 40-49
      [0, 2, 3, 4, 5],    // 50-59
      [0, 1, 1, 2, 3],    // 60-69
      [0, 0, 0, 1, 1]     // 70-79
    ],
    F: [
      [0, 4, 8, 11, 13],
      [0, 3, 6, 8, 10],
      [0, 2, 4, 5, 7],
      [0, 1, 2, 3, 4],
      [0, 1, 1, 2, 2]
    ]
  };

  function tcholBand(tc) {
    if (tc < 160) return 0;
    if (tc < 200) return 1;
    if (tc < 240) return 2;
    if (tc < 280) return 3;
    return 4;
  }

  var SMOKING_POINTS = {
    M: [8, 5, 3, 1, 1],
    F: [9, 7, 4, 2, 1]
  };

  function hdlPoints(hdl) {
    if (hdl >= 60) return -1;
    if (hdl >= 50) return 0;
    if (hdl >= 40) return 1;
    return 2;
  }

  var SBP_POINTS = {
    M: {
      untreated: [0, 0, 1, 1, 2],
      treated: [0, 1, 2, 2, 3]
    },
    F: {
      untreated: [0, 1, 2, 3, 4],
      treated: [0, 3, 4, 5, 6]
    }
  };

  function sbpBand(sbp) {
    if (sbp < 120) return 0;
    if (sbp < 130) return 1;
    if (sbp < 140) return 2;
    if (sbp < 160) return 3;
    return 4;
  }

  // 10-year CHD risk (%) by total points, per NCEP ATP III tables.
  var RISK_TABLE = {
    M: { '-1': 1, 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 8, 12: 10, 13: 12, 14: 16, 15: 20, 16: 25 },
    F: { 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2, 15: 3, 16: 4, 17: 5, 18: 6, 19: 8, 20: 11, 21: 14, 22: 17, 23: 22, 24: 27 }
  };

  function riskFromPoints(sex, points) {
    if (sex === 'M') {
      if (points <= -1) return '<1';
      if (points >= 17) return '≥30';
      return String(RISK_TABLE.M[points]);
    }
    if (points <= 8) return '<1';
    if (points >= 25) return '≥30';
    return String(RISK_TABLE.F[points]);
  }

  function compute(input) {
    var sex = input.sex;
    var ageIdx = ageBandIndex(input.age);
    var tBand = tcholBand(input.tchol);

    var ptAge = agePoints(sex, input.age);
    var ptTchol = TCHOL_POINTS[sex][ageIdx][tBand];
    var ptSmoke = input.smoking ? SMOKING_POINTS[sex][ageIdx] : 0;
    var ptHdl = hdlPoints(input.hdl);
    var sBand = sbpBand(input.sbp);
    var ptSbp = SBP_POINTS[sex][input.treated ? 'treated' : 'untreated'][sBand];

    var total = ptAge + ptTchol + ptSmoke + ptHdl + ptSbp;
    var riskLabel = riskFromPoints(sex, total);
    var riskNum = parseFloat(riskLabel.replace(/[<≥]/g, ''));

    var category;
    if (riskNum < 10) category = { level: 'low', label: 'Risiko rendah' };
    else if (riskNum < 20) category = { level: 'moderate', label: 'Risiko sedang' };
    else category = { level: 'high', label: 'Risiko tinggi' };

    var recommendation = category.level === 'high'
      ? 'Risiko tinggi (≥20% dalam 10 tahun). Pertimbangkan terapi farmakologis intensif (statin) dan modifikasi gaya hidup agresif sesuai guideline.'
      : (category.level === 'moderate'
        ? 'Risiko sedang (10–20%). Pertimbangkan terapi statin secara individual bersama modifikasi gaya hidup.'
        : 'Risiko rendah (<10%). Fokus pada modifikasi gaya hidup sehat.');

    return {
      total: total,
      riskLabel: riskLabel,
      category: category,
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + result.riskLabel + '%</div>'
      + '  <div class="score-label">Estimasi risiko PJK 10 tahun (total poin: ' + result.total + ')</div>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.category.level) + '">' + result.category.label + '</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('fr-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-framingham');

    var age = CVUtils.getNumberValue('fr-age');
    var tchol = CVUtils.getNumberValue('fr-tchol');
    var hdl = CVUtils.getNumberValue('fr-hdl');
    var sbp = CVUtils.getNumberValue('fr-sbp');

    var valid = true;
    valid = CVUtils.validateRange('fr-age', age, 20, 79, 'Usia') && valid;
    valid = CVUtils.validateRange('fr-tchol', tchol, 80, 500, 'Kolesterol total') && valid;
    valid = CVUtils.validateRange('fr-hdl', hdl, 10, 150, 'Kolesterol HDL') && valid;
    valid = CVUtils.validateRange('fr-sbp', sbp, 70, 250, 'Tekanan darah sistolik') && valid;
    if (!valid) return;

    var input = {
      sex: CVUtils.getSelectValue('fr-sex'),
      age: age,
      tchol: tchol,
      hdl: hdl,
      sbp: sbp,
      treated: CVUtils.getSelectValue('fr-treated') === 'yes',
      smoking: CVUtils.getSelectValue('fr-smoking') === 'yes'
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-framingham');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-framingham');
      CVUtils.showResult('fr-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung risiko" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.framingham = { compute: compute };
})();
