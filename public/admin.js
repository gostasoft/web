(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sections = [
    { id: 'sayfalar', label: 'Sayfalar', title: 'Her fikre yeni bir sayfa.', description: 'Kurallar, rehberler ve tanıtımlar için sayfalar oluştur; hazır bölümlerle içeriğini tasarla.', icon: 'news' },
    { id: 'duzen', label: 'Ana Sayfa Düzeni', title: 'Dünyanı yeniden düzenle.', description: 'Ana sayfanın bölümlerini sırala, göster veya gizle. Kendi içerik bölümlerini ekle.', icon: 'grid' },
    { id: 'menu', label: 'Menü', title: 'Yolunu sen belirle.', description: 'Menü bağlantılarını düzenle, sırala ve oluşturduğun sayfalara kısayol ekle.', icon: 'link' },
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
  const state = { data: null, saved: null, revision: null, dirty: false, saving: false, loggingOut: false, uploads: 0, history: [], section: 'genel', authMode: 'login', previewOpen: false, previewLoaded: false, previewTimer: null, toastTimer: null, authorized: false, expanded: new Set(), filter: '', builderPageId: null, builderSelection: {}, builderCatalog: null };
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
    state.previewTimer = setTimeout(() => { if (state.previewOpen && state.section === 'sayfalar') loadPreview(); else sendPreview(); }, 250);
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
    $('save-button').disabled = !state.dirty || state.saving || state.loggingOut || state.uploads > 0;
    $('logout-button').disabled = state.saving || state.loggingOut || state.uploads > 0;
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
    if (!window.M3BUILDER) throw new Error('Sayfa düzenleyici yüklenemedi. Sayfayı yeniden aç.');
    doc.builder = window.M3BUILDER.normalize(doc.builder, doc);
    return doc;
  }
  function accessError(error) {
    $('access-loader').hidden = true;
    $('access-screen').hidden = false;
    $('admin-shell').hidden = true;
    const authError = error.status === 401 || error.status === 403;
    $('access-title').textContent = authError ? 'Oturum gerekli' : 'Yönetim alanına ulaşılamadı.';
    $('access-description').textContent = authError ? 'Bu alanı kullanabilmek için giriş yapmalısın.' : 'Kayıtlı içerik yüklenemedi. Bağlantını kontrol edip yeniden deneyebilirsin.';
    const actions = $('access-actions');
    actions.hidden = false;
    actions.replaceChildren();
    if (authError) {
      const signin = el('a', 'button button-primary', 'Giriş yap');
      signin.href = '/#giris';
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
      $('user-email').textContent = user.email || 'Yetkili yönetici oturumu';
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
    const items = ['sayfalar', 'duzen', 'menu'].includes(state.section) ? [
      ['Özel sayfa', state.data.builder.pages.length, 'news'],
      ['Ana sayfa bölümü', state.data.builder.home.length, 'grid'],
      ['Menü bağlantısı', state.data.builder.navigation.length, 'link'],
      ['Toplam bölüm', builderSectionCount(), 'world'],
    ] : [
      ['Haber & duyuru', state.data.content.news.length, 'news'],
      ['Karakter sınıfı', state.data.content.classes.length, 'sword'],
      ['Dünya sahnesi', state.data.content.worlds.length, 'world'],
      ['Kayıtlı görsel alanı', Object.keys(state.data.images).length, 'image'],
    ];
    items.forEach(([label, count, iconName]) => {
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
    else if (section.id === 'sayfalar') renderBuilderPages(container);
    else if (section.id === 'duzen') renderBuilderHome(container);
    else if (section.id === 'menu') renderBuilderMenu(container);
    else if (section.id === 'genel') renderTexts(container);
    else if (section.id === 'gorseller') renderImages(container);
    else if (section.id === 'hesap') renderAuth(container);
    else if (section.id === 'baglantilar') renderLinks(container);
    updateStatus();
    if (state.previewOpen && state.section === 'sayfalar') loadPreview();
  }
  function renderTexts(container) {
    const menuNote = el('div', 'section-note');
    menuNote.append(document.createTextNode('Gezinme menüsünün yazılarını ve bağlantılarını Menü bölümünden düzenleyebilirsin. '), button('Menüyü düzenle ↗', 'text-button', () => goTo('menu')));
    container.append(menuNote);
    const declared = fieldsDeclarations('texts');
    const fields = declared.length ? declared : Object.keys(state.data.texts).map((key) => ({ key, label: key, group: 'Site metinleri', multiline: /title|description|note|caption/.test(key) }));
    const groups = new Map();
    fields.forEach((definition) => {
      if (/^(?:auth|nav)\./.test(definition.key)) return;
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
      const ownerPath = path.slice(0, -1);
      const originalOwnerId = get(ownerPath)?.id;
      try {
        const form = new FormData(); form.append('file', file);
        const result = await api('/api/admin/upload', { method: 'POST', body: form });
        if (!result.url || !safeImageSrc(result.url)) throw new Error('Sunucu geçerli bir görsel adresi döndürmedi.');
        if (state.data !== originalDoc || (originalOwnerId && get(ownerPath)?.id !== originalOwnerId) || JSON.stringify(get(path) ?? null) !== JSON.stringify(originalPathValue)) {
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

  function builderSectionCount() {
    const builder = state.data.builder;
    return builder.home.length + builder.pages.reduce((total, page) => total + page.sections.length, 0);
  }
  function builderCanAddSections(amount = 1) {
    if (builderSectionCount() + amount <= 200) return true;
    notify('Site genelinde en çok 200 bölüm bulunabilir. Önce kullanmadığın bir bölümü kaldır.');
    return false;
  }
  function builderPageSlug(value, exceptId) {
    const base = window.M3BUILDER.slugify(value);
    const used = new Set(state.data.builder.pages.filter((page) => page.id !== exceptId).map((page) => page.slug));
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      const ending = `-${suffix++}`;
      candidate = base.slice(0, 60 - ending.length).replace(/-+$/, '') + ending;
    }
    return candidate;
  }
  function builderLinkPageSlug(href) {
    try {
      const url = new URL(href, location.origin + '/');
      if (url.origin !== location.origin || !url.hash.startsWith('#sayfa/')) return null;
      return decodeURIComponent(url.hash.slice(7));
    } catch { return null; }
  }
  function builderMovePageLinks(previousSlug, nextSlug) {
    state.data.builder.navigation.forEach((entry) => {
      if (builderLinkPageSlug(entry.href) === previousSlug) entry.href = entry.href.slice(0, entry.href.indexOf('#')) + '#sayfa/' + nextSlug;
    });
  }
  function builderCopySection(section) {
    const duplicate = clone(section);
    duplicate.id = window.M3BUILDER.uid('bolum');
    duplicate.items = duplicate.items.map((item) => ({ ...item, id: window.M3BUILDER.uid('oge') }));
    return duplicate;
  }
  function builderToggle(label, path, help = '', callback) {
    const wrapper = el('label', 'builder-toggle');
    const input = el('input'); input.type = 'checkbox'; input.checked = get(path) === true; input.name = path.join('.');
    const copy = el('span'); copy.append(el('strong', '', label));
    if (help) copy.append(el('small', '', help));
    input.addEventListener('change', () => mutate(() => { set(path, input.checked); if (callback) callback(input.checked); }));
    wrapper.append(input, copy);
    return wrapper;
  }
  function builderEmpty(title, description, actionLabel, action) {
    const box = el('div', 'builder-empty');
    box.append(el('span', 'builder-empty-mark', '＋'), el('h2', '', title), el('p', '', description));
    if (action) box.append(button(actionLabel, 'button button-primary', action));
    return box;
  }
  function builderBadge(text, active = false) { return el('span', `builder-badge${active ? ' is-live' : ''}`, text); }
  function builderAddToMenu(page) {
    const href = window.M3BUILDER.pageHref(page);
    if (state.data.builder.navigation.some((item) => builderLinkPageSlug(item.href) === page.slug)) { notify('Bu sayfanın menü bağlantısı zaten var. Menü bölümünden düzenleyebilirsin.'); return; }
    if (state.data.builder.navigation.length >= 20) { notify('Menüde en çok 20 bağlantı bulunabilir.'); return; }
    mutate(() => state.data.builder.navigation.push({ id: window.M3BUILDER.uid('menu'), label: (page.title || 'Yeni sayfa').slice(0, 80), href, visible: true }));
    notify(page.published ? 'Sayfa menü taslağına eklendi. Siteyi Kaydet ile uygula.' : 'Kısayol menü taslağına eklendi; sayfa yayımlanana kadar ziyaretçilere gösterilmez.');
  }
  function builderNewPage() {
    if (state.data.builder.pages.length >= 30) { notify('En çok 30 özel sayfa oluşturabilirsin.'); return; }
    const page = window.M3BUILDER.createPage(state.data);
    if (!builderCanAddSections(page.sections.length)) return;
    page.slug = builderPageSlug(page.slug);
    mutate(() => { state.data.builder.pages.push(page); state.builderPageId = page.id; state.builderCatalog = null; });
    if (state.previewOpen) loadPreview();
    notify('Yeni sayfa taslak olarak oluşturuldu. Hazır olduğunda yayına açıp kaydet.');
  }
  function renderBuilderPages(container) {
    const pages = state.data.builder.pages;
    const toolbar = el('div', 'collection-toolbar');
    toolbar.append(el('p', '', `${pages.length} / 30 sayfa · Yeni sayfalar önce taslak olarak oluşturulur.`), button('＋ Yeni sayfa', 'button button-secondary', builderNewPage));
    container.append(toolbar);
    if (!pages.length) { container.append(builderEmpty('İlk sayfanı oluştur.', 'Oyun kuralları, sunucu özellikleri veya bir başlangıç rehberi. Başlıklarını yaz, görsellerini seç; kod gerekmez.', 'Yeni sayfa oluştur', builderNewPage)); return; }
    let page = pages.find((item) => item.id === state.builderPageId);
    if (!page) { page = pages[0]; state.builderPageId = page.id; }
    const index = pages.indexOf(page);
    const layout = el('div', 'builder-pages-layout');
    const pageList = el('nav', 'builder-page-list'); pageList.setAttribute('aria-label', 'Düzenlenecek sayfa');
    let currentListTitle;
    let currentListSlug;
    pages.forEach((entry) => {
      const selected = entry.id === page.id;
      const choice = button('', `builder-page-choice${selected ? ' active' : ''}`, () => { state.builderPageId = entry.id; state.builderCatalog = null; renderSection(); if (state.previewOpen) loadPreview(); });
      choice.setAttribute('aria-pressed', String(selected));
      const label = el('strong', '', entry.title || 'Adsız sayfa');
      const slug = el('small', '', window.M3BUILDER.pageHref(entry));
      choice.append(label, slug, builderBadge(entry.published ? 'Yayında' : 'Taslak', entry.published));
      if (selected) { currentListTitle = label; currentListSlug = slug; }
      pageList.append(choice);
    });
    const editor = el('div', 'builder-page-editor');
    const settings = card('Sayfa ayarları', 'Sayfa adresi, başlığı ve yayındaki durumu.', 1);
    const grid = el('div', 'field-grid');
    grid.append(field('Sayfa başlığı', ['builder', 'pages', index, 'title'], { maxLength: 200, onInput: (value) => { currentListTitle.textContent = value || 'Adsız sayfa'; } }).wrapper);
    let previousSlug = page.slug;
    const slug = field('Sayfa adresi', ['builder', 'pages', index, 'slug'], { maxLength: 60, help: 'Kısa bir adres kullan. Türkçe harfler ve boşluklar uygun biçime çevrilir.', placeholder: 'oyun-kurallari', onInput: (value) => {
      const normalized = builderPageSlug(value, page.id);
      page.slug = normalized;
      builderMovePageLinks(previousSlug, normalized);
      previousSlug = normalized;
      currentListSlug.textContent = '#sayfa/' + normalized;
    } });
    slug.input.addEventListener('change', () => { slug.input.value = page.slug; if (state.previewOpen) loadPreview(); });
    grid.append(slug.wrapper, field('Kısa açıklama', ['builder', 'pages', index, 'description'], { multiline: true, maxLength: 12000, help: 'Sayfanın ne anlattığını birkaç cümleyle özetle.' }).wrapper);
    settings.body.append(grid, builderToggle('Sayfayı yayına aç', ['builder', 'pages', index, 'published'], 'Kapalıyken yalnızca yönetici önizlemesinde görünür. Sonuç Siteyi Kaydet ile uygulanır.'));
    const actions = el('div', 'builder-page-actions');
    actions.append(button('Menüye ekle', 'button button-secondary', () => builderAddToMenu(page)), button('Önizle', 'button button-secondary', () => { togglePreview(true); loadPreview(); }));
    actions.append(button('Kopyasını oluştur', 'text-button', () => {
      if (pages.length >= 30) { notify('En çok 30 özel sayfa oluşturabilirsin.'); return; }
      if (!builderCanAddSections(page.sections.length)) return;
      const copy = clone(page); copy.id = window.M3BUILDER.uid('sayfa'); copy.title = (page.title + ' (kopya)').slice(0, 200); copy.slug = builderPageSlug(page.slug + '-kopya'); copy.published = false; copy.sections = page.sections.map(builderCopySection);
      mutate(() => { pages.push(copy); state.builderPageId = copy.id; });
      if (state.previewOpen) loadPreview();
    }));
    actions.append(button('Sayfayı kaldır', 'text-button builder-danger', () => {
      mutate(() => { pages.splice(index, 1); state.data.builder.navigation = state.data.builder.navigation.filter((item) => builderLinkPageSlug(item.href) !== page.slug); state.builderPageId = pages[Math.min(index, pages.length - 1)]?.id || null; });
      if (state.previewOpen) loadPreview();
      notify('Sayfa ve ona ait menü kısayolları taslaktan kaldırıldı. Geri al ile geri getirebilirsin.');
    }));
    settings.body.append(actions); editor.append(settings.container);
    if (!page.published) editor.append(el('p', 'section-note', 'Bu sayfa taslak. Önizlemede inceleyebilirsin; ziyaretçilerin görmesi için “Sayfayı yayına aç” seçeneğini etkinleştirip Siteyi Kaydet düğmesine bas. Menü kısayolunu şimdiden hazırlayabilirsin.'));
    renderBuilderSectionList(editor, ['builder', 'pages', index, 'sections'], page.id);
    layout.append(pageList, editor); container.append(layout);
  }
  function renderBuilderHome(container) {
    const note = el('p', 'section-note');
    note.append(el('strong', '', 'Sıra ve görünürlük senin elinde. '), document.createTextNode('Hazır bölümleri oklarla taşıyabilir veya gizleyebilirsin. Kendi bölümlerini ekleyip içerik ve görünüm ayarlarını aşağıdan düzenle. Kaydedilene kadar ziyaretçiler etkilenmez.'));
    container.append(note);
    renderBuilderSectionList(container, ['builder', 'home'], 'home');
  }
  function renderBuilderSectionList(container, path, context) {
    const entries = get(path);
    const toolbar = el('div', 'builder-section-toolbar');
    const counts = el('div'); counts.append(el('h2', '', context === 'home' ? 'Ana sayfa bölümleri' : 'Sayfa bölümleri'), el('p', '', `${entries.length} / 40 bölüm · Site toplamı ${builderSectionCount()} / 200`));
    const add = button('＋ Bölüm ekle', 'button button-secondary', () => { state.builderCatalog = state.builderCatalog === context ? null : context; renderSection(); }); add.setAttribute('aria-expanded', String(state.builderCatalog === context || !entries.length));
    toolbar.append(counts, add); container.append(toolbar);
    if (state.builderCatalog === context || !entries.length) {
      const catalog = el('div', 'builder-catalog'); catalog.setAttribute('aria-label', 'Yeni bölüm şablonu seç');
      const names = { text: 'T', imageText: 'image', cards: 'grid', gallery: 'image', faq: 'help', cta: 'link' };
      window.M3BUILDER.catalog.forEach((definition) => {
        const tile = button('', 'builder-template', () => {
          if (entries.length >= 40) { notify('Bir sayfada en çok 40 bölüm bulunabilir.'); return; }
          if (!builderCanAddSections()) return;
          const block = window.M3BUILDER.createSection(definition.kind, state.data);
          mutate(() => { const selected = entries.findIndex((item) => item.id === state.builderSelection[context]); entries.splice(selected < 0 ? entries.length : selected + 1, 0, block); state.builderSelection[context] = block.id; state.builderCatalog = null; });
        });
        const mark = el('span', 'builder-template-mark');
        mark.append(definition.kind === 'text' ? document.createTextNode('T') : icon(names[definition.kind]));
        tile.append(mark, el('strong', '', definition.label), el('small', '', definition.description)); catalog.append(tile);
      }); container.append(catalog);
    }
    if (!entries.length) { container.append(el('p', 'builder-list-empty', 'Bu sayfada henüz bölüm yok. Yukarıdaki şablonlardan birini seçerek başla.')); return; }
    let selected = entries.find((entry) => entry.id === state.builderSelection[context]);
    if (!selected) { selected = entries[0]; state.builderSelection[context] = selected.id; }
    const list = el('div', 'builder-block-list'); list.setAttribute('aria-label', 'Bölüm sırası');
    entries.forEach((entry, index) => {
      const builtin = entry.kind === 'builtin';
      const definition = builtin ? window.M3BUILDER.builtinCatalog.find((item) => item.source === entry.source) : window.M3BUILDER.catalog.find((item) => item.kind === entry.kind);
      const title = builtin ? definition?.label || 'Hazır bölüm' : entry.title || definition?.label || 'Adsız bölüm';
      const row = el('div', `builder-block-row${entry.id === selected.id ? ' selected' : ''}${entry.visible ? '' : ' is-hidden'}`);
      const choice = button('', 'builder-block-choice', () => { state.builderSelection[context] = entry.id; renderSection(); }); choice.setAttribute('aria-pressed', String(entry.id === selected.id));
      const copy = el('span'); copy.append(el('strong', '', title), el('small', '', builtin ? 'Hazır site bölümü' : definition?.label || entry.kind));
      choice.append(el('span', 'builder-order', String(index + 1).padStart(2, '0')), copy);
      const controls = el('div', 'builder-row-actions');
      const visible = button(entry.visible ? 'Görünür' : 'Gizli', `builder-visibility${entry.visible ? ' active' : ''}`, () => mutate(() => { entry.visible = !entry.visible; })); visible.setAttribute('role', 'switch'); visible.setAttribute('aria-checked', String(entry.visible)); visible.setAttribute('aria-label', `${title}: sitede göster`);
      const up = button('↑', 'icon-button', () => move(-1)); up.disabled = index === 0; up.setAttribute('aria-label', `${title}: yukarı taşı`);
      const down = button('↓', 'icon-button', () => move(1)); down.disabled = index === entries.length - 1; down.setAttribute('aria-label', `${title}: aşağı taşı`);
      controls.append(visible, up, down);
      if (!builtin) {
        const duplicate = button('⧉', 'icon-button', () => {
          if (entries.length >= 40) { notify('Bir sayfada en çok 40 bölüm bulunabilir.'); return; }
          if (!builderCanAddSections()) return;
          const copy = builderCopySection(entry);
          mutate(() => { entries.splice(index + 1, 0, copy); state.builderSelection[context] = copy.id; });
        }); duplicate.setAttribute('aria-label', `${title}: bölümün kopyasını oluştur`);
        const remove = button('×', 'icon-button remove-button', () => { mutate(() => { entries.splice(index, 1); state.builderSelection[context] = entries[Math.min(index, entries.length - 1)]?.id || null; }); notify('Bölüm taslaktan kaldırıldı. Geri al ile geri getirebilirsin.'); }); remove.setAttribute('aria-label', `${title}: bölümü kaldır`);
        controls.append(duplicate, remove);
      }
      function move(direction) { mutate(() => { const destination = index + direction; [entries[index], entries[destination]] = [entries[destination], entries[index]]; }); }
      row.append(choice, controls); list.append(row);
    });
    container.append(list);
    const index = entries.indexOf(selected);
    if (selected.kind === 'builtin') {
      const definition = window.M3BUILDER.builtinCatalog.find((item) => item.source === selected.source);
      const block = card(definition?.label || 'Hazır bölüm', 'Bu bölüm sitenin mevcut içerik alanlarını kullanır. Buradan sırasını ve görünürlüğünü yönetebilirsin.');
      const sourceSection = { hero: 'genel', start: 'genel', news: 'haberler', classes: 'siniflar', world: 'dunya', faq: 'sorular', community: 'genel' }[selected.source] || 'genel';
      block.body.append(button('Bölüm içeriğini düzenle ↗', 'button button-secondary', () => goTo(sourceSection)));
      container.append(block.container);
    } else renderBuilderBlock(container, [...path, index], selected, context);
  }
  function renderBuilderBlock(container, path, section, context) {
    const definition = window.M3BUILDER.catalog.find((item) => item.kind === section.kind);
    const block = card(section.title || definition?.label || 'Bölüm içeriği', 'İçeriği ve görünümü düzenle. Metinler güvenli düz yazı olarak gösterilir; kod veya HTML gerekmez.');
    block.container.classList.add('builder-active-editor');
    const type = field('Bölüm şablonu', [...path, 'kind'], { select: window.M3BUILDER.catalog.map((item) => [item.kind, item.label]), onInput: () => renderSection() });
    block.body.append(type.wrapper);
    const grid = el('div', 'field-grid');
    grid.append(field('Üst başlık', [...path, 'eyebrow'], { maxLength: 100 }).wrapper, field('Başlık', [...path, 'title'], { maxLength: 200 }).wrapper, field('Açıklama / metin', [...path, 'body'], { multiline: true, maxLength: 12000, rows: 5, help: 'Paragrafları yeni satırla ayırabilirsin.' }).wrapper);
    block.body.append(grid);
    if (['imageText', 'cta'].includes(section.kind)) block.body.append(el('span', 'field-label', section.kind === 'cta' ? 'Arka plan / bölüm görseli (isteğe bağlı)' : 'Bölüm görseli'), imageEditor('Bölüm görseli', [...path, 'image']));
    if (['cards', 'gallery', 'faq'].includes(section.kind)) renderBuilderItems(block.body, path, section);
    const buttonFields = el('div', 'field-grid');
    buttonFields.append(field('Buton yazısı (isteğe bağlı)', [...path, 'button', 'label'], { maxLength: 80, placeholder: 'Örneğin: Detayları incele' }).wrapper, field('Buton bağlantısı', [...path, 'button', 'href'], { maxLength: 2048, placeholder: '#kayit veya https://…', help: 'Buton yazısı ve bağlantısı boşsa buton gösterilmez.' }).wrapper);
    block.body.append(el('span', 'builder-subheading', 'Yönlendirme butonu'), buttonFields);
    const style = el('div', 'field-grid builder-style-grid');
    style.append(field('Renk tonu', [...path, 'style', 'tone'], { select: [['dark', 'Koyu siyah'], ['burgundy', 'Bordo'], ['transparent', 'Sayfa arka planı']] }).wrapper,
      field('Metin hizası', [...path, 'style', 'align'], { select: [['left', 'Sola hizalı'], ['center', 'Ortalanmış']] }).wrapper,
      field('Bölüm boşluğu', [...path, 'style', 'spacing'], { select: [['compact', 'Dar'], ['normal', 'Normal'], ['wide', 'Geniş']] }).wrapper);
    if (section.kind === 'imageText') style.append(field('Görselin konumu', [...path, 'style', 'imageSide'], { select: [['left', 'Görsel solda'], ['right', 'Görsel sağda']] }).wrapper);
    block.body.append(el('span', 'builder-subheading', 'Görünüm'), style);
    container.append(block.container);
  }
  function renderBuilderItems(container, sectionPath, section) {
    const faq = section.kind === 'faq';
    const title = faq ? 'Sorular ve yanıtlar' : section.kind === 'gallery' ? 'Galeri görselleri' : 'Bilgi kartları';
    const toolbar = el('div', 'builder-section-toolbar');
    toolbar.append(el('h3', '', `${title} · ${section.items.length} / 20`), button(faq ? '＋ Soru ekle' : section.kind === 'gallery' ? '＋ Görsel ekle' : '＋ Kart ekle', 'button button-secondary', () => {
      if (section.items.length >= 20) { notify('Bir bölümde en çok 20 öğe bulunabilir.'); return; }
      mutate(() => section.items.push({ id: window.M3BUILDER.uid('oge'), title: faq ? 'Yeni soru' : 'Yeni öğe', body: '', image: { src: '', x: 50, y: 50, fit: 'cover' }, href: '' }));
    })); container.append(toolbar);
    if (!section.items.length) container.append(el('p', 'builder-list-empty', faq ? 'İlk sorunu ekleyerek başla.' : 'Bu bölüm henüz boş. İlk öğeyi ekleyebilirsin.'));
    section.items.forEach((item, index) => {
      const path = [...sectionPath, 'items', index];
      const box = el('div', 'builder-item-editor');
      const top = el('div', 'builder-item-heading'); top.append(el('strong', '', `${String(index + 1).padStart(2, '0')} · ${item.title || (faq ? 'Soru' : 'Öğe')}`));
      const actions = el('div', 'builder-row-actions');
      const up = button('↑', 'icon-button', () => move(-1)); up.disabled = index === 0; up.setAttribute('aria-label', `${index + 1}. öğeyi yukarı taşı`);
      const down = button('↓', 'icon-button', () => move(1)); down.disabled = index === section.items.length - 1; down.setAttribute('aria-label', `${index + 1}. öğeyi aşağı taşı`);
      const copy = button('⧉', 'icon-button', () => { if (section.items.length >= 20) { notify('Bir bölümde en çok 20 öğe bulunabilir.'); return; } mutate(() => { const duplicate = clone(item); duplicate.id = window.M3BUILDER.uid('oge'); section.items.splice(index + 1, 0, duplicate); }); }); copy.setAttribute('aria-label', `${index + 1}. öğenin kopyasını oluştur`);
      const remove = button('×', 'icon-button remove-button', () => mutate(() => section.items.splice(index, 1))); remove.setAttribute('aria-label', `${index + 1}. öğeyi kaldır`);
      actions.append(up, down, copy, remove); top.append(actions);
      const fields = el('div', 'field-grid'); fields.append(field(faq ? 'Soru' : 'Başlık', [...path, 'title'], { maxLength: 200 }).wrapper, field(faq ? 'Yanıt' : 'Açıklama', [...path, 'body'], { multiline: true, maxLength: 12000 }).wrapper);
      box.append(top, fields);
      if (!faq) box.append(imageEditor('Öğe görseli', [...path, 'image']), field('Bağlantı (isteğe bağlı)', [...path, 'href'], { maxLength: 2048, placeholder: '#sayfa/rehber veya https://…' }).wrapper);
      container.append(box);
      function move(direction) { mutate(() => { const destination = index + direction; [section.items[index], section.items[destination]] = [section.items[destination], section.items[index]]; }); }
    });
  }
  function renderBuilderMenu(container) {
    const entries = state.data.builder.navigation;
    const toolbar = el('div', 'collection-toolbar');
    toolbar.append(el('p', '', `${entries.length} / 20 menü bağlantısı · Sıra, masaüstü ve mobil menülere birlikte uygulanır.`), button('＋ Bağlantı ekle', 'button button-secondary', () => {
      if (entries.length >= 20) { notify('Menüde en çok 20 bağlantı bulunabilir.'); return; }
      mutate(() => entries.push({ id: window.M3BUILDER.uid('menu'), label: 'Yeni bağlantı', href: '#anasayfa', visible: true }));
    })); container.append(toolbar);
    container.append(el('p', 'section-note', 'Web adresleri, e-posta veya #dunya gibi sayfa içi bağlantılar kullanabilirsin. Özel sayfa kısayolları aşağıdan eklenir; taslak sayfaların bağlantıları ziyaretçilerden gizlenir. Menü yazılarını buradan düzenle.'));
    if (!entries.length) container.append(el('p', 'builder-list-empty', 'Menüde henüz bağlantı yok. Yeni bağlantı veya sayfa kısayolu ekle.'));
    entries.forEach((entry, index) => {
      const block = card(entry.label || 'Yeni bağlantı', `${index + 1}. sıradaki menü bağlantısı`);
      const controls = el('div', 'builder-row-actions');
      const up = button('↑', 'icon-button', () => move(-1)); up.disabled = index === 0; up.setAttribute('aria-label', `${entry.label}: yukarı taşı`);
      const down = button('↓', 'icon-button', () => move(1)); down.disabled = index === entries.length - 1; down.setAttribute('aria-label', `${entry.label}: aşağı taşı`);
      const remove = button('Kaldır', 'text-button builder-danger', () => mutate(() => entries.splice(index, 1)));
      controls.append(up, down, remove); block.container.querySelector('.card-heading').append(controls);
      const grid = el('div', 'field-grid');
      grid.append(field('Menü yazısı', ['builder', 'navigation', index, 'label'], { maxLength: 80 }).wrapper, field('Bağlantı adresi', ['builder', 'navigation', index, 'href'], { maxLength: 2048, placeholder: '#anasayfa veya https://…' }).wrapper);
      block.body.append(grid, builderToggle('Menüde göster', ['builder', 'navigation', index, 'visible'])); container.append(block.container);
      function move(direction) { mutate(() => { const destination = index + direction; [entries[index], entries[destination]] = [entries[destination], entries[index]]; }); }
    });
    const shortcuts = card('Sayfa kısayolları', 'Bir sayfayı oluşturmak onu otomatik olarak menüye eklemez. Buradan ekleyip üstteki listede sıralayabilirsin.');
    if (!state.data.builder.pages.length) shortcuts.body.append(el('p', 'help-text', 'Önce Sayfalar bölümünden bir sayfa oluştur.'), button('Sayfalara git ↗', 'button button-secondary', () => goTo('sayfalar')));
    state.data.builder.pages.forEach((page) => {
      const row = el('div', 'builder-shortcut');
      const copy = el('div'); copy.append(el('strong', '', page.title || 'Adsız sayfa'), el('small', '', window.M3BUILDER.pageHref(page)));
      const exists = entries.some((entry) => builderLinkPageSlug(entry.href) === page.slug);
      const add = button(exists ? 'Menüde mevcut' : 'Menüye ekle', 'button button-secondary', () => builderAddToMenu(page)); add.disabled = exists;
      row.append(copy, builderBadge(page.published ? 'Yayında' : 'Taslak', page.published), add); shortcuts.body.append(row);
    }); container.append(shortcuts.container);
  }

  function handleAuthFailure(error) {
    if (error.status !== 401 && error.status !== 403) return;
    notice('Yönetim oturumun sona erdi veya düzenleme yetkin değişti. Taslağın bu sayfada korunuyor. Yeniden giriş yapmadan önce yedeğini indirebilirsin.', [
      { label: 'Taslağı indir', handler: exportDraft },
      { label: 'Giriş yap', handler: () => { location.href = '/#giris'; } },
    ]);
  }
  async function save() {
    if (!state.dirty || state.saving || state.loggingOut || state.uploads) return;
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

  async function logout() {
    if (state.loggingOut || state.saving || state.uploads) return;
    if (state.dirty && !window.confirm('Kaydedilmemiş değişikliklerin var. Kaydetmeden güvenli çıkış yapmak istiyor musun?')) return;
    state.loggingOut = true;
    $('logout-button').textContent = 'Çıkış yapılıyor…';
    updateStatus();
    try {
      await api('/api/auth/logout', { method: 'POST' });
      try { localStorage.removeItem('m3-remembered-username'); } catch (_) { /* Optional browser storage can be unavailable. */ }
      state.authorized = false;
      state.dirty = false;
      state.history = [];
      location.assign('/#giris');
    } catch (error) {
      notice('Çıkış tamamlanamadı. Oturumunun kapandığı doğrulanamadı; yeniden deneyebilirsin.', [{ label: 'Tekrar dene', handler: logout }]);
    } finally {
      state.loggingOut = false;
      $('logout-button').textContent = '↪  Güvenli çıkış';
      updateStatus();
    }
  }

  function previewPath() {
    if (state.section === 'sayfalar') {
      const page = state.data?.builder?.pages.find((item) => item.id === state.builderPageId);
      if (page) return `/?preview=1${window.M3BUILDER.pageHref(page)}`;
    }
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
  $('logout-button').addEventListener('click', logout);
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
