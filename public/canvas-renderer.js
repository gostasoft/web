/* Public rendering for the fixed-coordinate desktop/mobile canvas. */
(function () {
  'use strict';
  const entries = new Map();
  const mobileQuery = window.matchMedia('(max-width: 720px)');
  const dimensions = { desktop: 1200, mobile: 390 };
  const bounded = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
  const numeric = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const color = (value, fallback) => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
  const mode = () => mobileQuery.matches ? 'mobile' : 'desktop';

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
    } catch (_) { /* Incomplete or unsupported editor URL. */ }
    return '';
  }

  function imageNode(value, alt, className) {
    const source = safeUrl(value?.src, true);
    if (!source) return null;
    const image = document.createElement('img');
    image.className = className;
    image.src = source;
    image.alt = String(alt || '');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    image.style.objectFit = value.fit === 'contain' ? 'contain' : 'cover';
    image.style.objectPosition = numeric(value.x, 0, 100, 50) + '% ' + numeric(value.y, 0, 100, 50) + '%';
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });
    return image;
  }

  function frameRect(value, designWidth, designHeight) {
    const width = bounded(value?.width, 1, designWidth, Math.min(240, designWidth));
    const height = bounded(value?.height, 1, designHeight, Math.min(80, designHeight));
    return {
      width, height,
      x: bounded(value?.x, 0, designWidth - width, 0),
      y: bounded(value?.y, 0, designHeight - height, 0)
    };
  }

  function styleElement(element, value, activeMode) {
    const style = value.style || {};
    element.style.fontSize = numeric(activeMode === 'mobile' ? style.mobileFontSize : style.fontSize, 8, activeMode === 'mobile' ? 100 : 160, 24) + 'px';
    element.style.fontWeight = ['400', '600', '700'].includes(style.fontWeight) ? style.fontWeight : '400';
    element.style.fontFamily = style.fontFamily === 'serif' ? 'var(--serif)' : 'var(--sans)';
    element.style.color = color(style.color, '#F7EDF2');
    element.style.backgroundColor = style.background === 'transparent' ? 'transparent' : color(style.background, 'transparent');
    element.style.borderColor = color(style.borderColor, '#A67C43');
    element.style.borderWidth = numeric(style.borderWidth, 0, 8, 0) + 'px';
    element.style.borderRadius = numeric(style.radius, 0, 100, 0) + 'px';
    element.style.opacity = String(numeric(style.opacity, 0, 100, 100) / 100);
    const align = ['left', 'center', 'right'].includes(style.align) ? style.align : 'left';
    element.style.textAlign = align;
    if (value.type === 'button') element.style.justifyContent = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  }

  function renderElement(value, activeMode, designHeight, index) {
    if (!value || value.visible === false || !['text', 'image', 'button', 'box'].includes(value.type)) return null;
    const href = safeUrl(value.href, false);
    const link = href && (value.type === 'button' || value.type === 'image');
    const element = document.createElement(link ? 'a' : value.type === 'text' ? 'p' : value.type === 'button' ? 'span' : 'div');
    element.className = 'canvas-element canvas-element-' + value.type;
    element.dataset.canvasElement = String(value.id || '');
    if (link) element.href = href;
    if (value.type === 'text' || value.type === 'button') element.textContent = String(value.text || '');
    if (value.type === 'button' && !href) element.setAttribute('aria-disabled', 'true');
    if (value.type === 'box') element.setAttribute('aria-hidden', 'true');
    if (value.type === 'image') {
      const image = imageNode(value.image, value.text || value.name || '', 'canvas-element-image-content');
      if (image) element.append(image);
      else element.setAttribute('aria-hidden', 'true');
    }
    const frame = frameRect(value[activeMode], dimensions[activeMode], designHeight);
    element.style.left = frame.x + 'px';
    element.style.top = frame.y + 'px';
    element.style.width = frame.width + 'px';
    element.style.height = frame.height + 'px';
    element.style.zIndex = String(index + 1);
    styleElement(element, value, activeMode);
    return element;
  }

  function paint(entry, force) {
    if (!entries.has(entry.section) || !entry.section.isConnected) return;
    const width = entry.viewport.getBoundingClientRect().width;
    if (!Number.isFinite(width) || width <= 0) return;
    const activeMode = mode();
    const designHeight = bounded(entry.canvas[activeMode]?.height, 200, 6000, activeMode === 'mobile' ? 800 : 600);
    const modeChanged = entry.mode !== activeMode;
    if (force || modeChanged) {
      const nodes = [];
      const background = imageNode(entry.image, '', 'canvas-background');
      if (background) nodes.push(background);
      entry.canvas.elements.forEach((value, index) => {
        const element = renderElement(value, activeMode, designHeight, index);
        if (element) nodes.push(element);
      });
      entry.stage.replaceChildren(...nodes);
      entry.mode = activeMode;
    }
    if (!force && !modeChanged && entry.width === width && entry.height === designHeight) return;
    entry.width = width;
    entry.height = designHeight;
    const scale = width / dimensions[activeMode];
    entry.stage.style.width = dimensions[activeMode] + 'px';
    entry.stage.style.height = designHeight + 'px';
    entry.stage.style.transform = 'scale(' + scale + ')';
    entry.viewport.style.height = (designHeight * scale) + 'px';
  }

  function render(sectionData) {
    const section = document.createElement('section');
    const style = sectionData.style || {};
    section.className = 'builder-section builder-canvas builder-tone-' + (['dark', 'burgundy', 'transparent'].includes(style.tone) ? style.tone : 'dark');
    section.dataset.builderCustom = String(sectionData.id || '');
    section.id = 'bolum-' + String(sectionData.id || '').replace(/[^A-Za-z0-9_-]/g, '');
    section.setAttribute('aria-label', String(sectionData.title || 'Özel tasarım bölümü'));
    const viewport = document.createElement('div');
    viewport.className = 'canvas-viewport';
    const stage = document.createElement('div');
    stage.className = 'canvas-public-stage';
    viewport.append(stage);
    section.append(viewport);
    const normalized = window.M3CANVAS?.normalizeCanvas ? window.M3CANVAS.normalizeCanvas(sectionData.canvas) : sectionData.canvas;
    const canvas = normalized && typeof normalized === 'object' ? normalized : {};
    const entry = { section, viewport, stage, canvas: { ...canvas, elements: Array.isArray(canvas.elements) ? canvas.elements : [] }, image: sectionData.image, mode: null, width: null, height: null, observer: null };
    entries.set(section, entry);
    if ('ResizeObserver' in window) {
      entry.observer = new ResizeObserver(() => paint(entry, false));
      entry.observer.observe(viewport);
    }
    requestAnimationFrame(() => paint(entry, true));
    return section;
  }

  function disposeWithin(root) {
    for (const [section, entry] of entries) {
      if (section === root || root.contains(section)) {
        entry.observer?.disconnect();
        entries.delete(section);
      }
    }
  }

  function refresh(force) {
    for (const entry of entries.values()) {
      if (!entry.section.isConnected) {
        entry.observer?.disconnect();
        entries.delete(entry.section);
      } else paint(entry, Boolean(force));
    }
  }
  mobileQuery.addEventListener('change', () => refresh(true));
  if (!('ResizeObserver' in window)) window.addEventListener('resize', () => refresh(false));
  window.M3CANVAS_VIEW = { render, disposeWithin, refresh };
})();

