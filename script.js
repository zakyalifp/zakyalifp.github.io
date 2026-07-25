document.addEventListener('DOMContentLoaded', function () {
  // Mobile navigation menu toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fade the page in once it has loaded
  requestAnimationFrame(function () {
    document.body.classList.add('is-loaded');
  });

  // Reveal sections as they scroll into view
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // Smooth fade transition when navigating to another page on this site
  if (!reduceMotion) {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      var isInternalPage = href
        && /\.html($|#)/.test(href)
        && !link.hasAttribute('download')
        && link.target !== '_blank';

      if (isInternalPage) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          document.body.classList.remove('is-loaded');
          document.body.classList.add('is-leaving');
          setTimeout(function () {
            window.location.href = href;
          }, 220);
        });
      }
    });
  }
});
