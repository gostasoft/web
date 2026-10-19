'use strict';
(function () {
  const defaults = window.M3CMS_DEFAULTS;
  const homeTitle = document.title;
  let current = structuredClone(defaults);
  const previewRequested = new URLSearchParams(location.search).get('preview') === '1' && parent !== window;
  let preview = false;

  function merge(data) {
    const value = data && typeof data === 'object' ? data : {};
    const merged = {
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
    // Legacy documents receive the same seven original sections and menus;
    // saved layouts and pages remain authoritative when a builder is present.
    if (window.M3BUILDER) merged.builder = window.M3BUILDER.normalize(value.builder, merged);
    else if (value.builder) merged.builder = structuredClone(value.builder);
    return merged;
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
    // Only apply() notifies the renderer. refreshDOM() is also called by the
    // legacy app refresh, so keeping this separate prevents recursive renders.
    window.M3BUILDER_VIEW?.refresh();
  }

  window.M3CMS = { text, image, link, refreshDOM, homeTitle, get document() { return current; }, get preview() { return preview; } };
  window.M3CMS_READY = (async () => {
    let data = null;
    await Promise.all([
      (async () => {
        try {
          const response = await fetch('/api/site', { cache: 'no-store', credentials: 'same-origin' });
          if (response.ok) data = (await response.json()).data;
        } catch (_) { /* Bundled defaults remain readable during network failures. */ }
      })(),
      (async () => {
        if (!previewRequested) return;
        try {
          const response = await fetch('/api/admin/session', { cache: 'no-store', credentials: 'same-origin' });
          preview = response.ok && (await response.json()).authorized === true;
        } catch (_) { /* Query parameters alone never authorize draft content. */ }
      })()
    ]);
    apply(data, false);
  })();

  if (previewRequested) {
    window.addEventListener('message', event => {
      if (!preview || event.source !== parent || event.origin !== location.origin || event.data?.type !== 'm3-cms-preview') return;
      try { apply(event.data.data, true); } catch (_) { /* Keep the last valid preview while a field is incomplete. */ }
    });
    window.M3CMS_READY.then(() => {
      if (preview) requestAnimationFrame(() => parent.postMessage({ type: 'm3-cms-ready' }, location.origin));
    });
  }

})();
