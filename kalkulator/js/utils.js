/* Shared helpers used by every calculator module. Loaded before app.js. */
window.CVUtils = (function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getNumberValue(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = el.value.trim();
    if (v === '') return NaN;
    return parseFloat(v);
  }

  function getChecked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function getSelectValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function getRadioValue(name, root) {
    var el = (root || document).querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  // Marks a field invalid/valid. fieldId is the id of the input/select itself;
  // it must live inside an ancestor with class "field".
  function setFieldError(fieldId, message) {
    var input = document.getElementById(fieldId);
    if (!input) return;
    var wrap = input.closest('.field');
    if (!wrap) return;
    wrap.classList.add('has-error');
    var errEl = wrap.querySelector('.field-error');
    if (errEl) errEl.textContent = message;
  }

  function clearFieldError(fieldId) {
    var input = document.getElementById(fieldId);
    if (!input) return;
    var wrap = input.closest('.field');
    if (!wrap) return;
    wrap.classList.remove('has-error');
  }

  function clearAllErrors(rootId) {
    qsa('.field.has-error', document.getElementById(rootId)).forEach(function (el) {
      el.classList.remove('has-error');
    });
  }

  // Validates a numeric field is present and within [min, max]. Returns true if valid.
  function validateRange(fieldId, value, min, max, label) {
    if (isNaN(value)) {
      setFieldError(fieldId, label + ' wajib diisi.');
      return false;
    }
    if (value < min || value > max) {
      setFieldError(fieldId, label + ' harus di antara ' + min + ' dan ' + max + '.');
      return false;
    }
    clearFieldError(fieldId);
    return true;
  }

  function validateSelect(fieldId, value, label) {
    if (!value) {
      setFieldError(fieldId, 'Pilih ' + label + '.');
      return false;
    }
    clearFieldError(fieldId);
    return true;
  }

  function riskClass(level) {
    switch (level) {
      case 'low': return 'risk-low';
      case 'moderate': return 'risk-moderate';
      case 'high': return 'risk-high';
      case 'veryhigh': return 'risk-veryhigh';
      default: return 'risk-low';
    }
  }

  function fmt(num, decimals) {
    if (typeof decimals !== 'number') decimals = 0;
    return Number(num).toFixed(decimals);
  }

  function showResult(resultElId, html) {
    var el = document.getElementById(resultElId);
    if (el) el.innerHTML = html;
  }

  return {
    qs: qs,
    qsa: qsa,
    getNumberValue: getNumberValue,
    getChecked: getChecked,
    getSelectValue: getSelectValue,
    getRadioValue: getRadioValue,
    setFieldError: setFieldError,
    clearFieldError: clearFieldError,
    clearAllErrors: clearAllErrors,
    validateRange: validateRange,
    validateSelect: validateSelect,
    riskClass: riskClass,
    fmt: fmt,
    showResult: showResult
  };
})();
