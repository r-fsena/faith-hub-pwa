/* One loading surface survives HTML, React chunks, church resolution and session restore. */
(function () {
  var panel = document.getElementById('initial-splash');
  if (!panel) return;
  var root = document.getElementById('root'), logo = panel.querySelector('img');
  var title = panel.querySelector('h1'), message = panel.querySelector('p'), retry = panel.querySelector('button');
  var finished = false, finishing = false, logoReady = Promise.resolve();
  var safeColor = function (value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); };
  function update(identity) {
    if (finished || finishing || !identity) return;
    if (identity.name) title.textContent = identity.name;
    if (identity.mode === 'light' || identity.mode === 'dark') panel.dataset.monochrome = identity.monochrome ? identity.mode : '';
    ['background', 'text', 'muted'].forEach(function (key) { if (safeColor(identity[key])) panel.style.setProperty('--boot-' + key, identity[key]); });
    if (identity.logoUrl && logo.getAttribute('src') !== identity.logoUrl) {
      try {
        var url = new URL(identity.logoUrl, location.origin);
        if (url.protocol !== 'https:' && url.origin !== location.origin && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(identity.logoUrl)) return;
        logoReady = new Promise(function (resolve) {
          var timer = setTimeout(resolve, 1500);
          logo.onload = function () { clearTimeout(timer); logo.hidden = false; resolve(); };
          logo.onerror = function () { clearTimeout(timer); logo.hidden = true; resolve(); };
          logo.hidden = true; logo.src = identity.logoUrl;
          if (logo.complete && logo.naturalWidth) { logo.hidden = false; clearTimeout(timer); resolve(); }
        });
      } catch (_) { logo.hidden = true; }
    }
  }
  function fail(text) {
    if (finished || finishing) return;
    panel.dataset.error = 'true'; message.textContent = text || 'Não foi possível concluir o carregamento. Verifique a conexão e tente novamente.'; retry.hidden = false;
  }
  function finish() {
    if (finished || finishing) return;
    finishing = true; clearTimeout(watchdog);
    logoReady.then(function () { requestAnimationFrame(function () { requestAnimationFrame(function () {
      panel.classList.add('boot-finished'); root.removeAttribute('inert'); root.removeAttribute('aria-hidden');
      setTimeout(function () { finished = true; panel.remove(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
    }); }); });
  }
  retry.onclick = function () { location.reload(); };
  var watchdog = setTimeout(function () { fail(); }, 25000);
  window.faithhubBoot = { update: update, finish: finish, fail: fail };
  // Never borrow a logo or theme from the previous church on this shared origin.
  try {
    if (location.pathname.replace(/\/+$/, '') === '/__pwa-preview') { panel.hidden = true; clearTimeout(watchdog); root.removeAttribute('inert'); root.removeAttribute('aria-hidden'); return; }
    var query = new URLSearchParams(location.search), slug = query.get('slug') || query.get('org') || query.get('church') || query.get('organization_id');
    if (!slug) {
      var host = location.hostname.toLowerCase(), sub = host.split('.')[0];
      if (host.split('.').length >= 2 && ['app','www','api','admin','studio','faithhub','localhost','127','ecossistema-faith-hub'].indexOf(sub) === -1 && host.indexOf('vercel.app') === -1) slug = sub;
    }
    if (!slug) {
      slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (['login','signup','auth','profile','bible','devotionals','events','store','prayers','cells','live','admin'].indexOf(slug) !== -1) slug = '';
    }
    if (!slug) slug = localStorage.getItem('faithhub_active_church_slug') || '';
    slug = slug.trim().toLowerCase();
    var requestedTheme = query.get('theme');
    if (requestedTheme === 'light' || requestedTheme === 'dark') update({ background:requestedTheme==='dark'?'#090d16':'#ffffff', text:requestedTheme==='dark'?'#f8fafc':'#0f172a', muted:requestedTheme==='dark'?'#cbd5e1':'#475569' });
    var cached = JSON.parse(localStorage.getItem('faithhub_church_branding_' + (slug || 'default')) || 'null');
    if (cached && (!slug || cached.pwa_slug === slug || cached.organization_id === slug)) {
      var config = cached.pwa_experience && cached.pwa_experience.enabled && cached.pwa_experience.customized && cached.pwa_experience.config;
      var identity = config && config.identity || {}, theme = config && config.theme || {};
      var pref = query.get('theme') || localStorage.getItem('faithhub_theme_mode:' + (cached.organization_id || slug)) || theme.default_mode || cached.theme_mode || 'system';
      var dark = String(pref).toLowerCase() === 'dark' || (String(pref).toLowerCase() === 'system' && matchMedia('(prefers-color-scheme: dark)').matches), palette = theme[dark ? 'dark' : 'light'] || {};
      update({ name:identity.name || cached.church_name, logoUrl:identity.logo_url || cached.logo_icon_url || cached.logo_header_url, mode:dark?'dark':'light',
        monochrome: config && [theme.light,theme.dark].every(function (p) { return p && Object.values(p).every(function (v) { return /^#([0-9a-f]{2})\1\1$/i.test(v); }) && p.background.toLowerCase() !== p.text.toLowerCase(); }), background:palette.background || (dark?'#090d16':'#ffffff'), text:palette.text || (dark?'#f8fafc':'#0f172a'), muted:palette.muted || (dark?'#cbd5e1':'#475569') });
    }
  } catch (_) { /* Storage can be unavailable in private browsing. */ }
}());
