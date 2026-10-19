'use strict';
(async function () {
  const homeTitle = window.M3CMS?.homeTitle || document.title;
  await window.M3CMS_READY;
  const model = window.M3BUILDER;
  const home = document.getElementById('main');
  const pageMain = document.getElementById('cms-page');
  if (!model || !home || !pageMain || !window.M3CMS) return;
  const footer = document.querySelector('.site-footer');
  const desktopNav = document.querySelector('.desktop-nav');
  const mobileNav = document.getElementById('mobile-nav');
  const footerNav = document.querySelector('.footer-main nav');
  const mobileAccount = mobileNav?.querySelector('[data-modal="register"]');
  const builtins = new Map(Array.from(home.querySelectorAll('[data-builder-builtin]')).map(node => [node.dataset.builderBuiltin, node]));
  const authRoutes = new Set(['#giris', '#kayit', '#sifre-yenile', '#kullanici-adi']);
  let builder = null;
  let currentPage = null;
  let onPage = false;
  let pendingAnchor = null;

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = String(value ?? '');
    return element;
  }

  function safeUrl(value, image) {
    if (typeof value !== 'string' || !value || value.length > 2048 || /[\u0000-\u0020\\<>"']/.test(value)) return '';
    if (image && /^(?:\/)?assets\/[A-Za-z0-9._/-]+$/.test(value)) {
      return !value.split('/').includes('..') && !/\.svg$/i.test(value) ? value : '';
    }
    if (!image && value.startsWith('#')) return value;
    if (value.startsWith('/') && !value.startsWith('//')) {
      if (image && !/^\/media\/[a-f0-9-]{36}\.(?:png|jpg|webp|avif)$/.test(value)) return '';
      try { return new URL(value, location.origin).origin === location.origin ? value : ''; }
      catch (_) { return ''; }
    }
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password && (!image || !/\.svg$/i.test(url.pathname))) return value;
      if (!image && url.protocol === 'mailto:' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname)) return value;
    } catch (_) { /* Unsupported or incomplete editor value. */ }
    return '';
  }

  function artwork(value, alt, className) {
    const src = safeUrl(value?.src, true);
    if (!src) return null;
    const image = node('img', className);
    image.src = src;
    image.alt = String(alt || '');
    image.loading = 'lazy';
    image.decoding = 'async';
    const percent = position => Number.isFinite(Number(position)) ? Math.min(100, Math.max(0, Number(position))) : 50;
    image.style.objectPosition = percent(value.x) + '% ' + percent(value.y) + '%';
    image.style.objectFit = value.fit === 'contain' ? 'contain' : 'cover';
    image.addEventListener('error', () => {
      image.hidden = true;
      image.parentElement?.classList.add('builder-image-unavailable');
    }, { once: true });
    return image;
  }

  function paragraphCopy(value, className) {
    const copy = node('div', className || 'builder-copy');
    String(value || '').split(/\r?\n\s*\r?\n/).filter(part => part.trim()).forEach(part => copy.append(node('p', '', part)));
    return copy;
  }

  function action(value, className) {
    const href = safeUrl(value?.href, false);
    const label = String(value?.label || '').trim();
    if (!href || !label) return null;
    const link = node('a', className || 'button primary', label);
    link.href = href;
    return link;
  }

  function heading(section, container) {
    const header = node('div', 'builder-section-heading');
    if (section.eyebrow) header.append(node('p', 'eyebrow', section.eyebrow));
    if (section.title) header.append(node('h2', '', section.title));
    if (section.body) header.append(paragraphCopy(section.body));
    if (header.childNodes.length) container.append(header);
    return header;
  }

  function card(item, gallery) {
    const result = node(gallery ? 'figure' : 'article', gallery ? 'builder-gallery-item' : 'builder-card');
    const image = artwork(item.image, item.title, gallery ? 'builder-gallery-image' : 'builder-card-image');
    const href = safeUrl(item.href, false);
    if (image) {
      if (href) {
        const link = node('a', 'builder-image-link');
        link.href = href;
        link.setAttribute('aria-label', String(item.title || 'Görseli aç'));
        link.append(image);
        result.append(link);
      } else result.append(image);
    }
    const copy = node(gallery ? 'figcaption' : 'div', 'builder-card-copy');
    if (item.title) {
      const title = node('h3');
      if (href) {
        const link = node('a', '', item.title);
        link.href = href;
        title.append(link);
      } else title.textContent = item.title;
      copy.append(title);
    }
    if (item.body) copy.append(paragraphCopy(item.body));
    if (copy.childNodes.length) result.append(copy);
    return result;
  }

  function applySectionLayout(element, layout) {
    for (const viewport of ['desktop', 'mobile']) {
      element.classList.remove('builder-layout-' + viewport, 'builder-layout-fixed-' + viewport);
      for (const property of ['width', 'height', 'left', 'right']) {
        element.style.removeProperty('--builder-layout-' + property + '-' + viewport);
      }
      const value = layout?.[viewport];
      if (!value || typeof value !== 'object') continue;
      const width = Number(value.width);
      if (!Number.isFinite(width) || width < 20 || width > 100) continue;
      element.classList.add('builder-layout-' + viewport);
      element.style.setProperty('--builder-layout-width-' + viewport, Math.round(width) + '%');
      const align = ['left', 'center', 'right'].includes(value.align) ? value.align : 'center';
      element.style.setProperty('--builder-layout-left-' + viewport, align === 'left' ? '0px' : 'auto');
      element.style.setProperty('--builder-layout-right-' + viewport, align === 'right' ? '0px' : 'auto');
      const height = Number(value.height);
      if (Number.isFinite(height) && height >= 200 && height <= 6000) {
        element.classList.add('builder-layout-fixed-' + viewport);
        element.style.setProperty('--builder-layout-height-' + viewport, Math.round(height) + 'px');
      }
    }
  }

  function customSection(section) {
    if (section.kind === 'canvas') {
      const canvas = window.M3CANVAS_VIEW?.render(section);
      if (canvas) applySectionLayout(canvas, section.layout);
      return canvas || null;
    }
    const allowed = new Set(['text', 'imageText', 'cards', 'gallery', 'faq', 'cta']);
    if (!allowed.has(section.kind)) return null;
    const style = section.style || {};
    const result = node('section', 'builder-section builder-' + section.kind);
    result.dataset.builderCustom = section.id;
    result.id = 'bolum-' + String(section.id || '').replace(/[^A-Za-z0-9_-]/g, '');
    result.classList.add('builder-tone-' + (['dark', 'burgundy', 'transparent'].includes(style.tone) ? style.tone : 'dark'));
    result.classList.add('builder-align-' + (style.align === 'center' ? 'center' : 'left'));
    result.classList.add('builder-spacing-' + (['compact', 'normal', 'wide'].includes(style.spacing) ? style.spacing : 'normal'));
    const inner = node('div', 'wrap builder-section-inner');
    result.append(inner);
    const titleId = result.id + '-title';

    if (section.kind === 'imageText') {
      const split = node('div', 'builder-split' + (style.imageSide === 'right' ? ' builder-image-right' : ''));
      const image = artwork(section.image, section.title, 'builder-feature-image');
      const media = node('div', 'builder-feature-media');
      if (image) { media.append(image); split.append(media); split.classList.add('has-image'); }
      const content = node('div', 'builder-feature-copy');
      heading(section, content);
      const link = action(section.button);
      if (link) content.append(link);
      split.append(content);
      inner.append(split);
    } else if (section.kind === 'cta') {
      const image = artwork(section.image, '', 'builder-cta-image');
      if (image) { result.prepend(image); result.classList.add('builder-cta-has-image'); }
      const content = node('div', 'builder-cta-copy');
      heading(section, content);
      inner.append(content);
      const link = action(section.button);
      if (link) inner.append(link);
    } else {
      heading(section, inner);
      const items = Array.isArray(section.items) ? section.items.slice(0, 100) : [];
      if (section.kind === 'cards' || section.kind === 'gallery') {
        const list = node('div', section.kind === 'gallery' ? 'builder-gallery-grid' : 'builder-card-grid');
        items.forEach(item => list.append(card(item, section.kind === 'gallery')));
        if (list.childNodes.length) inner.append(list);
      } else if (section.kind === 'faq') {
        const list = node('div', 'builder-faq-list');
        items.forEach(item => {
          const details = node('details', 'builder-faq-item');
          details.append(node('summary', '', item.title || 'Soru'));
          if (item.body) details.append(paragraphCopy(item.body));
          list.append(details);
        });
        if (list.childNodes.length) inner.append(list);
      }
      const link = action(section.button);
      if (link) inner.append(link);
    }
    const title = result.querySelector('h2');
    if (title) { title.id = titleId; result.setAttribute('aria-labelledby', titleId); }
    applySectionLayout(result, section.layout);
    return result;
  }

  function renderHome() {
    window.M3CANVAS_VIEW?.disposeWithin(home);
    home.querySelectorAll(':scope > [data-builder-custom]').forEach(element => element.remove());
    builtins.forEach(element => { element.hidden = true; applySectionLayout(element); });
    const used = new Set();
    for (const section of builder.home) {
      if (section.kind === 'builtin') {
        const element = builtins.get(section.source);
        if (!element || used.has(section.source)) continue;
        used.add(section.source);
        element.hidden = section.visible === false;
        applySectionLayout(element, section.layout);
        home.append(element);
      } else if (section.visible !== false) {
        const element = customSection(section);
        if (element) home.append(element);
      }
    }
    // Keep the original nodes in the document: legacy filters, tabs, modals and
    // CMS refresh handlers continue to address the same IDs and event listeners.
    builtins.forEach((element, source) => { if (!used.has(source)) home.append(element); });
  }

  function pageSlug(hash) {
    if (!hash.startsWith('#sayfa/')) return null;
    try { return decodeURIComponent(hash.slice(7)); } catch (_) { return ''; }
  }

  function availablePage(slug) {
    return builder.pages.find(page => page.slug === slug && (page.published === true || window.M3CMS.preview === true));
  }

  function navigationEntry(entry) {
    const href = safeUrl(entry.href, false);
    if (entry.visible === false || !href || !String(entry.label || '').trim()) return null;
    try {
      const url = new URL(href, location.href);
      if (url.origin === location.origin && url.pathname === '/' && url.hash.startsWith('#sayfa/') && !availablePage(pageSlug(url.hash))) return null;
    } catch (_) { return null; }
    const link = node('a', '', entry.label);
    link.href = href;
    link.title = entry.label;
    link.dataset.builderNav = entry.id;
    return link;
  }

  function renderNavigation() {
    const entries = builder.navigation.map(entry => ({ entry, link: navigationEntry(entry) })).filter(item => item.link);
    if (desktopNav) {
      desktopNav.classList.add('builder-navigation');
      desktopNav.replaceChildren();
      const inline = entries.length > 5 ? 4 : entries.length;
      entries.slice(0, inline).forEach(({ link }) => desktopNav.append(link));
      if (inline < entries.length) {
        const details = node('details', 'builder-nav-more');
        details.append(node('summary', '', 'Diğer'));
        const menu = node('div', 'builder-nav-more-list');
        entries.slice(inline).forEach(({ entry }) => menu.append(navigationEntry(entry)));
        details.append(menu);
        desktopNav.append(details);
      }
    }
    if (mobileNav) {
      mobileNav.replaceChildren();
      entries.forEach(({ entry }) => mobileNav.append(navigationEntry(entry)));
      if (mobileAccount) mobileNav.append(mobileAccount);
    }
    if (footerNav) {
      footerNav.classList.add('builder-footer-navigation');
      footerNav.replaceChildren();
      entries.forEach(({ entry }) => footerNav.append(navigationEntry(entry)));
    }
    updateCurrentLinks();
  }

  function updateCurrentLinks() {
    const hash = location.hash || '#anasayfa';
    document.querySelectorAll('[data-builder-nav]').forEach(link => {
      const url = new URL(link.href, location.href);
      const matches = url.origin === location.origin && url.pathname === location.pathname && url.hash === hash;
      if (matches) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function renderPage(page) {
    window.M3CANVAS_VIEW?.disposeWithin(pageMain);
    const fragment = document.createDocumentFragment();
    const header = node('header', 'builder-page-header wrap');
    const back = node('a', 'builder-page-back', '← Ana sayfaya dön');
    back.href = '#anasayfa';
    header.append(back);
    const heading = node('h1', '', page.title || 'Yeni sayfa');
    heading.id = 'builder-page-title';
    heading.tabIndex = -1;
    header.append(heading);
    if (page.description) header.append(paragraphCopy(page.description, 'builder-page-description'));
    if (!page.published && window.M3CMS.preview) header.append(node('span', 'builder-draft-label', 'Taslak önizlemesi · Ziyaretçilere kapalı'));
    fragment.append(header);
    for (const section of page.sections) {
      if (section.visible === false || section.kind === 'builtin') continue;
      const element = customSection(section);
      if (element) fragment.append(element);
    }
    pageMain.replaceChildren(fragment);
    document.title = (page.title || 'Sayfa') + ' | Metin3';
  }

  function renderMissingPage() {
    window.M3CANVAS_VIEW?.disposeWithin(pageMain);
    const content = node('section', 'builder-page-missing wrap');
    content.append(node('p', 'eyebrow', 'METIN3 DÜNYASI'));
    const heading = node('h1', '', 'Bu sayfa bulunamadı.');
    heading.id = 'builder-page-title';
    heading.tabIndex = -1;
    content.append(heading, node('p', '', 'Sayfa kaldırılmış veya henüz yayımlanmamış olabilir.'));
    content.append(action({ label: 'Ana sayfaya dön', href: '#anasayfa' }));
    pageMain.replaceChildren(content);
    document.title = 'Sayfa bulunamadı | Metin3';
  }

  function route(focus) {
    const slug = pageSlug(location.hash);
    const leavingPage = onPage && slug === null;
    if (slug !== null) {
      currentPage = availablePage(slug);
      onPage = true;
      home.hidden = true;
      const auth = document.getElementById('auth-main');
      if (auth) auth.hidden = true;
      document.body.classList.remove('auth-open');
      document.body.classList.add('builder-page-open');
      pageMain.hidden = false;
      if (footer) footer.hidden = false;
      if (currentPage) renderPage(currentPage); else renderMissingPage();
      if (focus && !window.M3CMS.preview) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.getElementById('builder-page-title')?.focus({ preventScroll: true });
      }
    } else {
      currentPage = null;
      onPage = false;
      pageMain.hidden = true;
      document.body.classList.remove('builder-page-open');
      if (!authRoutes.has(location.hash)) {
        home.hidden = false;
        if (footer) footer.hidden = false;
        document.title = homeTitle;
        if (focus && (leavingPage || location.hash.startsWith('#bolum-'))) {
          requestAnimationFrame(() => {
            const anchor = document.getElementById(location.hash.slice(1));
            pendingAnchor = !anchor && location.hash.startsWith('#bolum-') ? location.hash : null;
            const target = anchor || home;
            if (!target.hidden) target.scrollIntoView({ behavior: 'instant', block: 'start' });
          });
        }
      }
    }
    updateCurrentLinks();
    window.M3CANVAS_VIEW?.refresh();
  }

  function refresh() {
    const documentData = window.M3CMS.document;
    builder = model.normalize(documentData.builder, documentData);
    renderHome();
    renderNavigation();
    route(false);
    if (pendingAnchor === location.hash && document.getElementById(location.hash.slice(1))) route(true);
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (onPage && event.target.closest('.skip-link')) {
      event.preventDefault();
      document.getElementById('builder-page-title')?.focus();
    }
    const more = desktopNav?.querySelector('.builder-nav-more');
    if (more && (!more.contains(event.target) || event.target.closest('a'))) more.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const more = desktopNav?.querySelector('.builder-nav-more[open]');
      if (more) { more.open = false; more.querySelector('summary')?.focus(); }
    }
  });
  window.M3BUILDER_VIEW = { refresh };
  refresh();
  route(true);
  window.addEventListener('hashchange', () => route(true));
})();

