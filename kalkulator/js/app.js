/* Hash-based router: swaps visible .view section without reloading the page. */
(function () {
  var DEFAULT_VIEW = 'landing';

  function currentViewId() {
    var hash = window.location.hash.replace('#', '').trim();
    return hash || DEFAULT_VIEW;
  }

  function navigate() {
    var viewId = currentViewId();
    var target = document.getElementById('view-' + viewId);

    if (!target) {
      viewId = DEFAULT_VIEW;
      target = document.getElementById('view-' + DEFAULT_VIEW);
    }

    CVUtils.qsa('.view').forEach(function (el) {
      el.classList.toggle('is-active', el === target);
    });

    CVUtils.qsa('.nav-link').forEach(function (el) {
      var linkTarget = el.getAttribute('href').replace('#', '');
      el.classList.toggle('active', linkTarget === viewId);
    });

    document.title = target && target.dataset.title
      ? target.dataset.title + ' — Kalkulator Kardiovaskular'
      : 'Kalkulator Kardiovaskular';

    document.getElementById('main-content').scrollTop = 0;
    window.scrollTo(0, 0);

    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
  }

  window.addEventListener('hashchange', navigate);
  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    navigate();
  });
})();
