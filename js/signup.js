/* NUDES — signup form → /api/subscribe (Brevo).
 * Shared script: any <form data-signup> on the site is wired automatically.
 * Expected field names: nombre, email, ciudad, codigoPostal, fechaNacimiento,
 * consentimiento (checkbox), empresa (honeypot). Optional: [data-signup-status].
 * Optional attributes on the form: data-redirect (default /gracias.html).
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/subscribe';
  var DEFAULT_REDIRECT = '/gracias.html';

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

  function suggestEmail(value) {
    var m = /^([^\s@]+)@([^\s@]+)$/.exec(value.trim().toLowerCase());
    if (!m) return null;
    var fix = DOMAIN_FIXES[m[2]];
    return fix ? m[1] + '@' + fix : null;
  }

  function setStatus(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.setAttribute('data-state', kind || '');
  }

  function init(form) {
    var status = form.querySelector('[data-signup-status]');
    var button = form.querySelector('button[type="submit"]');
    var emailInput = form.elements.email;
    var dateInput = form.elements.fechaNacimiento;
    var ignoredSuggestion = null; // typo suggestion the user already dismissed by submitting again
    var sending = false;

    if (dateInput) {
      var today = new Date();
      dateInput.max = today.toISOString().slice(0, 10);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var email = emailInput.value.trim();
      var suggestion = suggestEmail(email);
      if (suggestion && suggestion !== ignoredSuggestion) {
        ignoredSuggestion = suggestion;
        emailInput.value = suggestion;
        setStatus(status, '¿Querías decir ' + suggestion + '? Lo hemos corregido: revisa y pulsa de nuevo para enviar.', 'warn');
        emailInput.focus();
        return;
      }

      var payload = {
        nombre: form.elements.nombre.value.trim(),
        email: email,
        ciudad: form.elements.ciudad ? form.elements.ciudad.value.trim() : '',
        codigoPostal: form.elements.codigoPostal ? form.elements.codigoPostal.value.trim() : '',
        fechaNacimiento: dateInput ? dateInput.value : '',
        consentimiento: !!(form.elements.consentimiento && form.elements.consentimiento.checked),
        empresa: form.elements.empresa ? form.elements.empresa.value : ''
      };

      sending = true;
      form.setAttribute('aria-busy', 'true');
      if (button) button.disabled = true;
      setStatus(status, 'Enviando…', 'loading');

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.error || 'No se pudo completar el registro.');
            return data;
          });
        })
        .then(function () {
          setStatus(status, '¡Listo! Redirigiendo…', 'success');
          window.location.href = form.getAttribute('data-redirect') || DEFAULT_REDIRECT;
        })
        .catch(function (err) {
          sending = false;
          form.removeAttribute('aria-busy');
          if (button) button.disabled = false;
          var offline = err instanceof TypeError;
          setStatus(status, offline
            ? 'Sin conexión. Revisa tu red e inténtalo de nuevo.'
            : err.message + ' Inténtalo de nuevo o escríbenos a info@eatnudes.com.', 'error');
        });
    });
  }

  function boot() {
    var forms = document.querySelectorAll('form[data-signup]');
    for (var i = 0; i < forms.length; i++) init(forms[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
