(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Google Analytics 4
  var config = window.PRAYERCARE_CONFIG || {};
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

  function getConfig() {
    return window.PRAYERCARE_CONFIG || null;
  }

  function submitToSupabase(email, note, form) {
    var cfg = getConfig();
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      return Promise.reject(new Error('CONFIG_MISSING'));
    }
    if (cfg.supabaseUrl.includes('YOUR_PROJECT') || cfg.supabaseAnonKey.includes('YOUR_ANON')) {
      return Promise.reject(new Error('CONFIG_PLACEHOLDER'));
    }

    return fetch(cfg.supabaseUrl + '/rest/v1/beta_waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: 'Bearer ' + cfg.supabaseAnonKey,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email: email, source: 'website' }),
    }).then(function (response) {
      if (response.status === 409) {
        note.textContent = "You're already on the list — we'll be in touch soon.";
        note.classList.add('success');
        form.reset();
        trackEvent('beta_signup_duplicate');
        return;
      }

      if (!response.ok) {
        return response.text().then(function (body) {
          throw new Error(body || 'Request failed');
        });
      }

      var cfg = getConfig();
      note.textContent =
        "Thank you! You're on the beta list. Check your inbox for a confirmation email.";
      note.classList.add('success');
      form.reset();
      trackEvent('beta_signup', { method: 'website' });
      notifyBetaSignup(email);
    });
  }

  function notifyBetaSignup(email) {
    var cfg = getConfig();
    if (!cfg) return;
    fetch(cfg.supabaseUrl + '/functions/v1/notify-beta-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: 'Bearer ' + cfg.supabaseAnonKey,
      },
      body: JSON.stringify({ email: email, source: 'website' }),
    }).catch(function () {
      /* Signup already saved — email is best-effort if webhook is unavailable */
    });
  }

  var form = document.getElementById('beta-form');
  var note = document.getElementById('form-note');
  var submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var input = document.getElementById('beta-email');
      var email = input && input.value ? input.value.trim().toLowerCase() : '';

      if (!note) return;
      note.className = 'form-note';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'Please enter a valid email address.';
        note.classList.add('error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining…';
      }

      submitToSupabase(email, note, form)
        .catch(function (err) {
          if (err.message === 'CONFIG_MISSING' || err.message === 'CONFIG_PLACEHOLDER') {
            note.textContent = 'Signup is not configured yet. Please try again soon.';
            note.classList.add('error');
            return;
          }
          if (String(err.message).includes('duplicate') || String(err.message).includes('23505')) {
            note.textContent = "You're already on the list — we'll be in touch soon.";
            note.classList.add('success');
            form.reset();
            trackEvent('beta_signup_duplicate');
            return;
          }
          note.textContent = 'Something went wrong. Please try again in a moment.';
          note.classList.add('error');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Join the PrayerCare Beta';
          }
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
