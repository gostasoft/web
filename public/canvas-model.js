/* Shared, code-free layout model for the freeform site editor. */
(function () {
  'use strict';
  const widths = { desktop: 1200, mobile: 390 };
  const types = ['text', 'image', 'button', 'box'];
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => 'nesne-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
  const number = (value, minimum, maximum, fallback) => Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
  const integer = (value, minimum, maximum, fallback) => Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.round(value))) : fallback;
  const color = (value, fallback, transparent = false) => transparent && value === 'transparent' ? value : /^#[a-f0-9]{6}$/i.test(value || '') ? value : fallback;
  const emptyImage = () => ({ src: '', x: 50, y: 50, fit: 'cover' });
  function defaultsStyle() {
    return { fontSize: 36, mobileFontSize: 28, fontWeight: '600', fontFamily: 'serif', color: '#F5E6C8', background: 'transparent', borderColor: '#A48142', borderWidth: 0, radius: 0, opacity: 100, align: 'left' };
  }
  function createCanvas() {
    return { version: 1, desktop: { height: 800 }, mobile: { height: 1000 }, elements: [] };
  }
  function clampRect(rect, device, height) {
    const designWidth = widths[device] || widths.desktop;
    const designHeight = integer(height, 200, 6000, 800);
    const source = rect && typeof rect === 'object' ? rect : {};
    const width = integer(source.width, 20, designWidth, Math.min(320, designWidth));
    const elementHeight = integer(source.height, 20, designHeight, Math.min(120, designHeight));
    return { x: integer(source.x, 0, designWidth - width, 0), y: integer(source.y, 0, designHeight - elementHeight, 0), width, height: elementHeight };
  }
  function createElement(type = 'text', index = 0, doc) {
    if (!types.includes(type)) type = 'text';
    const offset = integer(index, 0, 49, 0) * 20;
    const names = { text: 'Metin', image: 'Görsel', button: 'Buton', box: 'Kutu' };
    const style = defaultsStyle();
    if (type === 'button') Object.assign(style, { fontSize: 20, mobileFontSize: 18, fontFamily: 'sans', align: 'center', background: '#791C2E', borderWidth: 1, radius: 8 });
    if (type === 'box') Object.assign(style, { background: '#241019', borderWidth: 1, radius: 12 });
    const dimension = type === 'image' ? { width: 480, height: 300 } : type === 'button' ? { width: 240, height: 64 } : type === 'box' ? { width: 400, height: 240 } : { width: 480, height: 120 };
    const mobileDimension = type === 'image' ? { width: 342, height: 220 } : type === 'button' ? { width: 240, height: 60 } : type === 'box' ? { width: 342, height: 200 } : { width: 342, height: 120 };
    return {
      id: uid(), type, name: names[type], visible: true, locked: false,
      text: type === 'text' ? 'Kendi hikâyeni yaz' : type === 'button' ? 'Hemen katıl' : '',
      image: type === 'image' ? copy(doc?.images?.['hero.main'] || { src: 'assets/hero.webp', x: 50, y: 42, fit: 'cover' }) : emptyImage(),
      href: type === 'button' ? '#kayit' : '', style,
      desktop: clampRect({ x: 48 + offset, y: 48 + offset, ...dimension }, 'desktop', 800),
      mobile: clampRect({ x: 24, y: 32 + offset, ...mobileDimension }, 'mobile', 1000)
    };
  }
  function normalizeCanvas(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const canvas = createCanvas();
    for (const device of ['desktop', 'mobile']) canvas[device].height = integer(source[device]?.height, 200, 6000, canvas[device].height);
    const ids = new Set();
    canvas.elements = (Array.isArray(source.elements) ? source.elements : []).slice(0, 50).map((entry, index) => {
      const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
      const element = createElement(item.type, index);
      if (typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(item.id) && !['__proto__', 'prototype', 'constructor'].includes(item.id) && !ids.has(item.id)) element.id = item.id;
      ids.add(element.id);
      if (typeof item.name === 'string') element.name = item.name.slice(0, 100).replace(/\0/g, '');
      if (typeof item.text === 'string') element.text = item.text.slice(0, 4000).replace(/\0/g, '');
      if (typeof item.href === 'string') element.href = item.href.slice(0, 2048).replace(/\0/g, '');
      if (typeof item.visible === 'boolean') element.visible = item.visible;
      if (typeof item.locked === 'boolean') element.locked = item.locked;
      if (item.image && typeof item.image === 'object') element.image = { src: typeof item.image.src === 'string' ? item.image.src.slice(0, 2048) : '', x: number(item.image.x, 0, 100, 50), y: number(item.image.y, 0, 100, 50), fit: item.image.fit === 'contain' ? 'contain' : 'cover' };
      const style = item.style || {};
      element.style = {
        fontSize: number(style.fontSize, 8, 160, element.style.fontSize), mobileFontSize: number(style.mobileFontSize, 8, 100, element.style.mobileFontSize),
        fontWeight: ['400', '600', '700'].includes(style.fontWeight) ? style.fontWeight : element.style.fontWeight,
        fontFamily: ['serif', 'sans'].includes(style.fontFamily) ? style.fontFamily : element.style.fontFamily,
        color: color(style.color, element.style.color), background: color(style.background, element.style.background, true), borderColor: color(style.borderColor, element.style.borderColor),
        borderWidth: number(style.borderWidth, 0, 8, element.style.borderWidth), radius: number(style.radius, 0, 100, element.style.radius), opacity: number(style.opacity, 0, 100, element.style.opacity),
        align: ['left', 'center', 'right'].includes(style.align) ? style.align : element.style.align
      };
      for (const device of ['desktop', 'mobile']) element[device] = clampRect(item[device] || element[device], device, canvas[device].height);
      return element;
    });
    return canvas;
  }
  function duplicateElement(element) {
    const result = copy(element);
    result.id = uid();
    result.name = (String(element.name || 'Nesne').slice(0, 93) + ' kopya').slice(0, 100);
    for (const device of ['desktop', 'mobile']) result[device] = { ...result[device], x: Math.min(widths[device] - result[device].width, result[device].x + 20) };
    return result;
  }
  function stackMobile(canvas) {
    const elements = Array.isArray(canvas.elements) ? canvas.elements : [];
    // Leave enough room for every element; a tall design is shortened evenly
    // before stacking so none is silently dropped below the 6000 px stage cap.
    const visible = elements.filter((element) => element.visible !== false);
    const gap = 20, top = 24;
    const availableHeight = Math.max(20 * visible.length, 6000 - top * 2 - gap * Math.max(0, visible.length - 1));
    const requestedExtra = visible.reduce((sum, element) => sum + Math.max(0, (element.mobile?.height || 120) - 20), 0);
    const extraBudget = Math.max(0, availableHeight - 20 * visible.length);
    const ratio = requestedExtra > extraBudget ? extraBudget / requestedExtra : 1;
    let y = top;
    for (const element of visible) {
      const height = 20 + Math.floor(Math.max(0, (element.mobile?.height || 120) - 20) * ratio);
      const width = Math.min(342, Math.max(20, Math.round(element.mobile?.width || 342)));
      element.mobile = { x: Math.round((widths.mobile - width) / 2), y, width, height };
      y += height + gap;
    }
    canvas.mobile = { height: Math.max(200, Math.min(6000, y + top - gap)) };
    // Hidden objects remain editable and keep their hidden/locked flags, with
    // their saved geometry kept inside the new stage height.
    for (const element of elements) if (element.visible === false) element.mobile = clampRect(element.mobile, 'mobile', canvas.mobile.height);
    return canvas;
  }
  window.M3CANVAS = { widths, createCanvas, createElement, clampRect, normalizeCanvas, stackMobile, defaultsStyle, duplicateElement };
})();
