/* Protected-panel visual canvas. All writes use the existing CMS draft/history. */
(function () {
  'use strict';
  const states = new Map();
  let teardown = null;
  const names = { text: 'Yazı', image: 'Görsel', button: 'Buton', box: 'Kutu' };
  const imageUrl = (src) => {
    if (typeof src !== 'string' || !src || /[\u0000-\u0020\\<>"']/.test(src)) return '';
    if (/^(?:\/)?assets\/[A-Za-z0-9._/-]+$/.test(src)) return !src.split('/').includes('..') && !/\.svg$/i.test(src) ? src : '';
    if (/^\/media\/[a-f0-9-]{36}\.(?:png|jpg|webp|avif)$/.test(src)) return src;
    try { const url = new URL(src); return url.protocol === 'https:' && !url.username && !url.password && !/\.svg$/i.test(url.pathname) ? src : ''; } catch { return ''; }
  };
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function control(text, action, className = 'button button-secondary') {
    const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function destroy() { teardown?.(); teardown = null; }
  function mount(host, options) {
    destroy();
    const model = window.M3CANVAS;
    const section = options.section;
    if (!model || !section?.canvas) { host.append(element('p', 'section-note', 'Tasarım araçları yüklenemedi. Sayfayı yenileyebilirsin.')); return; }
    const ui = states.get(section.id) || { device: 'desktop', selected: null, snap: true, grid: true };
    states.set(section.id, ui);
    let disposed = false;
    let observer = null;
    let gesture = null;
    let surface, stage, geometryFields = {};
    let scale = 1;
    const shell = element('div', 'canvas-editor');
    host.append(shell);
    const current = () => options.getSection?.() || section;
    const canvas = () => current().canvas;
    const selected = () => canvas().elements.find((item) => item.id === ui.selected);
    const draftChange = () => { options.changed(); };
    const mutate = (fn) => { options.mutate(fn, false); render(); };
    const total = () => {
      const builder = options.getDocument?.()?.builder;
      return builder ? [...builder.home, ...builder.pages.flatMap(page => page.sections)].reduce((sum, block) => sum + (block.canvas?.elements?.length || 0), 0) : canvas().elements.length;
    };
    function add(type) {
      if (canvas().elements.length >= 50 || total() >= 500) { options.notify('Bir serbest alanda en çok 50, sitede toplam 500 öğe bulunabilir.'); return; }
      const item = model.createElement(type, canvas().elements.length, options.getDocument?.());
      item.desktop = model.clampRect(item.desktop, 'desktop', canvas().desktop.height);
      item.mobile = model.clampRect(item.mobile, 'mobile', canvas().mobile.height);
      mutate(() => { canvas().elements.push(item); ui.selected = item.id; });
    }
    function fit() {
      if (!surface || !stage || disposed) return;
      const logicalWidth = model.widths[ui.device];
      const available = surface.clientWidth;
      if (!available) return;
      scale = Math.min(1, available / logicalWidth);
      stage.style.transform = 'scale(' + scale + ')';
      stage.style.width = logicalWidth + 'px';
      stage.style.height = canvas()[ui.device].height + 'px';
      surface.style.height = Math.ceil(canvas()[ui.device].height * scale) + 'px';
      surface.style.maxWidth = logicalWidth + 'px';
      const label = shell.querySelector('.canvas-scale');
      if (label) label.textContent = logicalWidth + ' px · %' + Math.round(scale * 100) + ' görünüm';
    }
    function makeField(labelText, value, config, apply) {
      const label = element('label', 'canvas-field');
      const caption = element('span', '', labelText);
      const input = element(config?.multiline ? 'textarea' : config?.choices ? 'select' : 'input');
      input.setAttribute('aria-label', labelText);
      if (config?.choices) config.choices.forEach(([key, text]) => { const option = element('option', '', text); option.value = key; input.append(option); });
      else if (!config?.multiline) input.type = config?.type || 'text';
      if (config?.type === 'number') { input.min = config.min; input.max = config.max; input.step = 1; }
      if (config?.maxLength) input.maxLength = config.maxLength;
      if (config?.multiline) input.rows = 4;
      if (config?.disabled) input.disabled = true;
      input.value = value;
      input.addEventListener('focus', options.remember);
      const update = () => {
        const next = config?.type === 'number' ? input.valueAsNumber : input.value;
        if (config?.type === 'number' && !Number.isFinite(next)) return;
        apply(next); draftChange(); renderSurface();
      };
      input.addEventListener(config?.choices || config?.type === 'color' ? 'change' : 'input', update);
      if (config?.type === 'number') input.addEventListener('change', () => {
        update();
        if (config.rectKey && selected()) input.value = selected()[ui.device][config.rectKey];
        else if (config.readValue) input.value = config.readValue();
      });
      label.append(caption, input);
      return { wrapper: label, input };
    }
    function changeFrame(key, value) {
      const item = selected(); if (!item || item.locked) return;
      const frame = { ...item[ui.device], [key]: Math.round(value) };
      // Changing width/height should preserve the requested size by moving the
      // box inside the stage when necessary, rather than quietly clipping it.
      frame.width = Math.min(model.widths[ui.device], Math.max(20, frame.width));
      frame.height = Math.min(canvas()[ui.device].height, Math.max(20, frame.height));
      frame.x = Math.max(0, Math.min(frame.x, model.widths[ui.device] - frame.width));
      frame.y = Math.max(0, Math.min(frame.y, canvas()[ui.device].height - frame.height));
      item[ui.device] = model.clampRect(frame, ui.device, canvas()[ui.device].height);
      syncGeometry();
    }
    function syncGeometry() {
      const frame = selected()?.[ui.device];
      if (!frame) return;
      Object.entries(geometryFields).forEach(([key, input]) => { if (document.activeElement !== input) input.value = frame[key]; });
    }
    function render() {
      if (disposed) return;
      observer?.disconnect();
      shell.replaceChildren();
      const data = canvas();
      if (ui.selected && !data.elements.some(item => item.id === ui.selected)) ui.selected = null;
      const intro = element('div', 'canvas-intro');
      intro.append(element('h3', '', 'Serbest tasarım alanı'), element('p', '', 'Öğe ekle; sürükleyerek taşı ve sağ alt köşesinden boyutlandır. Mobil düzeni ayrı hazırlayabilirsin.'));
      const toolbar = element('div', 'canvas-toolbar');
      const addGroup = element('div', 'canvas-add-tools');
      ['text', 'image', 'button', 'box'].forEach(type => addGroup.append(control('＋ ' + names[type], () => add(type))));
      const devices = element('div', 'segmented canvas-devices'); devices.setAttribute('role', 'group'); devices.setAttribute('aria-label', 'Tasarım ekranı');
      [['desktop', 'Masaüstü tasarımı'], ['mobile', 'Mobil tasarımı']].forEach(([device, text]) => {
        const button = control(text, () => { ui.device = device; render(); }, ui.device === device ? 'active' : '');
        button.setAttribute('aria-pressed', String(ui.device === device)); devices.append(button);
      });
      toolbar.append(addGroup, devices);
      const stageSettings = element('div', 'canvas-stage-settings');
      const height = makeField(ui.device === 'desktop' ? 'Masaüstü alan yüksekliği (px)' : 'Mobil alan yüksekliği (px)', data[ui.device].height, { type: 'number', min: 200, max: 6000, readValue: () => canvas()[ui.device].height }, value => {
        data[ui.device].height = Math.min(6000, Math.max(200, Math.round(value)));
        data.elements.forEach(item => { item[ui.device] = model.clampRect(item[ui.device], ui.device, data[ui.device].height); }); syncGeometry();
      });
      const grid = element('label', 'canvas-checkbox');
      const gridInput = element('input'); gridInput.type = 'checkbox'; gridInput.checked = ui.grid;
      gridInput.addEventListener('change', () => { ui.grid = gridInput.checked; renderSurface(); }); grid.append(gridInput, document.createTextNode('Izgarayı göster'));
      const snap = element('label', 'canvas-checkbox');
      const snapInput = element('input'); snapInput.type = 'checkbox'; snapInput.checked = ui.snap;
      snapInput.addEventListener('change', () => { ui.snap = snapInput.checked; }); snap.append(snapInput, document.createTextNode('10 px ızgaraya hizala'));
      const auto = control('Mobil düzeni otomatik oluştur', () => {
        mutate(() => { model.stackMobile(data); ui.device = 'mobile'; });
        options.notify('Mobil öğeler alt alta yerleştirildi. İstersen tek tek taşıyabilirsin; Geri al ile önceki düzene dönebilirsin.');
      }, 'text-button');
      stageSettings.append(height.wrapper, grid, snap, auto);
      const workbench = element('div', 'canvas-workbench');
      const workspace = element('div', 'canvas-workspace');
      const ruler = element('div', 'canvas-ruler'); ruler.append(element('span', '', ui.device === 'desktop' ? 'MASAÜSTÜ · 1200 PX' : 'MOBİL · 390 PX'), element('span', 'canvas-scale', ''));
      surface = element('div', 'canvas-surface');
      surface.setAttribute('aria-label', 'Serbest yerleşim tuvali');
      stage = element('div', 'canvas-stage');
      surface.append(stage);
      stage.addEventListener('pointerdown', event => { if (event.target === stage) { ui.selected = null; render(); } });
      workspace.append(ruler, surface, element('p', 'canvas-keyboard-help', 'Seçili öğe: ok tuşlarıyla taşı · Shift ile 10 px · Alt + ok ile boyutlandır. Değişiklikleri üstteki Geri al düğmesiyle geri çevirebilirsin.'));
      const inspector = element('aside', 'canvas-inspector'); inspector.setAttribute('aria-label', 'Seçili öğenin özellikleri');
      workbench.append(workspace, inspector);
      shell.append(intro, toolbar, stageSettings, workbench);
      renderInspector(inspector);
      renderLayers();
      const background = element('details', 'canvas-background-settings');
      background.append(element('summary', '', 'Alan arka planı ve rengi'));
      const bgBody = element('div', 'canvas-background-body');
      bgBody.append(makeField('Alan renk tonu', current().style.tone, { choices: [['dark', 'Koyu siyah'], ['burgundy', 'Bordo'], ['transparent', 'Şeffaf']] }, value => { current().style.tone = value; }).wrapper);
      bgBody.append(options.imageEditor('Alan arka planı', [...options.path, 'image'], { onChange: renderSurface }));
      background.append(bgBody); shell.append(background);
      renderSurface();
      observer = new ResizeObserver(fit); observer.observe(surface);
      requestAnimationFrame(fit);
    }
    function renderLayers() {
      const box = element('div', 'canvas-layers');
      const top = element('div', 'canvas-layers-header'); top.append(element('h4', '', 'Katmanlar'), element('span', '', canvas().elements.length + ' / 50 öğe'));
      box.append(top);
      if (!canvas().elements.length) box.append(element('p', 'help-text', 'Alan boş. Yukarıdaki Yazı, Görsel, Buton veya Kutu düğmelerinden birini seç.'));
      [...canvas().elements].reverse().forEach(item => {
        const button = control(item.name + (item.locked ? ' · Kilitli' : '') + (!item.visible ? ' · Gizli' : ''), () => { ui.selected = item.id; render(); }, 'canvas-layer' + (item.id === ui.selected ? ' active' : ''));
        button.setAttribute('aria-pressed', String(item.id === ui.selected)); box.append(button);
      });
      box.append(element('small', 'help-text', 'Listenin üstündeki katman diğer öğelerin önünde görünür.'));
      shell.append(box);
    }
    function renderInspector(inspector) {
      geometryFields = {};
      const item = selected();
      if (!item) { inspector.append(element('h4', '', 'Bir öğe seç'), element('p', 'help-text', 'Tuvaldeki bir öğeye veya Katmanlar listesine tıklayarak içeriğini, konumunu ve görünümünü düzenle.')); return; }
      inspector.append(element('h4', '', names[item.type] + ' özellikleri'));
      const name = makeField('Öğe adı', item.name, { maxLength: 100 }, value => { item.name = value; }); inspector.append(name.wrapper);
      const flags = element('div', 'canvas-flag-tools');
      flags.append(control(item.locked ? 'Kilidi aç' : 'Konumu kilitle', () => mutate(() => { item.locked = !item.locked; }), 'text-button'), control(item.visible ? 'Öğeyi gizle' : 'Öğeyi göster', () => mutate(() => { item.visible = !item.visible; }), 'text-button'));
      inspector.append(flags);
      const frames = element('div', 'canvas-geometry');
      const frame = item[ui.device];
      [['x', 'X konumu (px)', 0, model.widths[ui.device]], ['y', 'Y konumu (px)', 0, canvas()[ui.device].height], ['width', 'Genişlik (px)', 20, model.widths[ui.device]], ['height', 'Yükseklik (px)', 20, canvas()[ui.device].height]].forEach(([key, label, min, max]) => {
        const field = makeField(label, frame[key], { type: 'number', min, max, rectKey: key, disabled: item.locked }, value => changeFrame(key, value));
        geometryFields[key] = field.input; frames.append(field.wrapper);
      });
      inspector.append(element('p', 'canvas-property-group', ui.device === 'desktop' ? 'Masaüstü konumu ve boyutu' : 'Mobil konumu ve boyutu'), frames);
      if (item.type === 'text' || item.type === 'button') {
        inspector.append(makeField(item.type === 'button' ? 'Buton metni' : 'Yazı içeriği', item.text, { multiline: item.type === 'text', maxLength: 4000 }, value => { item.text = value; }).wrapper);
        const fontKey = ui.device === 'desktop' ? 'fontSize' : 'mobileFontSize';
        inspector.append(makeField('Yazı boyutu (px)', item.style[fontKey], { type: 'number', min: 8, max: ui.device === 'desktop' ? 160 : 100, readValue: () => item.style[fontKey] }, value => { item.style[fontKey] = Math.min(ui.device === 'desktop' ? 160 : 100, Math.max(8, Math.round(value))); }).wrapper);
        inspector.append(makeField('Yazı tipi', item.style.fontFamily, { choices: [['serif', 'Oyun başlığı'], ['sans', 'Okunaklı metin']] }, value => { item.style.fontFamily = value; }).wrapper);
        inspector.append(makeField('Yazı kalınlığı', item.style.fontWeight, { choices: [['400', 'Normal'], ['600', 'Yarı kalın'], ['700', 'Kalın']] }, value => { item.style.fontWeight = value; }).wrapper);
        inspector.append(makeField('Yazı hizası', item.style.align, { choices: [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ']] }, value => { item.style.align = value; }).wrapper);
        inspector.append(makeField('Yazı rengi', item.style.color, { type: 'color' }, value => { item.style.color = value; }).wrapper);
      }
      if (item.type === 'button' || item.type === 'image') inspector.append(makeField('Tıklama bağlantısı', item.href, { maxLength: 2048 }, value => { item.href = value; }).wrapper);
      if (item.type === 'image') {
        const index = canvas().elements.indexOf(item);
        inspector.append(options.imageEditor('Öğe görseli', [...options.path, 'canvas', 'elements', index, 'image'], { onChange: renderSurface }));
      }
      if (item.type !== 'image') {
        inspector.append(makeField('Dolgu', item.style.background === 'transparent' ? 'transparent' : 'color', { choices: [['transparent', 'Şeffaf'], ['color', 'Renkli']] }, value => { item.style.background = value === 'transparent' ? 'transparent' : '#30131d'; render(); }).wrapper);
        if (item.style.background !== 'transparent') inspector.append(makeField('Dolgu rengi', item.style.background, { type: 'color' }, value => { item.style.background = value; }).wrapper);
      }
      const decoration = element('div', 'canvas-geometry');
      decoration.append(makeField('Kenar kalınlığı (px)', item.style.borderWidth, { type: 'number', min: 0, max: 8, readValue: () => item.style.borderWidth }, value => { item.style.borderWidth = Math.min(8, Math.max(0, Math.round(value))); }).wrapper,
        makeField('Köşe yuvarlama (px)', item.style.radius, { type: 'number', min: 0, max: 100, readValue: () => item.style.radius }, value => { item.style.radius = Math.min(100, Math.max(0, Math.round(value))); }).wrapper,
        makeField('Görünürlük (%)', item.style.opacity, { type: 'number', min: 0, max: 100, readValue: () => item.style.opacity }, value => { item.style.opacity = Math.min(100, Math.max(0, Math.round(value))); }).wrapper,
        makeField('Kenar rengi', item.style.borderColor, { type: 'color' }, value => { item.style.borderColor = value; }).wrapper);
      inspector.append(element('p', 'canvas-property-group', 'Görünüm'), decoration);
      const actions = element('div', 'canvas-inspector-actions');
      actions.append(control('Öne getir', () => mutate(() => { const list = canvas().elements; list.splice(list.indexOf(item), 1); list.push(item); })), control('Arkaya gönder', () => mutate(() => { const list = canvas().elements; list.splice(list.indexOf(item), 1); list.unshift(item); })));
      actions.append(control('Öğeyi kopyala', () => {
        if (canvas().elements.length >= 50 || total() >= 500) { options.notify('Öğe sınırına ulaşıldı.'); return; }
        const copy = model.duplicateElement(item);
        ['desktop', 'mobile'].forEach(device => { copy[device] = model.clampRect({ ...copy[device], y: copy[device].y + 20 }, device, canvas()[device].height); });
        mutate(() => { canvas().elements.push(copy); ui.selected = copy.id; });
      }));
      actions.append(control('Öğeyi kaldır', () => mutate(() => { const list = canvas().elements; list.splice(list.indexOf(item), 1); ui.selected = null; }), 'text-button builder-danger'));
      inspector.append(actions);
    }
    function paint(item, node) {
      const rect = item[ui.device], style = item.style;
      Object.assign(node.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px', color: style.color, background: style.background, border: style.borderWidth + 'px solid ' + style.borderColor, borderRadius: style.radius + 'px', opacity: String(style.opacity / 100), textAlign: style.align, fontSize: style[ui.device === 'desktop' ? 'fontSize' : 'mobileFontSize'] + 'px', fontWeight: style.fontWeight, fontFamily: style.fontFamily === 'serif' ? 'var(--serif)' : 'var(--sans)' });
    }
    function renderSurface() {
      if (!stage || disposed) return;
      stage.replaceChildren();
      stage.className = 'canvas-stage' + (ui.grid ? ' has-grid' : '') + ' tone-' + current().style.tone;
      const background = imageUrl(current().image?.src);
      stage.style.backgroundImage = background ? 'url(' + JSON.stringify(new URL(background, location.href).href) + ')' : '';
      stage.style.backgroundPosition = (current().image?.x ?? 50) + '% ' + (current().image?.y ?? 50) + '%';
      stage.style.backgroundSize = current().image?.fit === 'contain' ? 'contain' : 'cover';
      canvas().elements.forEach((item, index) => {
        if (!item.visible) return;
        const box = element('div', 'canvas-item canvas-item-' + item.type + (ui.selected === item.id ? ' selected' : '') + (item.locked ? ' locked' : ''));
        box.dataset.canvasElement = item.id;
        box.tabIndex = 0; box.setAttribute('role', 'button'); box.setAttribute('aria-label', item.name + ': seç ve taşı'); box.setAttribute('aria-pressed', String(ui.selected === item.id)); box.style.zIndex = index + 1;
        paint(item, box);
        const content = element('div', 'canvas-item-content');
        if (item.type === 'image') {
          const src = imageUrl(item.image?.src);
          if (src) { const img = element('img'); img.src = src; img.alt = ''; img.draggable = false; img.style.objectFit = item.image.fit || 'cover'; img.style.objectPosition = (item.image.x ?? 50) + '% ' + (item.image.y ?? 50) + '%'; content.append(img); }
          else content.append(element('span', 'canvas-image-placeholder', 'Görsel seç'));
        } else if (item.type !== 'box') content.textContent = item.text;
        if (item.type === 'button') content.style.justifyContent = item.style.align === 'right' ? 'flex-end' : item.style.align === 'left' ? 'flex-start' : 'center';
        box.append(content);
        box.addEventListener('pointerdown', event => startGesture(event, item, false));
        box.addEventListener('keydown', event => keyboard(event, item));
        box.addEventListener('click', () => { if (ui.selected !== item.id) { ui.selected = item.id; render(); } });
        if (ui.selected === item.id) {
          const label = element('span', 'canvas-item-label', item.name + ' · ' + Math.round(item[ui.device].width) + ' × ' + Math.round(item[ui.device].height)); box.append(label);
          if (!item.locked) {
            const handle = element('button', 'canvas-resize-handle'); handle.type = 'button'; handle.setAttribute('aria-label', item.name + ': boyutlandır');
            handle.addEventListener('pointerdown', event => startGesture(event, item, true));
            handle.addEventListener('keydown', event => keyboard(event, item, true));
            box.append(handle);
          }
        }
        stage.append(box);
      });
      fit();
    }
    function startGesture(event, item, resize) {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      if (ui.selected !== item.id) { ui.selected = item.id; render(); }
      if (item.locked) return;
      options.remember();
      gesture = { item, resize, id: event.pointerId, startX: event.clientX, startY: event.clientY, rect: { ...item[ui.device] }, dirty: false, scale };
      // Keep document-level listeners: selecting an item can replace its DOM
      // node on pointerdown, which would invalidate pointer capture.
      document.addEventListener('pointermove', pointerMove);
      document.addEventListener('pointerup', pointerEnd);
      document.addEventListener('pointercancel', pointerCancel);
    }
    function pointerMove(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      event.preventDefault();
      const dx = (event.clientX - gesture.startX) / gesture.scale, dy = (event.clientY - gesture.startY) / gesture.scale;
      const snap = value => Math.round(value / (ui.snap ? 10 : 1)) * (ui.snap ? 10 : 1);
      const before = gesture.rect;
      const next = gesture.resize ? { ...before, width: snap(before.width + dx), height: snap(before.height + dy) } : { ...before, x: snap(before.x + dx), y: snap(before.y + dy) };
      const width = model.widths[ui.device], height = canvas()[ui.device].height;
      if (gesture.resize) { next.width = Math.max(20, Math.min(width - next.x, next.width)); next.height = Math.max(20, Math.min(height - next.y, next.height)); }
      gesture.item[ui.device] = model.clampRect(next, ui.device, height);
      gesture.dirty = JSON.stringify(before) !== JSON.stringify(gesture.item[ui.device]);
      renderSurface(); syncGeometry();
    }
    function removeGestureListeners() {
      document.removeEventListener('pointermove', pointerMove); document.removeEventListener('pointerup', pointerEnd); document.removeEventListener('pointercancel', pointerCancel);
    }
    function pointerEnd(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dirty = gesture.dirty; gesture = null; removeGestureListeners();
      if (dirty) draftChange();
      renderSurface(); syncGeometry();
      stage.querySelector('[data-canvas-element="' + ui.selected + '"]')?.focus({ preventScroll: true });
    }
    function pointerCancel(event) {
      if (!gesture || (event && event.pointerId !== gesture.id)) return;
      gesture.item[ui.device] = gesture.rect; gesture = null; removeGestureListeners(); renderSurface(); syncGeometry();
    }
    function keyboard(event, item, resize = false) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (ui.selected !== item.id) { ui.selected = item.id; render(); }
      if (event.key === 'Enter' || event.key === ' ' || item.locked) return;
      options.remember();
      const step = event.shiftKey ? 10 : 1;
      const changeSize = resize || event.altKey;
      const key = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? (changeSize ? 'width' : 'x') : (changeSize ? 'height' : 'y');
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      changeFrame(key, item[ui.device][key] + step * direction); draftChange(); renderSurface();
      stage.querySelector('[data-canvas-element="' + item.id + '"]')?.focus({ preventScroll: true });
    }
    teardown = () => { if (gesture) pointerCancel(); disposed = true; observer?.disconnect(); removeGestureListeners(); shell.remove(); };
    render();
  }
  window.M3CANVAS_EDITOR = { mount, destroy };
})();
