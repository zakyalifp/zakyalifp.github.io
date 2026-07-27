/* GRACE ACS Risk Score — classic point-based table underlying the GRACE 2.0 online tool.
   Reference: Granger CB, et al. Arch Intern Med. 2003; Fox KA, et al. BMJ. 2006. */
window.CVCalc = window.CVCalc || {};

(function () {
  function agePoints(age) {
    if (age < 40) return 0;
    if (age <= 49) return 18;
    if (age <= 59) return 36;
    if (age <= 69) return 55;
    if (age <= 79) return 73;
    if (age <= 89) return 91;
    return 100;
  }

  function hrPoints(hr) {
    if (hr < 70) return 0;
    if (hr <= 89) return 7;
    if (hr <= 109) return 13;
    if (hr <= 149) return 23;
    if (hr <= 199) return 36;
    return 46;
  }

  function sbpPoints(sbp) {
    if (sbp < 80) return 63;
    if (sbp <= 99) return 58;
    if (sbp <= 119) return 47;
    if (sbp <= 139) return 37;
    if (sbp <= 159) return 26;
    if (sbp <= 199) return 11;
    return 0;
  }

  function creatininePoints(cr) {
    if (cr < 0.40) return 2;
    if (cr <= 0.79) return 5;
    if (cr <= 1.19) return 8;
    if (cr <= 1.59) return 11;
    if (cr <= 1.99) return 14;
    if (cr <= 3.99) return 23;
    return 31;
  }

  function killipPoints(k) {
    return { 1: 0, 2: 21, 3: 43, 4: 64 }[k] || 0;
  }

  function compute(input) {
    var pts = {
      age: agePoints(input.age),
      hr: hrPoints(input.hr),
      sbp: sbpPoints(input.sbp),
      creatinine: creatininePoints(input.creatinine),
      killip: killipPoints(input.killip),
      arrest: input.arrest ? 43 : 0,
      st: input.stDeviation ? 30 : 0,
      marker: input.elevatedMarker ? 15 : 0
    };

    var total = pts.age + pts.hr + pts.sbp + pts.creatinine + pts.killip + pts.arrest + pts.st + pts.marker;

    var inHospital = total <= 108
      ? { level: 'low', label: '< 1%' }
      : (total <= 140 ? { level: 'moderate', label: '1–3%' } : { level: 'high', label: '> 3%' });

    var sixMonth = total <= 88
      ? { level: 'low', label: '< 3%' }
      : (total <= 118 ? { level: 'moderate', label: '3–8%' } : { level: 'high', label: '> 8%' });

    var recommendation;
    if (total > 140 || total > 118) {
      recommendation = 'Risiko tinggi. Pertimbangkan strategi invasif dini (kateterisasi/PCI dalam < 24 jam) sesuai guideline ACS, pemantauan ketat, dan optimalisasi terapi medis.';
    } else if (total > 108 || total > 88) {
      recommendation = 'Risiko sedang. Pertimbangkan strategi invasif dalam 24–72 jam sesuai penilaian klinis menyeluruh.';
    } else {
      recommendation = 'Risiko rendah. Strategi konservatif/invasif selektif dapat dipertimbangkan sesuai kondisi klinis keseluruhan.';
    }

    return {
      total: total,
      points: pts,
      inHospital: inHospital,
      sixMonth: sixMonth,
      recommendation: recommendation
    };
  }

  function render(result) {
    var html = ''
      + '<div class="result-score">'
      + '  <div class="score-value">' + result.total + '</div>'
      + '  <div class="score-label">total poin GRACE</div>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Mortalitas in-hospital</h4>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.inHospital.level) + '">' + result.inHospital.label + '</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Mortalitas pasca-pulang (6 bulan)</h4>'
      + '  <span class="risk-pill ' + CVUtils.riskClass(result.sixMonth.level) + '">' + result.sixMonth.label + '</span>'
      + '</div>'
      + '<div class="result-block">'
      + '  <h4>Interpretasi &amp; tatalaksana</h4>'
      + '  <p>' + result.recommendation + '</p>'
      + '</div>';
    CVUtils.showResult('gr-result', html);
  }

  function handleSubmit(e) {
    e.preventDefault();
    CVUtils.clearAllErrors('form-grace');

    var age = CVUtils.getNumberValue('gr-age');
    var hr = CVUtils.getNumberValue('gr-hr');
    var sbp = CVUtils.getNumberValue('gr-sbp');
    var creat = CVUtils.getNumberValue('gr-creat');

    var valid = true;
    valid = CVUtils.validateRange('gr-age', age, 18, 120, 'Usia') && valid;
    valid = CVUtils.validateRange('gr-hr', hr, 20, 300, 'Denyut jantung') && valid;
    valid = CVUtils.validateRange('gr-sbp', sbp, 40, 300, 'Tekanan darah sistolik') && valid;
    valid = CVUtils.validateRange('gr-creat', creat, 0.1, 20, 'Kreatinin') && valid;
    if (!valid) return;

    var input = {
      age: age,
      hr: hr,
      sbp: sbp,
      creatinine: creat,
      killip: parseInt(CVUtils.getSelectValue('gr-killip'), 10),
      arrest: CVUtils.getSelectValue('gr-arrest') === 'yes',
      stDeviation: CVUtils.getSelectValue('gr-st') === 'yes',
      elevatedMarker: CVUtils.getSelectValue('gr-marker') === 'yes'
    };

    render(compute(input));
  }

  function init() {
    var form = document.getElementById('form-grace');
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', function () {
      CVUtils.clearAllErrors('form-grace');
      CVUtils.showResult('gr-result', '<div class="result-placeholder">Isi form di sebelah kiri lalu klik "Hitung skor" untuk melihat hasil.</div>');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.CVCalc.grace = { compute: compute };
})();
