'use strict';
(function () {
  const defaults = window.M3CMS_DEFAULTS;
  let current = structuredClone(defaults);
  const preview = new URLSearchParams(location.search).get('preview') === '1' && parent !== window;

  function merge(data) {
    const value = data && typeof data === 'object' ? data : {};
    return {
      version: 1,
      texts: { ...defaults.texts, ...value.texts },
      images: { ...defaults.images, ...value.images },
      links: { ...defaults.links, ...value.links },
      content: { ...structuredClone(defaults.content), ...value.content },
      auth: {
        login: { ...defaults.auth.login, ...value.auth?.login },
        register: { ...defaults.auth.register, ...value.auth?.register }
      }
    };
  }

  function text(key, fallback) { return current.texts[key] ?? fallback ?? ''; }
  function image(key, fallback) { return current.images[key] || { src: fallback, x: 50, y: 50, fit: 'cover' }; }
  function link(key) { return current.links[key] || ''; }

  function refreshDOM() {
    document.querySelectorAll('[data-cms-text]').forEach(element => {
      const value = text(element.dataset.cmsText);
      if (value !== undefined) element.textContent = value;
    });
    document.querySelectorAll('[data-cms-image]').forEach(element => {
      const value = image(element.dataset.cmsImage, element.getAttribute('src'));
      if (!value.src) return;
      element.src = value.src;
      element.style.objectPosition = (value.x ?? 50) + '% ' + (value.y ?? 50) + '%';
      element.style.objectFit = value.fit || 'cover';
    });
    document.querySelectorAll('[data-cms-link]').forEach(element => {
      element.href = link(element.dataset.cmsLink) || element.dataset.cmsFallback || '#destek';
    });
    const variables = { 'theme.buttonPrimary': '--button-primary-image', 'theme.buttonSecondary': '--button-secondary-image', 'theme.inputFrame': '--input-frame-image', 'theme.headingOrnament': '--heading-ornament-image' };
    for (const [key, variable] of Object.entries(variables)) {
      const value = image(key).src;
      if (value) document.documentElement.style.setProperty(variable, 'url(' + JSON.stringify(new URL(value, location.href).href) + ')');
    }
  }

  function apply(data, rerender) {
    current = merge(data);
    Object.assign(window.M3CONTENT, current.content);
    for (const mode of ['login', 'register']) {
      Object.assign(window.M3AUTH_CONFIG[mode], current.auth[mode], image('auth.' + mode));
    }
    refreshDOM();
    if (rerender) {
      window.M3APP?.refresh();
      window.M3AUTH?.refresh();
      refreshDOM();
    }
  }

  window.M3CMS = { text, image, link, refreshDOM, get document() { return current; } };
  window.M3CMS_READY = (async () => {
    let data = null;
    try {
      const response = await fetch('/api/site', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) data = (await response.json()).data;
    } catch (_) { /* Bundled defaults remain readable during network failures. */ }
    apply(data, false);
  })();

  if (preview) {
    window.addEventListener('message', event => {
      if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'm3-cms-preview') return;
      try { apply(event.data.data, true); } catch (_) { /* Keep the last valid preview while a field is incomplete. */ }
    });
    window.M3CMS_READY.then(() => requestAnimationFrame(() => parent.postMessage({ type: 'm3-cms-ready' }, location.origin)));
  }

  fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' }).then(response => {
    if (!response.ok) return;
    document.querySelectorAll('[data-admin-link]').forEach(element => { element.hidden = false; });
  }).catch(() => {});
})();
