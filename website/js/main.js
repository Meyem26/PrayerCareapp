(function () {
  'use strict';

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
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

  // Gentle header shadow on scroll
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener(
      'scroll',
      function () {
        if (window.scrollY > 8) {
          header.style.boxShadow = '0 4px 24px rgba(31, 41, 55, 0.06)';
        } else {
          header.style.boxShadow = 'none';
        }
      },
      { passive: true }
    );
  }

  function getConfig() {
    return window.PRAYERCARE_CONFIG || null;
  }

  function submitToSupabase(email, note, form) {
    var config = getConfig();
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
      return Promise.reject(new Error('CONFIG_MISSING'));
    }

    if (config.supabaseUrl.includes('YOUR_PROJECT') || config.supabaseAnonKey.includes('YOUR_ANON')) {
      return Promise.reject(new Error('CONFIG_PLACEHOLDER'));
    }

    return fetch(config.supabaseUrl + '/rest/v1/beta_waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email: email, source: 'website' }),
    }).then(function (response) {
      if (response.status === 409 || response.status === 23505) {
        note.textContent = "You're already on the list — we'll be in touch soon.";
        note.classList.add('success');
        form.reset();
        return;
      }

      if (!response.ok) {
        return response.text().then(function (body) {
          throw new Error(body || 'Request failed');
        });
      }

      note.textContent = "Thank you! You're on the beta list. We'll email you when it's ready.";
      note.classList.add('success');
      form.reset();
    });
  }

  function submitFallback(email, note, form) {
    var subject = encodeURIComponent('PrayerCare Beta Signup');
    var body = encodeURIComponent('Please add me to the PrayerCare beta:\n\n' + email);
    window.location.href = 'mailto:beta@prayercare.app?subject=' + subject + '&body=' + body;
    note.textContent = 'Thank you for your interest. We will be in touch soon.';
    note.classList.add('success');
    form.reset();
  }

  // Beta signup form
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
            note.textContent = 'Saving locally — configure website/js/config.js for live signup.';
            submitFallback(email, note, form);
            return;
          }

          if (String(err.message).includes('duplicate') || String(err.message).includes('23505')) {
            note.textContent = "You're already on the list — we'll be in touch soon.";
            note.classList.add('success');
            form.reset();
            return;
          }

          note.textContent = 'Something went wrong. Please try again or email beta@prayercare.app.';
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

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
