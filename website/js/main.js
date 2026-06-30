(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Google Analytics 4
  var config = window.PRAYERCARE_CONFIG || {};

  var headerOpenApp = document.getElementById('header-open-app');
  var betaOpenApp = document.getElementById('beta-open-app');
  if (config.appUrl) {
    if (headerOpenApp) {
      headerOpenApp.href = config.appUrl + '/';
      headerOpenApp.hidden = false;
    }
    if (betaOpenApp) {
      betaOpenApp.href = config.appUrl + '/';
    }
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

  function getConfig() {
    return window.PRAYERCARE_CONFIG || null;
  }

  /** Base project URL only — strips accidental /rest/v1 suffix from env vars. */
  function normalizeSupabaseUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/rest\/v1\/?$/i, '');
  }

  function parseSupabaseError(body) {
    if (!body) return '';
    try {
      var parsed = JSON.parse(body);
      if (parsed.message) return String(parsed.message);
      if (parsed.error) return String(parsed.error);
    } catch (e) {
      /* plain text */
    }
    return String(body);
  }

  function friendlySignupError(status, body) {
    var detail = parseSupabaseError(body);
    var lower = detail.toLowerCase();

    if (status === 404 || lower.indexOf('beta_waitlist') !== -1) {
      return 'Beta signup is not set up yet. Run migration 016 in Supabase, then redeploy.';
    }
    if (status === 401 || status === 403 || lower.indexOf('row-level security') !== -1) {
      return 'Signup was blocked by database security. Check beta_waitlist RLS in Supabase.';
    }
    if (
      status === 409 ||
      lower.indexOf('duplicate') !== -1 ||
      lower.indexOf('23505') !== -1 ||
      lower.indexOf('unique') !== -1
    ) {
      return 'DUPLICATE';
    }
    if (lower.indexOf('failed to fetch') !== -1 || lower.indexOf('network') !== -1) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (detail && detail.length < 160) {
      return detail;
    }
    return 'Something went wrong. Please try again in a moment.';
  }

  function showBetaAppNextStep() {
    var next = document.getElementById('beta-success-next');
    if (next) {
      next.hidden = false;
    }
  }

  function submitToSupabase(email, note, form) {
    var cfg = getConfig();
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      return Promise.reject(new Error('CONFIG_MISSING'));
    }
    var supabaseUrl = normalizeSupabaseUrl(cfg.supabaseUrl);
    if (!supabaseUrl) {
      return Promise.reject(new Error('CONFIG_MISSING'));
    }
    if (supabaseUrl.includes('YOUR_PROJECT') || cfg.supabaseAnonKey.includes('YOUR_ANON')) {
      return Promise.reject(new Error('CONFIG_PLACEHOLDER'));
    }

    return fetch(supabaseUrl + '/rest/v1/beta_waitlist', {
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
        note.textContent = "You're already on the list — open the app to sign in.";
        note.classList.add('success');
        form.reset();
        trackEvent('beta_signup_duplicate');
        showBetaAppNextStep();
        notifyBetaSignup(email);
        return;
      }

      if (!response.ok) {
        return response.text().then(function (body) {
          var err = new Error(body || 'Request failed');
          err.status = response.status;
          throw err;
        });
      }

      var cfg = getConfig();
      note.textContent =
        "Thank you! You're on the beta list. Check your inbox for a confirmation email.";
      note.classList.add('success');
      form.reset();
      trackEvent('beta_signup', { method: 'website' });
      showBetaAppNextStep();
      notifyBetaSignup(email);
    });
  }

  function notifyBetaSignup(email) {
    var cfg = getConfig();
    if (!cfg) return;
    var supabaseUrl = normalizeSupabaseUrl(cfg.supabaseUrl);
    if (!supabaseUrl) return;
    fetch(supabaseUrl + '/functions/v1/notify-beta-signup', {
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
          console.error('Beta signup failed:', err);
          if (err.message === 'CONFIG_MISSING' || err.message === 'CONFIG_PLACEHOLDER') {
            note.textContent =
              'Signup is not configured yet. Set Supabase env vars on Vercel and redeploy.';
            note.classList.add('error');
            return;
          }
          var friendly = friendlySignupError(err.status || 0, err.message || '');
          if (friendly === 'DUPLICATE') {
            note.textContent = "You're already on the list — open the app to sign in.";
            note.classList.add('success');
            form.reset();
            trackEvent('beta_signup_duplicate');
            showBetaAppNextStep();
            notifyBetaSignup(email);
            return;
          }
          note.textContent = friendly;
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
