/* NUDES — newsletter signup → /api/subscribe (Brevo).
 * Shared script: every <form data-signup> on the site is wired automatically.
 * Field names: nombre (optional), email, codigoPostal (optional), fechaNacimiento
 * (optional), consentimiento (checkbox), empresa (honeypot). Optional status element:
 * [data-signup-status]. Optional form attribute: data-redirect (default /gracias.html).
 *
 * Language: the site toggles EN/ES with applyLang(), which sets <html lang>. Static
 * labels use data-en / data-es (handled by the page). This script translates what the
 * page cannot: placeholders (data-ph-en / data-ph-es) and every status message.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/subscribe';
  var DEFAULT_REDIRECT = '/gracias.html';
  var MIN_AGE = 14;
  var MAX_AGE = 110;

  var MSG = {
    sending:   { en: 'Sending…', es: 'Enviando…' },
    success:   { en: "You're in! Redirecting…", es: '¡Listo! Redirigiendo…' },
    email:     { en: 'Please enter a valid email address.', es: 'Introduce un email válido.' },
    consent:   { en: 'Please tick the box to continue.', es: 'Marca la casilla para continuar.' },
    dateBad:   { en: 'Please enter a valid birth date.', es: 'Introduce una fecha de nacimiento válida.' },
    dateFuture:{ en: "Your birth date can't be in the future.", es: 'La fecha de nacimiento no puede ser futura.' },
    dateYoung: { en: 'You must be at least 14 to sign up.', es: 'Debes tener al menos 14 años para registrarte.' },
    dateOld:   { en: 'Please check your birth date.', es: 'Revisa tu fecha de nacimiento.' },
    typo:      { en: 'Did you mean {0}? We fixed it: check it and press again.', es: '¿Querías decir {0}? Lo hemos corregido: revísalo y pulsa de nuevo.' },
    error:     { en: 'Something went wrong. Please try again or write to info@eatnudes.com.', es: 'Algo salió mal. Inténtalo de nuevo o escribe a info@eatnudes.com.' },
    offline:   { en: 'No connection. Check your network and try again.', es: 'Sin conexión. Revisa tu red e inténtalo de nuevo.' }
  };

  var DOMAIN_FIXES = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com',
    'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
    'gmail.es': 'gmail.com', 'gmail.co': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
    'hotmai.com': 'hotmail.com', 'hormail.com': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outloook.com': 'outlook.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
    'yahoo.es.com': 'yahoo.es', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
    'icoud.com': 'icloud.com'
  };

  function lang() {
    var l = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (!l) {
      try { l = localStorage.getItem('nudes-lang') || ''; } catch (e) { l = ''; }
    }
    return l.indexOf('es') === 0 ? 'es' : 'en';
  }

  function text(key, arg) {
    var s = MSG[key][lang()];
    return arg === undefined ? s : s.replace('{0}', arg);
  }

  function suggestEmail(value) {
    var m = /^([^\s@]+)@([^\s@]+)$/.exec(value.trim().toLowerCase());
    if (!m) return null;
    var fix = DOMAIN_FIXES[m[2]];
    return fix ? m[1] + '@' + fix : null;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function yearsAgo(n) {
    var d = new Date();
    return iso(new Date(d.getFullYear() - n, d.getMonth(), d.getDate()));
  }

  /* Returns a MSG key when the birth date is invalid, or null when valid or empty. */
  function birthDateProblem(value) {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'dateBad';
    var p = value.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (d.getFullYear() !== +p[0] || d.getMonth() !== +p[1] - 1 || d.getDate() !== +p[2]) return 'dateBad';
    if (value > iso(new Date())) return 'dateFuture';
    if (value > yearsAgo(MIN_AGE)) return 'dateYoung';
    if (value < yearsAgo(MAX_AGE)) return 'dateOld';
    return null;
  }

  function applyPlaceholders(root) {
    var l = lang();
    var nodes = (root || document).querySelectorAll('[data-ph-en]');
    for (var i = 0; i < nodes.length; i++) {
      var ph = nodes[i].getAttribute('data-ph-' + l) || nodes[i].getAttribute('data-ph-en');
      nodes[i].setAttribute('placeholder', ph);
    }
  }

  function init(form) {
    var status = form.querySelector('[data-signup-status]');
    var button = form.querySelector('button[type="submit"]');
    var emailInput = form.elements.email;
    var dateInput = form.elements.fechaNacimiento;
    var ignoredSuggestion = null;
    var sending = false;
    var shown = null; // {key, arg, kind} so the message can be re-rendered on language change

    function show(key, kind, arg) {
      shown = key ? { key: key, arg: arg, kind: kind } : null;
      render();
    }
    function render() {
      if (!status) return;
      status.textContent = shown ? text(shown.key, shown.arg) : '';
      status.setAttribute('data-state', shown ? shown.kind : '');
    }
    function fail(key, field) {
      show(key, 'error');
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    }
    function clearInvalid() {
      var f = form.querySelectorAll('[aria-invalid]');
      for (var i = 0; i < f.length; i++) f[i].removeAttribute('aria-invalid');
    }

    if (dateInput) {
      dateInput.max = yearsAgo(MIN_AGE);
      dateInput.min = yearsAgo(MAX_AGE);
    }
    form._signupRender = render;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      clearInvalid();

      var email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('email', emailInput);

      var problem = birthDateProblem(dateInput ? dateInput.value : '');
      if (problem) return fail(problem, dateInput);

      var consent = form.elements.consentimiento;
      if (!consent || !consent.checked) return fail('consent', consent);

      var suggestion = suggestEmail(email);
      if (suggestion && suggestion !== ignoredSuggestion) {
        ignoredSuggestion = suggestion;
        emailInput.value = suggestion;
        show('typo', 'warn', suggestion);
        emailInput.focus();
        return;
      }

      var payload = {
        nombre: form.elements.nombre ? form.elements.nombre.value.trim() : '',
        email: email,
        codigoPostal: form.elements.codigoPostal ? form.elements.codigoPostal.value.trim() : '',
        fechaNacimiento: dateInput ? dateInput.value : '',
        consentimiento: true,
        empresa: form.elements.empresa ? form.elements.empresa.value : ''
      };

      sending = true;
      form.setAttribute('aria-busy', 'true');
      if (button) button.disabled = true;
      show('sending', 'loading');

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          return res.json().catch(function () { return {}; });
        })
        .then(function () {
          show('success', 'success');
          window.location.href = form.getAttribute('data-redirect') || DEFAULT_REDIRECT;
        })
        .catch(function (err) {
          sending = false;
          form.removeAttribute('aria-busy');
          if (button) button.disabled = false;
          show(err instanceof TypeError ? 'offline' : 'error', 'error');
        });
    });
  }

  function boot() {
    var forms = document.querySelectorAll('form[data-signup]');
    for (var i = 0; i < forms.length; i++) init(forms[i]);
    applyPlaceholders();

    // The page's language toggle sets <html lang>: refresh placeholders and any message.
    if (window.MutationObserver) {
      new MutationObserver(function () {
        applyPlaceholders();
        for (var i = 0; i < forms.length; i++) if (forms[i]._signupRender) forms[i]._signupRender();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
