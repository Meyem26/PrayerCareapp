(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Google Analytics 4
  var config = window.PRAYERCARE_CONFIG || {};
  var appBase = config.appUrl ? String(config.appUrl).replace(/\/$/, '') : '';
  /** Opt-in only — public launch defaults to Get Started → app sign-up. */
  var betaMode = config.betaMode === true;

  function resolveAppHref(template, fallbackPath) {
    var href = template || '';
    if (href.indexOf('__APP_URL__') !== -1) {
      href = appBase ? href.replace(/__APP_URL__/g, appBase) : fallbackPath || '#get-started';
    }
    if (!href && appBase) {
      href = appBase + (fallbackPath || '/sign-up');
    }
    return href || fallbackPath || '#get-started';
  }

  function applyPrimaryCta() {
    document.querySelectorAll('.js-primary-cta').forEach(function (el) {
      var href = betaMode
        ? el.getAttribute('data-beta-href') || '#get-started'
        : resolveAppHref(
            el.getAttribute('data-launch-href'),
            '/sign-up',
          );
      var label = betaMode
        ? el.getAttribute('data-beta-label') || 'Get Started'
        : el.getAttribute('data-launch-label') || 'Get Started';

      el.setAttribute('href', href);
      el.textContent = label;
    });
  }

  applyPrimaryCta();

  var headerSignIn = document.getElementById('header-sign-in');
  var mobileSignIn = document.getElementById('mobile-sign-in');
  var ctaCreate = document.getElementById('cta-create-account');
  var ctaSignIn = document.getElementById('cta-sign-in');

  document.querySelectorAll('.js-app-signup').forEach(function (el) {
    el.setAttribute('href', resolveAppHref(el.getAttribute('href'), '/sign-up'));
  });
  document.querySelectorAll('.js-app-signin').forEach(function (el) {
    el.setAttribute('href', resolveAppHref(el.getAttribute('href'), '/login'));
  });

  if (appBase) {
    if (headerSignIn) headerSignIn.href = appBase + '/login';
    if (mobileSignIn) mobileSignIn.href = appBase + '/login';
    if (ctaCreate) ctaCreate.href = appBase + '/sign-up';
    if (ctaSignIn) ctaSignIn.href = appBase + '/login';
  }

  if (config.gaMeasurementId) {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src =
      'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.gaMeasurementId);
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', config.gaMeasurementId);
  }

  function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
  }

  // Scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // Header shadow on scroll
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener(
      'scroll',
      function () {
        header.style.boxShadow = window.scrollY > 8 ? '0 4px 24px rgba(31, 41, 55, 0.06)' : 'none';
      },
      { passive: true }
    );
  }

  // Mobile menu
  var menuToggle = document.getElementById('menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    mobileNav.hidden = true;
    document.body.classList.remove('menu-open');
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
      mobileNav.hidden = isOpen;
      document.body.classList.toggle('menu-open', !isOpen);
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileNav);
    });
  }

  // App showcase tabs
  var showcaseTabs = document.querySelectorAll('.showcase-tab');
  if (showcaseTabs.length) {
    showcaseTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-showcase');
        if (!id) return;

        showcaseTabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        document.querySelectorAll('.showcase-screen').forEach(function (screen) {
          var match = screen.getAttribute('data-showcase-panel') === id;
          screen.classList.toggle('is-active', match);
          screen.hidden = !match;
        });

        document.querySelectorAll('.showcase-panel').forEach(function (panel) {
          var match = panel.getAttribute('data-showcase-copy') === id;
          panel.classList.toggle('is-active', match);
          panel.hidden = !match;
        });
      });
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      closeMobileNav();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
