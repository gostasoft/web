(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sections = [
    { id: 'genel', label: 'Genel & Metinler', title: 'Dünyanı yönet.', description: 'Menülerden ana sayfaya, sitenin bütün metinlerini tek yerden düzenle.', icon: 'grid' },
    { id: 'gorseller', label: 'Görseller', title: 'Hikâyene bir yüz ver.', description: 'Logonu, ana sahneyi ve arka planları değiştir. Her görselin kadrajını ayrı ayarla.', icon: 'image' },
    { id: 'haberler', label: 'Haberler', title: 'Yeni bir haberin var.', description: 'Duyurularını ve rehberlerini hazırla; kartlarını istediğin sıraya getir.', icon: 'news', collection: 'news' },
    { id: 'siniflar', label: 'Karakter Sınıfları', title: 'Efsanenin kahramanları.', description: 'Karakter görsellerini, sınıf sembollerini ve açıklamalarını düzenle.', icon: 'sword', collection: 'classes' },
    { id: 'dunya', label: 'Dünya Galerisi', title: 'Dünyanın kapılarını aç.', description: 'Oyunun atmosferini anlatan sahneleri, başlıkları ve açıklamaları seç.', icon: 'world', collection: 'worlds' },
    { id: 'sorular', label: 'Sık Sorulanlar', title: 'Her soruya bir yanıt.', description: 'Oyuncuların aradığı bilgileri kısa, anlaşılır yanıtlarla paylaş.', icon: 'help', collection: 'faq' },
    { id: 'hesap', label: 'Giriş ve Kayıt', title: 'İlk adımı sen tasarla.', description: 'Giriş ve kayıt ekranlarının metinlerini ve karakter sahnelerini düzenle.', icon: 'account' },
    { id: 'baglantilar', label: 'Bağlantılar', title: 'Doğru yere yönlendir.', description: 'İndirme, topluluk ve destek bağlantılarını buradan güncelle.', icon: 'link' },
  ];
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L6 21"/>',
    news: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',
    sword: '<path d="m14 3 7 0 0 7-12 12-7-7L14 3ZM4 13l7 7M3 21l4-4M15 8l-7 7"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.2.9-1.7 1.1-1.7 2.7M12 17h.01"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(0 -1)"/>',
  };
  const state = { data: null, saved: null, revision: null, dirty: false, saving: false, uploads: 0, history: [], section: 'genel', authMode: 'login', previewOpen: false, previewLoaded: false, previewTimer: null, toastTimer: null, authorized: false, expanded: new Set(), filter: '' };
  let fieldIndex = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function icon(name) {
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapper.setAttribute('viewBox', '0 0 24 24');
    wrapper.setAttribute('fill', 'none');
    wrapper.setAttribute('stroke-width', '1.4');
    wrapper.setAttribute('stroke-linecap', 'round');
    wrapper.setAttribute('stroke-linejoin', 'round');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = icons[name] || icons.grid;
    return wrapper;
  }
  function button(label, className, handler) {
    const node = el('button', className, label);
    node.type = 'button';
    if (handler) node.addEventListener('click', handler);
    return node;
  }
  function get(path, root = state.data) {
    return path.reduce((value, key) => value?.[key], root);
  }
  function set(path, value) {
    let target = state.data;
    path.slice(0, -1).forEach((key) => {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    });
    target[path[path.length - 1]] = value;
  }
  function remember() {
    const snapshot = JSON.stringify(state.data);
    if (state.history.at(-1) !== snapshot) {
      state.history.push(snapshot);
      if (state.history.length > 40) state.history.shift();
    }
  }
  function changed() {
    state.dirty = JSON.stringify(state.data) !== state.saved;
    updateStatus();
    clearTimeout(state.previewTimer);
    state.previewTimer = setTimeout(sendPreview, 250);
  }
  function mutate(fn, rerender = true) {
    remember();
    fn();
    changed();
    if (rerender) renderSection();
  }
  function updateStatus() {
    const node = $('save-state');
    node.className = `save-state${state.dirty ? ' dirty' : ''}${state.saving ? ' saving' : ''}`;
    node.replaceChildren(el('i'), document.createTextNode(state.saving ? 'Kaydediliyor…' : state.uploads ? 'Görsel yükleniyor…' : state.dirty ? 'Kaydedilmemiş değişiklikler' : 'Tüm değişiklikler kaydedildi'));
    $('save-button').disabled = !state.dirty || state.saving || state.uploads > 0;
    $('save-button').textContent = state.saving ? 'Kaydediliyor…' : '✓  Siteyi Kaydet';
    $('undo-button').disabled = !state.history.length || state.saving;
    $('reset-button').disabled = !state.dirty || state.saving;
    $('revision-label').textContent = state.revision === null || state.revision === undefined ? 'Henüz özel içerik kaydedilmedi' : `İçerik sürümü · ${String(state.revision).slice(0, 20)}`;
  }
  function notify(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5500);
  }
  function notice(message, actions = []) {
    const node = $('notice');
    node.replaceChildren(el('p', '', message));
    if (actions.length) {
      const controls = el('div', 'notice-actions');
      actions.forEach(({ label, handler }) => controls.append(button(label, 'button button-secondary', handler)));
      node.append(controls);
    }
    node.hidden = false;
  }
  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
    let result;
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok) {
      const err = new Error(result.message || result.error?.message || (typeof result.error === 'string' ? result.error : '') || `İstek tamamlanamadı (${response.status}).`);
      err.status = response.status;
      err.result = result;
      throw err;
    }
    return result;
  }
  function normalize(data) {
    const doc = clone(data || window.M3CMS_DEFAULTS || {});
    doc.version = 1;
    doc.texts ||= {};
    doc.images ||= {};
    doc.links ||= {};
    doc.content ||= {};
    ['news', 'classes', 'worlds', 'faq'].forEach((key) => { if (!Array.isArray(doc.content[key])) doc.content[key] = []; });
    doc.auth ||= {};
    doc.auth.login ||= { eyebrow: '', title: '', description: '' };
    doc.auth.register ||= { eyebrow: '', title: '', description: '' };
    return doc;
  }
  function accessError(error) {
    $('access-loader').hidden = true;
    $('access-screen').hidden = false;
    $('admin-shell').hidden = true;
    const authError = error.status === 401 || error.status === 403;
    $('access-title').textContent = error.status === 403 ? 'Bu alan site yöneticisine ait.' : authError ? 'Yönetim merkezine hoş geldin.' : 'Yönetim alanına ulaşılamadı.';
    $('access-description').textContent = authError ? (error.status === 403 ? 'Bu hesap site içeriğini düzenleme yetkisine sahip değil. Site sahibi ChatGPT hesabıyla giriş yap.' : 'Site içeriğini düzenlemek için yetkili ChatGPT hesabınla güvenli giriş yap.') : 'Kayıtlı içerik yüklenemedi. Bağlantını kontrol edip yeniden deneyebilirsin.';
    const actions = $('access-actions');
    actions.hidden = false;
    actions.replaceChildren();
    if (authError) {
      const signin = el('a', 'button button-primary', 'ChatGPT ile giriş yap');
      signin.href = '/signin-with-chatgpt?return_to=%2Fadmin';
      signin.target = '_top';
      actions.append(signin);
    } else actions.append(button('Yeniden dene', 'button button-primary', initialize));
    const home = el('a', 'button button-secondary', 'Siteye dön');
    home.href = '/';
    actions.append(home);
  }
  async function initialize() {
    $('access-loader').hidden = false;
    $('access-actions').hidden = true;
    $('access-title').textContent = 'Yönetim alanın hazırlanıyor.';
    $('access-description').textContent = 'Yetkiniz ve kayıtlı site içeriği kontrol ediliyor.';
    try {
      const session = await api('/api/admin/session');
      if (!session.authorized) throw Object.assign(new Error('Yönetici girişi gerekiyor.'), { status: 401 });
      const payload = await api('/api/admin/content');
      if (!payload.data && !window.M3CMS_DEFAULTS) throw new Error('Varsayılan site içeriği yüklenemedi.');
      state.data = normalize(payload.data);
      state.saved = JSON.stringify(state.data);
      state.revision = payload.revision ?? session.revision ?? 0;
      state.authorized = true;
      state.dirty = false;
      state.history = [];
      const user = session.user || {};
      $('user-name').textContent = user.displayName || 'Site yöneticisi';
      $('user-email').textContent = user.email || 'Yetkili ChatGPT oturumu';
      $('user-avatar').textContent = (user.displayName || user.email || 'M').charAt(0).toLocaleUpperCase('tr-TR');
      $('access-screen').hidden = true;
      $('admin-shell').hidden = false;
      renderNav();
      goTo(location.hash.replace('#', '') || 'genel', false);
      updateStatus();
    } catch (error) { accessError(error); }
  }

  function renderNav() {
    const nav = $('admin-nav');
    nav.replaceChildren();
    sections.forEach((section) => {
      const link = el('a', `nav-item${section.id === state.section ? ' active' : ''}`);
      link.href = `#${section.id}`;
      link.append(icon(section.icon), el('span', '', section.label));
      if (section.id === state.section) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', (event) => { event.preventDefault(); goTo(section.id); });
      nav.append(link);
    });
  }
  function goTo(id, updateHash = true) {
    const section = sections.find((item) => item.id === id) || sections[0];
    state.section = section.id;
    state.filter = '';
    if (updateHash) history.replaceState(null, '', `#${section.id}`);
    renderNav();
    renderSection();
    closeMenu();
    if (state.previewOpen) loadPreview();
  }
  function renderSummary() {
    const container = $('summary-grid');
    container.replaceChildren();
    [
      ['Haber & duyuru', state.data.content.news.length, 'news'],
      ['Karakter sınıfı', state.data.content.classes.length, 'sword'],
      ['Dünya sahnesi', state.data.content.worlds.length, 'world'],
      ['Kayıtlı görsel alanı', Object.keys(state.data.images).length, 'image'],
    ].forEach(([label, count, iconName]) => {
      const card = el('div', 'summary-card');
      card.append(el('span', '', label), el('strong', '', String(count).padStart(2, '0')), icon(iconName));
      container.append(card);
    });
  }
  function card(title, description = '', number) {
    const container = el('section', 'editor-card');
    const heading = el('div', 'card-heading');
    const copy = el('div');
    copy.append(el('h2', '', title));
    if (description) copy.append(el('p', '', description));
    heading.append(copy);
    if (number) heading.append(el('span', 'card-number', String(number).padStart(2, '0')));
    const body = el('div', 'card-body');
    container.append(heading, body);
    return { container, body };
  }
  function field(label, path, options = {}) {
    const wrapper = el('div', `field${options.multiline || options.full ? ' full' : ''}`);
    const id = `cms-field-${++fieldIndex}`;
    const caption = el('label', '', label);
    caption.htmlFor = id;
    const input = el(options.multiline ? 'textarea' : options.select ? 'select' : 'input');
    input.id = id;
    input.name = path.join('.');
    if (input.tagName === 'INPUT') input.type = options.type || 'text';
    if (options.select) options.select.forEach(([value, text]) => {
      const option = el('option', '', text);
      option.value = value;
      input.append(option);
    });
    const value = get(path);
    input.value = options.paragraphs && Array.isArray(value) ? value.join('\n\n') : value ?? '';
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.multiline) input.rows = options.rows || 3;
    if (options.maxLength) input.maxLength = options.maxLength;
    input.addEventListener('focus', remember);
    const eventName = options.select ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      set(path, options.paragraphs ? input.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : input.value);
      if (options.onInput) options.onInput(input.value);
      changed();
    });
    wrapper.append(caption, input);
    if (options.help) wrapper.append(el('small', '', options.help));
    return { wrapper, input };
  }
  function fieldsDeclarations(type) {
    return Array.isArray(window.M3CMS_FIELDS?.[type]) ? window.M3CMS_FIELDS[type] : [];
  }
  function renderSection() {
    if (!state.data) return;
    const section = sections.find((item) => item.id === state.section);
    $('section-title').textContent = section.title;
    $('section-description').textContent = section.description;
    $('breadcrumb-current').textContent = section.label;
    $('section-label').textContent = section.label.toLocaleUpperCase('tr-TR');
    const container = $('section-content');
    container.replaceChildren();
    renderSummary();
    if (section.collection) renderCollection(section.collection, container);
    else if (section.id === 'genel') renderTexts(container);
    else if (section.id === 'gorseller') renderImages(container);
    else if (section.id === 'hesap') renderAuth(container);
    else if (section.id === 'baglantilar') renderLinks(container);
    updateStatus();
  }
  function renderTexts(container) {
    const declared = fieldsDeclarations('texts');
    const fields = declared.length ? declared : Object.keys(state.data.texts).map((key) => ({ key, label: key, group: 'Site metinleri', multiline: /title|description|note|caption/.test(key) }));
    const groups = new Map();
    fields.forEach((definition) => {
      if (/^auth\./.test(definition.key)) return;
      const name = definition.group || 'Site metinleri';
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(definition);
    });
    const search = el('div', 'filter-row');
    const input = el('input', 'filter-input');
    input.type = 'search'; input.placeholder = 'Bir metin alanı ara…'; input.setAttribute('aria-label', 'Metin alanlarını ara'); input.value = state.filter;
    const count = el('span', 'filter-count');
    search.append(input, count); container.append(search);
    const cards = [];
    let number = 0;
    groups.forEach((definitions, group) => {
      const block = card(group, 'Yazdığın metinler mevcut tasarımın içinde görüntülenir.', ++number);
      const grid = el('div', 'field-grid');
      const rows = [];
      definitions.forEach((definition) => {
        const node = field(definition.label || definition.key, ['texts', definition.key], { multiline: !!definition.multiline, full: !!definition.multiline, maxLength: 6000 });
        grid.append(node.wrapper);
        rows.push({ node: node.wrapper, search: `${definition.label} ${group} ${definition.key}`.toLocaleLowerCase('tr-TR') });
      });
      block.body.append(grid); container.append(block.container); cards.push({ block: block.container, rows });
    });
    const filter = () => {
      state.filter = input.value;
      const term = input.value.trim().toLocaleLowerCase('tr-TR');
      let visible = 0;
      cards.forEach(({ block, rows }) => {
        rows.forEach((row) => { row.node.hidden = !row.search.includes(term); if (!row.node.hidden) visible++; });
        block.hidden = rows.every((row) => row.node.hidden);
      });
      count.textContent = `${visible} alan`;
    };
    input.addEventListener('input', filter); filter();
    if (!groups.size) container.append(el('p', 'section-note', 'Bu sürüm için henüz düzenlenebilir bir metin alanı tanımlanmamış.'));
  }

  function safeImageSrc(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const parsed = new URL(value, location.origin + '/');
      if (parsed.protocol !== 'https:' && parsed.origin !== location.origin) return '';
      if (!['https:', 'http:'].includes(parsed.protocol)) return '';
      return parsed.href;
    } catch { return ''; }
  }
  function imageEditor(label, path, options = {}) {
    const wrapper = el('div', 'image-editor');
    const stage = el('div', 'image-stage');
    const picture = el('img'); picture.alt = `${label} önizlemesi`;
    const empty = el('span', 'empty-image', 'Henüz bir görsel seçilmedi.');
    const imageError = el('span', 'image-error', 'Görsel yüklenemedi. Adresi kontrol et.'); imageError.hidden = true;
    stage.append(empty, picture, imageError);
    const controls = el('div', 'image-fields');
    const srcPath = options.stringValue ? path : [...path, 'src'];
    const source = field('Görsel adresi', srcPath, { placeholder: 'HTTPS adresi veya /assets/…', maxLength: 2048, onInput: refreshImage });
    controls.append(source.wrapper);
    const uploadRow = el('div', 'upload-row');
    const uploadLabel = el('label', 'upload-button', '↑  Görsel yükle');
    const upload = el('input'); upload.type = 'file'; upload.accept = 'image/png,image/jpeg,image/webp,image/avif'; upload.setAttribute('aria-label', `${label}: görsel yükle`);
    uploadLabel.append(upload);
    const status = el('span', 'upload-hint', 'PNG, JPG, WebP, AVIF · En çok 10 MB');
    uploadRow.append(uploadLabel, status);
    const defaultValue = get(path, window.M3CMS_DEFAULTS || {});
    if (defaultValue) uploadRow.append(button('Varsayılanı kullan', 'text-button', () => {
      mutate(() => set(path, clone(defaultValue)), false);
      source.input.value = get(srcPath) || '';
      refreshImage();
      syncSliders();
      notify('Varsayılan görsel taslağa uygulandı. Kaydettiğinde sitede görünür.');
    }));
    controls.append(uploadRow);
    let sliders = [];
    let fitInput;
    if (!options.stringValue) {
      const focal = el('div', 'focal-fields');
      ['x', 'y'].forEach((axis) => {
        const control = el('div', 'range-control');
        const sliderId = `cms-field-${++fieldIndex}`;
        const rangeLabel = el('label', 'range-label', axis === 'x' ? 'Yatay odak' : 'Dikey odak'); rangeLabel.htmlFor = sliderId;
        const output = el('output', '', `${get([...path, axis]) ?? 50}%`); output.htmlFor = sliderId; rangeLabel.append(output);
        const slider = el('input'); slider.type = 'range'; slider.id = sliderId; slider.min = '0'; slider.max = '100'; slider.step = '1'; slider.value = get([...path, axis]) ?? 50;
        slider.addEventListener('pointerdown', remember); slider.addEventListener('focus', remember);
        slider.addEventListener('input', () => { set([...path, axis], Number(slider.value)); output.value = `${slider.value}%`; refreshImage(); changed(); });
        control.append(rangeLabel, slider); focal.append(control);
        sliders.push({ axis, slider, output });
      });
      const fit = field('Yerleşim', [...path, 'fit'], { select: [['cover', 'Alanı kapla'], ['contain', 'Tamamını göster']], onInput: refreshImage });
      fit.input.value = get([...path, 'fit']) || 'cover'; fitInput = fit.input; focal.append(fit.wrapper);
      controls.append(focal);
    }
    function syncSliders() {
      sliders.forEach(({ axis, slider, output }) => { slider.value = get([...path, axis]) ?? 50; output.value = `${slider.value}%`; });
      if (fitInput) fitInput.value = get([...path, 'fit']) || 'cover';
    }
    function refreshImage() {
      const src = safeImageSrc(get(srcPath));
      picture.hidden = !src; empty.hidden = !!src; imageError.hidden = true;
      if (src) picture.src = src; else picture.removeAttribute('src');
      stage.dataset.fit = options.stringValue ? (options.contain ? 'contain' : 'cover') : get([...path, 'fit']) || 'cover';
      picture.style.objectPosition = `${get([...path, 'x']) ?? 50}% ${get([...path, 'y']) ?? 50}%`;
    }
    picture.addEventListener('error', () => { if (picture.src) imageError.hidden = false; });
    picture.addEventListener('load', () => { imageError.hidden = true; });
    upload.addEventListener('change', async () => {
      const file = upload.files?.[0];
      if (!file) return;
      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
      if (!allowed.includes(file.type)) { notify('PNG, JPG, WebP veya AVIF biçiminde bir görsel seç.'); upload.value = ''; return; }
      if (file.size > 10 * 1024 * 1024) { notify('Bu görsel 10 MB sınırını aşıyor. Daha küçük bir dosya seç.'); upload.value = ''; return; }
      state.uploads++; updateStatus(); upload.disabled = true; status.textContent = 'Görsel sunucuya yükleniyor…';
      const originalPathValue = clone(get(path) ?? null);
      const originalDoc = state.data;
      try {
        const form = new FormData(); form.append('file', file);
        const result = await api('/api/admin/upload', { method: 'POST', body: form });
        if (!result.url || !safeImageSrc(result.url)) throw new Error('Sunucu geçerli bir görsel adresi döndürmedi.');
        if (state.data !== originalDoc || JSON.stringify(get(path) ?? null) !== JSON.stringify(originalPathValue)) {
          notify('Yükleme sırasında alan değişti; yanlış görsele uygulanmaması için tekrar yükleyebilirsin.');
          status.textContent = 'Alan değişti; görsel taslağa eklenmedi.';
          return;
        }
        mutate(() => set(srcPath, result.url), false);
        source.input.value = result.url; refreshImage();
        status.textContent = `${result.name || file.name} · Yüklendi`;
        notify('Görsel yüklendi. Siteye uygulamak için Siteyi Kaydet düğmesini kullan.');
      } catch (error) {
        status.textContent = 'Yükleme tamamlanamadı. Tekrar deneyebilirsin.';
        handleAuthFailure(error);
        notify(`Görsel yüklenemedi: ${error.message}`);
      } finally { state.uploads--; updateStatus(); upload.disabled = false; upload.value = ''; }
    });
    wrapper.append(stage, controls); refreshImage();
    return wrapper;
  }
  function renderImages(container) {
    const declared = fieldsDeclarations('images');
    const definitions = declared.length ? declared : Object.keys(state.data.images).map((key) => ({ key, label: key, group: 'Site görselleri' }));
    container.append(el('p', 'section-note', 'Görseller sunucuya yüklenir ve kayıttan sonra tüm ziyaretçiler için değişir. Kaydını tamamlayana kadar değişiklikler taslak olarak kalır.'));
    definitions.forEach((definition, index) => {
      const block = card(definition.label || definition.key, definition.group || '', index + 1);
      block.body.append(imageEditor(definition.label || definition.key, ['images', definition.key]));
      container.append(block.container);
    });
    if (!definitions.length) container.append(el('p', 'section-note', 'Bu sürüm için henüz görsel alanı tanımlanmamış.'));
  }
  const collectionSchemas = {
    news: { singular: 'haber', add: 'Haber ekle', title: 'Haberler & duyurular', limit: 100, fields: [
      ['title', 'Haber başlığı'], ['category', 'Kategori'], ['excerpt', 'Kısa açıklama', true], ['readTime', 'Okuma süresi'], ['id', 'Bağlantı adı'], ['body', 'Haber metni', true, true],
    ], defaults: () => ({ id: uniqueId('news', 'haber'), title: 'Yeni haber', category: 'Duyuru', excerpt: '', readTime: '2 dk', img: state.data.content.news[0]?.img || 'assets/world-fortress.webp', body: [] }) },
    classes: { singular: 'sınıf', add: 'Sınıf ekle', title: 'Karakter sınıfları', limit: 16, minimum: 1, fields: [
      ['name', 'Sınıf adı'], ['id', 'Sınıf kimliği'], ['eyebrow', 'Üst başlık'], ['headline', 'Ana başlık'], ['description', 'Sınıf açıklaması', true], ['style', 'Dövüş tarzı'], ['classNote', 'Sınıf özellikleri'],
    ], defaults: () => ({ id: uniqueId('classes', 'sinif'), name: 'Yeni sınıf', eyebrow: '', headline: '', description: '', style: '', classNote: '', img: state.data.content.classes[0]?.img || 'assets/class-warrior.webp', ...(state.data.content.classes[0]?.symbol ? { symbol: state.data.content.classes[0].symbol } : {}) }) },
    worlds: { singular: 'sahne', add: 'Sahne ekle', title: 'Dünya galerisi', limit: 30, minimum: 1, fields: [
      ['title', 'Sahne başlığı'], ['number', 'Görünen sıra numarası'], ['eyebrow', 'Üst başlık'], ['id', 'Sahne kimliği'], ['description', 'Sahne açıklaması', true],
    ], defaults: () => ({ id: uniqueId('worlds', 'sahne'), title: 'Yeni sahne', number: String(state.data.content.worlds.length + 1).padStart(2, '0'), eyebrow: '', description: '', img: state.data.content.worlds[0]?.img || 'assets/world-village.webp' }) },
    faq: { singular: 'soru', add: 'Soru ekle', title: 'Sık sorulan sorular', limit: 100, fields: [['question', 'Soru'], ['answer', 'Yanıt', true]], defaults: () => ({ question: 'Yeni soru', answer: '' }) },
  };
  function uniqueId(collection, prefix) {
    const ids = new Set(state.data.content[collection].map((entry) => entry.id));
    let suffix = 1;
    while (ids.has(`${prefix}-${suffix}`)) suffix++;
    return `${prefix}-${suffix}`;
  }
  function renderCollection(key, container) {
    const schema = collectionSchemas[key];
    const entries = state.data.content[key];
    const toolbar = el('div', 'collection-toolbar');
    toolbar.append(el('p', '', `${entries.length} ${schema.singular} · Yukarı ve aşağı oklarla sıralayabilirsin.`));
    toolbar.append(button(`＋ ${schema.add}`, 'button button-secondary', () => {
      if (entries.length >= schema.limit) { notify(`Bu bölümde en çok ${schema.limit} kayıt bulunabilir.`); return; }
      mutate(() => { entries.push(schema.defaults()); state.expanded.add(`${key}:${entries.length - 1}`); });
    }));
    container.append(toolbar);
    if (!entries.length) container.append(el('div', 'collection-empty', `İlk ${schema.singular} içeriğini ekleyerek başla.`));
    entries.forEach((item, index) => {
      const itemKey = `${key}:${index}`;
      const expanded = state.expanded.has(itemKey);
      const row = el('section', 'collection-item');
      const summary = el('div', 'collection-summary');
      summary.append(el('span', 'collection-index', String(index + 1).padStart(2, '0')));
      if (item.img) {
        const image = el('img', 'collection-thumbnail'); image.alt = ''; image.src = safeImageSrc(item.img); image.loading = 'lazy'; summary.append(image);
      }
      const title = el('div', 'collection-title');
      const titleText = el('strong', '', item.title || item.name || item.question || `Yeni ${schema.singular}`);
      title.append(titleText, el('span', '', key === 'news' ? item.category || 'Kategori belirtilmedi' : key === 'classes' ? item.style || 'Karakter sınıfı' : key === 'faq' ? 'Soru & yanıt' : item.eyebrow || 'Dünya sahnesi'));
      summary.append(title);
      const actions = el('div', 'collection-actions');
      const up = button('↑', 'icon-button', () => reorder(-1)); up.disabled = index === 0; up.setAttribute('aria-label', `${titleText.textContent}: yukarı taşı`);
      const down = button('↓', 'icon-button', () => reorder(1)); down.disabled = index === entries.length - 1; down.setAttribute('aria-label', `${titleText.textContent}: aşağı taşı`);
      const edit = button(expanded ? 'Kapat' : 'Düzenle', 'button collection-edit', () => {
        if (state.expanded.has(itemKey)) state.expanded.delete(itemKey); else state.expanded.add(itemKey);
        renderSection();
      }); edit.setAttribute('aria-expanded', String(expanded));
      const remove = button('×', 'icon-button remove-button', () => {
        if (entries.length <= (schema.minimum || 0)) { notify('Bu bölümde en az bir kayıt bulunmalı.'); return; }
        mutate(() => { entries.splice(index, 1); state.expanded.clear(); });
        notify(`${schema.singular.charAt(0).toLocaleUpperCase('tr-TR') + schema.singular.slice(1)} taslaktan çıkarıldı. Geri al düğmesiyle geri getirebilirsin.`);
      }); remove.setAttribute('aria-label', `${titleText.textContent}: kaldır`);
      if (entries.length <= (schema.minimum || 0)) { remove.disabled = true; remove.title = 'Bu bölümde en az bir kayıt bulunmalı.'; }
      actions.append(up, down, edit, remove); summary.append(actions); row.append(summary);
      function reorder(direction) {
        mutate(() => {
          const destination = index + direction;
          [entries[index], entries[destination]] = [entries[destination], entries[index]];
          state.expanded.clear();
          if (expanded) state.expanded.add(`${key}:${destination}`);
        });
      }
      if (expanded) {
        const body = el('div', 'collection-fields');
        const grid = el('div', 'field-grid');
        schema.fields.forEach(([property, label, multiline, paragraphs]) => {
          const node = field(label, ['content', key, index, property], { multiline: !!multiline, paragraphs: !!paragraphs, maxLength: paragraphs ? 30000 : property === 'id' ? 100 : ['description', 'answer'].includes(property) ? 12000 : 4000, help: paragraphs ? 'Her paragrafın arasında bir boş satır bırak.' : property === 'id' ? 'Kısa ve benzersiz bir ad kullan; örneğin yeni-yolculuk. Yalnızca harf, sayı, tire ve alt çizgi.' : '', onInput: (value) => { if (['title', 'name', 'question'].includes(property)) titleText.textContent = value || `Yeni ${schema.singular}`; } });
          grid.append(node.wrapper);
        });
        body.append(grid);
        if (key !== 'faq') {
          const imageTitle = el('span', 'field-label', key === 'classes' ? 'Karakter görseli' : 'Kart görseli');
          body.append(imageTitle, imageEditor('İçerik görseli', ['content', key, index, 'img'], { stringValue: true }));
        }
        if (key === 'classes') body.append(el('span', 'field-label', 'Sınıf sembolü'), imageEditor('Sınıf sembolü', ['content', key, index, 'symbol'], { stringValue: true, contain: true }));
        row.append(body);
      }
      container.append(row);
    });
  }
  function renderAuth(container) {
    const note = el('p', 'screen-note');
    note.append(el('strong', '', 'Görsel yönetimi burada. '), document.createTextNode('Oyuncu ekranlarında artık görsel düzenleme alanı bulunmaz. Bu bölüm yalnızca ekran tasarımını düzenler; oyuncu hesabı servisi ayrı olarak bağlanır.'));
    container.append(note);
    const tabs = el('div', 'auth-tabs');
    [['login', 'Giriş Yap'], ['register', 'Kayıt Ol']].forEach(([mode, label]) => {
      const tab = button(label, mode === state.authMode ? 'active' : '', () => { state.authMode = mode; renderSection(); if (state.previewOpen) loadPreview(); });
      tab.setAttribute('aria-pressed', String(mode === state.authMode)); tabs.append(tab);
    }); container.append(tabs);
    const mode = state.authMode;
    const display = mode === 'login' ? 'Giriş' : 'Kayıt';
    const formBlock = card(`${display} formu metinleri`, 'Sağ taraftaki formun üstünde görünen başlık ve açıklama.', 1);
    formBlock.body.append(field('Form başlığı', ['texts', `auth.${mode}.title`], { maxLength: 4000 }).wrapper, field('Form açıklaması', ['texts', `auth.${mode}.description`], { multiline: true, maxLength: 4000 }).wrapper);
    container.append(formBlock.container);
    const block = card(`${display} ekranı sahne metinleri`, 'Sol görselin üstündeki metinler. Başlıkta yeni satır için Enter tuşunu kullan.', 2);
    const grid = el('div', 'field-grid');
    [['eyebrow', 'Üst başlık', false], ['title', 'Ana başlık', true], ['description', 'Açıklama', true]].forEach(([property, label, multiline]) => {
      const node = field(label, ['auth', mode, property], { multiline, full: true, maxLength: 4000 });
      grid.append(node.wrapper);
    });
    block.body.append(grid); container.append(block.container);
    const imageKey = `auth.${mode}`;
    const imageBlock = card(`${display} ekranı karakter sahnesi`, 'Görseli yükle, kadrajını ayarla ve önizlemede kontrol et.', 3);
    imageBlock.body.append(imageEditor(`${display} sahnesi`, ['images', imageKey]));
    const route = el('a', 'route-link', `↗ ${display} ekranını sitede aç`); route.href = mode === 'login' ? '/#giris' : '/#kayit'; route.target = '_blank'; route.rel = 'noopener';
    imageBlock.body.append(route); container.append(imageBlock.container);
  }
  function renderLinks(container) {
    container.append(el('p', 'section-note', 'Web bağlantıları için https:// ile başlayan bir adres, site bölümleri için #sınıflar gibi bir bağlantı kullan. Oyuncular ilgili düğmeye tıkladığında bu adreslere gider.'));
    const declared = fieldsDeclarations('links');
    const definitions = declared.length ? declared : Object.keys(state.data.links).map((key) => ({ key, label: key, group: 'Site bağlantıları' }));
    const groups = new Map();
    definitions.forEach((item) => { const group = item.group || 'Site bağlantıları'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(item); });
    let index = 0;
    groups.forEach((fields, group) => {
      const block = card(group, 'Boş bırakılan bağlantılar sitenin mevcut bilgi pencerelerini kullanır. Adres eklemek için https:// ile başla.', ++index);
      fields.forEach((definition) => block.body.append(field(definition.label || definition.key, ['links', definition.key], { full: true, placeholder: 'https://…', maxLength: 2048 }).wrapper));
      container.append(block.container);
    });
    if (!definitions.length) container.append(el('p', 'section-note', 'Bu sürüm için henüz bağlantı alanı tanımlanmamış.'));
  }

  function handleAuthFailure(error) {
    if (error.status !== 401 && error.status !== 403) return;
    notice('Yönetim oturumun sona erdi veya düzenleme yetkin değişti. Taslağın bu sayfada korunuyor. Yeniden giriş yapmadan önce yedeğini indirebilirsin.', [
      { label: 'Taslağı indir', handler: exportDraft },
      { label: 'Giriş yap', handler: () => { location.href = '/signin-with-chatgpt?return_to=%2Fadmin'; } },
    ]);
  }
  async function save() {
    if (!state.dirty || state.saving || state.uploads) return;
    state.saving = true; updateStatus(); $('notice').hidden = true;
    const sendingData = clone(state.data);
    const sendingSnapshot = JSON.stringify(sendingData);
    try {
      const result = await api('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: sendingData, revision: state.revision }) });
      state.revision = result.revision ?? state.revision;
      const savedData = normalize(result.data || sendingData);
      state.saved = JSON.stringify(savedData);
      if (JSON.stringify(state.data) === sendingSnapshot) { state.data = savedData; state.history = []; renderSection(); }
      changed(); sendPreview();
      notify(state.dirty ? 'Site kaydedildi. Kaydetme sırasında yaptığın yeni değişiklikler taslakta duruyor.' : 'Site içeriği kaydedildi. Değişiklikler tüm ziyaretçilere uygulandı.');
    } catch (error) {
      if (error.status === 409) notice('İçerik başka bir oturumda değiştirildi. Üzerine yazılmadı; taslağın bu sayfada korunuyor. Önce taslağını indir, ardından güncel sürümü yükleyip değişikliklerini yeniden uygula.', [
        { label: 'Taslağı indir', handler: exportDraft },
        { label: 'Güncel sürümü yükle', handler: reloadContent },
      ]);
      else if (error.status === 401 || error.status === 403) handleAuthFailure(error);
      else notice(`Kaydedilemedi. Taslağın bu sayfada korunuyor. ${error.message}`, [{ label: 'Tekrar dene', handler: save }, { label: 'Taslağı indir', handler: exportDraft }]);
    } finally { state.saving = false; updateStatus(); }
  }
  async function reloadContent() {
    if (state.dirty && !window.confirm('Bu sayfadaki kaydedilmemiş taslak güncel sunucu içeriğiyle değiştirilecek. Önce “Taslağı indir” ile yedek alabilirsin. Güncel sürümü yüklemek istiyor musun?')) return;
    try {
      const result = await api('/api/admin/content');
      state.data = normalize(result.data); state.saved = JSON.stringify(state.data); state.revision = result.revision ?? null; state.history = []; state.expanded.clear(); changed(); renderSection(); $('notice').hidden = true;
      notify('Sunucudaki güncel site içeriği yüklendi.');
    } catch (error) { handleAuthFailure(error); notify(`İçerik yüklenemedi: ${error.message}`); }
  }
  function exportDraft() {
    if (!state.data) return;
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a'); link.href = url; link.download = `metin3-icerik-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify('İçerik yedeği JSON dosyası olarak indirildi.');
  }
  function undo() {
    if (!state.history.length || state.saving) return;
    const current = JSON.stringify(state.data);
    let previous = state.history.pop();
    while (previous === current && state.history.length) previous = state.history.pop();
    state.data = JSON.parse(previous); state.expanded.clear(); changed(); renderSection();
    notify('Son düzenleme geri alındı.');
  }
  function resetDraft() {
    if (!state.dirty || !window.confirm('Kaydedilmemiş düzenlemeler son kayıtlı sürüme dönecek. Devam edilsin mi?')) return;
    remember(); state.data = JSON.parse(state.saved); state.expanded.clear(); changed(); renderSection(); notify('Taslak son kayıtlı sürüme döndürüldü.');
  }

  function previewPath() {
    const hash = state.section === 'hesap' ? (state.authMode === 'register' ? '#kayit' : '#giris') : state.section === 'siniflar' ? '#siniflar' : state.section === 'dunya' ? '#dunya' : state.section === 'haberler' ? '#haberler' : state.section === 'sorular' ? '#destek' : '';
    return `/?preview=1${hash}`;
  }
  function loadPreview() {
    const iframe = $('site-preview');
    const destination = new URL(previewPath(), location.origin).href;
    if (iframe.src !== destination) { state.previewLoaded = false; iframe.src = destination; }
    else sendPreview();
  }
  function togglePreview(force) {
    state.previewOpen = force ?? !state.previewOpen;
    $('preview-pane').hidden = !state.previewOpen;
    $('editing-layout').classList.toggle('preview-open', state.previewOpen);
    $('preview-toggle').setAttribute('aria-expanded', String(state.previewOpen));
    $('preview-toggle').textContent = state.previewOpen ? 'Önizleme ×' : 'Önizleme ↗';
    if (state.previewOpen) loadPreview();
  }
  function sendPreview() {
    if (!state.previewOpen || !state.data) return;
    $('site-preview').contentWindow?.postMessage({ type: 'm3-cms-preview', data: clone(state.data) }, location.origin);
  }
  $('site-preview').addEventListener('load', () => { state.previewLoaded = true; sendPreview(); });
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== $('site-preview').contentWindow) return;
    if (event.data?.type === 'm3-cms-ready' || event.data?.type === 'm3-cms-preview-ready') sendPreview();
  });
  document.querySelectorAll('[data-preview-size]').forEach((control) => control.addEventListener('click', () => {
    const mobile = control.dataset.previewSize === 'mobile';
    $('preview-viewport').classList.toggle('mobile', mobile);
    document.querySelectorAll('[data-preview-size]').forEach((item) => { const active = item === control; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  }));
  function closeMenu() { $('sidebar').classList.remove('open'); $('sidebar-scrim').hidden = true; $('menu-toggle').setAttribute('aria-expanded', 'false'); }
  $('menu-toggle').addEventListener('click', () => { const open = !$('sidebar').classList.contains('open'); $('sidebar').classList.toggle('open', open); $('sidebar-scrim').hidden = !open; $('menu-toggle').setAttribute('aria-expanded', String(open)); });
  $('sidebar-scrim').addEventListener('click', closeMenu);
  $('save-button').addEventListener('click', save);
  $('undo-button').addEventListener('click', undo);
  $('export-button').addEventListener('click', exportDraft);
  $('reset-button').addEventListener('click', resetDraft);
  $('preview-toggle').addEventListener('click', () => togglePreview());
  $('preview-close').addEventListener('click', () => togglePreview(false));
  $('preview-refresh').addEventListener('click', () => { state.previewLoaded = false; $('site-preview').src = previewPath(); });
  window.addEventListener('hashchange', () => { if (state.authorized) goTo(location.hash.slice(1), false); });
  window.addEventListener('beforeunload', (event) => { if (state.dirty || state.uploads) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeMenu(); if (state.previewOpen && matchMedia('(max-width: 900px)').matches) togglePreview(false); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (state.authorized) save(); }
  });
  initialize();
})();
