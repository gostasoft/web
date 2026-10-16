'use strict';
(function () {
  const config = window.M3AUTH_CONFIG;
  const screen = document.getElementById('auth-main');
  if (!config || !screen) return;
  const home = document.getElementById('main');
  const footer = document.querySelector('.site-footer');
  const editor = document.getElementById('auth-art-editor');
  const initialTitle = document.title;
  const routes = { login: '#giris', register: '#kayit', password: '#sifre-yenile', username: '#kullanici-adi' };
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const symbol = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  let active = null;
  let draft = null;
  let draftMode = null;
  let draftUrl = null;
  let displayedUrl = null;
  let artworkRequest = 0;
  let editorRequest = 0;
  let database;
  const overrides = new Map();

  function readUsername() {
    try { return localStorage.getItem('m3-remembered-username') || ''; } catch (_) { return ''; }
  }

  function artworkDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('Storage unavailable')); return; }
      const request = indexedDB.open('metin3-auth-artwork', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Storage blocked'));
    });
    return database;
  }

  async function savedArtwork(mode) {
    if (overrides.has(mode)) return overrides.get(mode);
    let record;
    try {
      const db = await artworkDatabase();
      record = await new Promise((resolve, reject) => {
        const request = db.transaction('images').objectStore('images').get(mode);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (_) { /* Published defaults still work without browser storage. */ }
    overrides.set(mode, record || null);
    return record || null;
  }

  async function writeArtwork(mode, value) {
    const db = await artworkDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      const store = transaction.objectStore('images');
      if (value) store.put(value, mode); else store.delete(mode);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Save cancelled'));
    });
    overrides.set(mode, value);
  }

  const artMode = mode => mode === 'register' ? 'register' : 'login';
  const artSource = value => value instanceof Blob ? URL.createObjectURL(value) : value;

  async function updateArtwork() {
    const request = ++artworkRequest;
    const mode = artMode(active);
    const art = await savedArtwork(mode) || config[mode];
    if (!active || request !== artworkRequest) return;
    const image = document.getElementById('auth-art');
    if (!image) return;
    if (displayedUrl) URL.revokeObjectURL(displayedUrl);
    displayedUrl = art.src instanceof Blob ? artSource(art.src) : null;
    image.src = displayedUrl || art.src;
    image.style.objectPosition = art.x + '% ' + art.y + '%';
    image.onerror = () => {
      image.onerror = null;
      image.src = config[mode].src;
      image.style.objectPosition = config[mode].x + '% ' + config[mode].y + '%';
    };
  }

  function field(name, label, type, options) {
    const opts = options || {};
    const password = type === 'password';
    return '<div class="auth-field"><label for="auth-' + name + '">' + label + '</label><div class="auth-input">' + symbol(opts.icon || (password ? 'shield' : 'user')) + '<input id="auth-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + (opts.autocomplete || 'off') + '"' + (opts.optional ? '' : ' required') + ' maxlength="' + (password ? '128' : '100') + '"' + (opts.value ? ' value="' + esc(opts.value) + '"' : '') + ' placeholder="' + esc(opts.placeholder || label) + '" aria-describedby="auth-' + name + '-error' + (opts.hint ? ' auth-' + name + '-hint' : '') + '">' + (password ? '<button type="button" class="password-toggle" data-show-password="auth-' + name + '" aria-label="' + label + ' göster" aria-pressed="false">' + symbol('eye') + '</button>' : '') + '</div>' + (opts.hint ? '<small class="auth-hint" id="auth-' + name + '-hint">' + opts.hint + '</small>' : '') + '<small class="auth-field-error" id="auth-' + name + '-error"></small></div>';
  }

  function formMarkup(mode) {
    const register = mode === 'register';
    const recovery = mode === 'password' || mode === 'username';
    const remembered = readUsername();
    let fields = '';
    if (register) fields += field('name', 'Adın ve soyadın', 'text', { autocomplete: 'name', optional: true, placeholder: 'Adın ve soyadın (isteğe bağlı)' });
    if (!recovery) fields += field('username', 'Kullanıcı adı', 'text', { autocomplete: 'username', value: register ? '' : remembered, placeholder: 'Kullanıcı adın' });
    if (register || recovery) fields += field('email', 'E-posta adresi', 'email', { autocomplete: 'email', icon: 'mail', placeholder: 'ornek@eposta.com' });
    if (!recovery) fields += field('password', 'Şifre', 'password', { autocomplete: register ? 'new-password' : 'current-password', placeholder: register ? 'Güçlü bir şifre belirle' : 'Şifreni gir', hint: register ? 'En az 8 karakter, bir harf ve bir rakam.' : '' });
    if (register) fields += field('confirm', 'Şifre tekrar', 'password', { autocomplete: 'new-password', placeholder: 'Şifreni yeniden gir' });
    const extra = mode === 'login' ? '<div class="auth-options"><label class="auth-checkbox"><input name="remember" type="checkbox"' + (remembered ? ' checked' : '') + '><span>Kullanıcı adımı hatırla</span></label><a href="#sifre-yenile">Şifremi unuttum</a></div>' : '';
    const submit = register ? 'Hesap Oluştur' : mode === 'login' ? 'Giriş Yap' : 'Devam Et';
    return '<form class="auth-form" data-auth-form="' + mode + '" novalidate>' + fields + extra + '<div class="auth-status" id="auth-status" role="status" aria-live="polite" hidden></div><button class="button primary full auth-submit" type="submit">' + submit + symbol('arrow') + '</button>' + (mode === 'login' ? '<a class="auth-username-help" href="#kullanici-adi">Kullanıcı adımı unuttum</a>' : '') + '</form>';
  }

  function render() {
    const mode = Object.keys(routes).find(key => routes[key] === location.hash);
    if (!mode) {
      if (!active) return;
      active = null;
      artworkRequest++;
      if (editor.open) editor.close();
      screen.hidden = true;
      screen.replaceChildren();
      home.hidden = false;
      footer.hidden = false;
      document.body.classList.remove('auth-open');
      document.title = initialTitle;
      if (displayedUrl) { URL.revokeObjectURL(displayedUrl); displayedUrl = null; }
      const target = document.getElementById(location.hash.slice(1)) || home;
      requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
      return;
    }
    if (mode === active) return;
    if (editor.open) editor.close();
    active = mode;
    const register = mode === 'register';
    const recovery = mode === 'password' || mode === 'username';
    const art = config[artMode(mode)];
    const title = register ? 'Efsanen burada başlıyor.' : mode === 'password' ? 'Şifreni yenile.' : mode === 'username' ? 'Hesabını yeniden bul.' : 'Tekrar hoş geldin.';
    const description = register ? 'Yeni bir yolculuk için kendi hesabını oluştur.' : recovery ? 'Hesabına bağlı e-posta adresiyle devam et.' : 'Hesabına giriş yap, hikâyene devam et.';
    document.title = (register ? 'Kayıt Ol' : recovery ? 'Hesap Yardımı' : 'Giriş Yap') + ' | Metin3';
    home.hidden = true;
    footer.hidden = true;
    document.body.classList.add('auth-open');
    document.querySelectorAll('.desktop-nav [aria-current]').forEach(link => link.removeAttribute('aria-current'));
    screen.innerHTML = '<div class="auth-layout"><aside class="auth-showcase" aria-label="Metin3 dünyası"><img id="auth-art" src="' + esc(art.src) + '" alt="Metin3 dünyasından fantastik karakter ve manzara" style="object-position:' + art.x + '% ' + art.y + '%"><div class="auth-art-shade"></div><div class="auth-showcase-top"><a class="auth-back" href="#anasayfa">' + symbol('arrow') + 'Anasayfaya dön</a><button class="auth-art-edit" type="button" data-edit-auth-art>' + symbol('image') + '<span>Görseli değiştir</span></button></div><div class="auth-showcase-copy"><span class="auth-ornament" aria-hidden="true"></span><p class="eyebrow">' + esc(art.eyebrow) + '</p><h2>' + esc(art.title).replace('\n', '<br> ') + '</h2><p>' + esc(art.description) + '</p><div class="auth-art-caption"><span class="tiny-diamond"></span> SENİN YOLUN. SENİN EFSANEN.</div></div></aside><section class="auth-form-side" aria-labelledby="auth-title"><div class="auth-content"><a href="#anasayfa" class="brand auth-brand" aria-label="Metin3 ana sayfa"><span class="brand-word">METIN<span>3</span></span></a><div class="auth-heading"><p class="eyebrow"><span></span>OYUNCU PANELİ</p><h1 id="auth-title" tabindex="-1">' + title + '</h1><p>' + description + '</p></div><div class="auth-card"><nav class="auth-tabs" aria-label="Hesap işlemleri"><a href="#giris"' + (!register ? ' aria-current="page"' : '') + '>Giriş Yap</a><a href="#kayit"' + (register ? ' aria-current="page"' : '') + '>Kayıt Ol</a></nav>' + formMarkup(mode) + '<div class="auth-switch">' + (register ? 'Zaten bir hesabın var mı? <a href="#giris">Giriş yap</a>' : recovery ? '<a href="#giris">Giriş ekranına dön</a>' : 'Henüz bir hesabın yok mu? <a href="#kayit">Hesap oluştur</a>') + '</div></div><p class="auth-service-note">' + symbol('shield') + 'Oyuncu hesap servisi açıldığında giriş ve kayıt işlemleri kullanılabilir.</p><div class="auth-footer"><span>© 2026 METIN3</span><a href="#destek">Yardıma mı ihtiyacın var?</a></div></div></section></div>';
    screen.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('auth-title').focus({ preventScroll: true });
    updateArtwork();
  }

  function open(mode) {
    const target = routes[mode] || routes.login;
    if (location.hash !== target) location.hash = target;
    else document.getElementById('auth-username')?.focus();
  }

  function status(text, error) {
    const box = document.getElementById('auth-status');
    box.hidden = false;
    box.classList.toggle('is-error', Boolean(error));
    box.textContent = text;
  }

  function submitForm(form) {
    const mode = form.dataset.authForm;
    const data = new FormData(form);
    let firstError;
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    form.querySelectorAll('.auth-field-error').forEach(error => { error.textContent = ''; });
    const invalid = (name, message) => {
      const input = form.elements.namedItem(name);
      input.setAttribute('aria-invalid', 'true');
      document.getElementById('auth-' + name + '-error').textContent = message;
      firstError ||= input;
    };
    const username = String(data.get('username') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    if (mode === 'login' || mode === 'register') {
      if (!username) invalid('username', 'Kullanıcı adını gir.');
      else if (mode === 'register' && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) invalid('username', '3–24 karakter; yalnızca harf, rakam ve alt çizgi kullan.');
      if (!password) invalid('password', 'Şifreni gir.');
      else if (mode === 'register' && (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))) invalid('password', 'En az 8 karakter, bir harf ve bir rakam kullan.');
    }
    if (mode !== 'login' && (!email || !form.elements.namedItem('email').validity.valid)) invalid('email', 'Geçerli bir e-posta adresi gir.');
    if (mode === 'register' && (!data.get('confirm') || data.get('confirm') !== password)) invalid('confirm', 'Şifreler aynı olmalı.');
    if (firstError) { status('Lütfen işaretli alanları kontrol et.', true); firstError.focus(); return; }
    if (mode === 'login') {
      try {
        if (data.has('remember')) localStorage.setItem('m3-remembered-username', username);
        else localStorage.removeItem('m3-remembered-username');
      } catch (_) { /* Remembering a username is optional. */ }
    }
    // No account API is configured for this static Site. Do not persist or send
    // passwords, create fake accounts, or imply an authentication succeeded.
    form.querySelectorAll('input[type="password"],input[data-password-visible]').forEach(input => { input.value = ''; });
    status(mode === 'register' ? 'Hesap servisi henüz açılmadı. Bilgilerin gönderilmedi ve hesap oluşturulmadı.' : mode === 'login' ? 'Giriş servisi henüz açılmadı. Bilgilerin gönderilmedi ve oturum açılmadı.' : 'Hesap kurtarma servisi henüz açılmadı. E-posta gönderilmedi.', false);
  }

  function editorStatus(message, error) {
    const box = document.getElementById('auth-art-status');
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('is-error', Boolean(error));
  }

  function revokeDraftUrl() {
    if (draftUrl) { URL.revokeObjectURL(draftUrl); draftUrl = null; }
  }

  function previewDraft() {
    const image = document.getElementById('auth-art-preview');
    if (!image || !draft) return;
    revokeDraftUrl();
    draftUrl = draft.src instanceof Blob ? artSource(draft.src) : null;
    image.src = draftUrl || draft.src;
    image.style.objectPosition = draft.x + '% ' + draft.y + '%';
    document.getElementById('auth-art-x').value = draft.x;
    document.getElementById('auth-art-y').value = draft.y;
  }

  async function openEditor(trigger) {
    const mode = artMode(active);
    const stored = await savedArtwork(mode);
    if (!active || artMode(active) !== mode) return;
    draftMode = mode;
    draft = { src: (stored || config[mode]).src, x: (stored || config[mode]).x, y: (stored || config[mode]).y };
    editor.innerHTML = '<div class="art-editor-inner"><button class="icon-button art-editor-close" type="button" data-art-close aria-label="Görsel düzenleyiciyi kapat">' + symbol('close') + '</button><p class="eyebrow">' + (mode === 'register' ? 'KAYIT EKRANI' : 'GİRİŞ EKRANI') + '</p><h2 id="auth-art-title">Sol alanı düzenle.</h2><p class="art-editor-intro">Hazır bir sahne seç veya kendi karakter görselini ekle.</p><img id="auth-art-preview" class="art-editor-preview" alt="Sol alan görsel önizlemesi"><div class="art-presets">' + config.scenes.map((scene, index) => '<button type="button" data-art-preset="' + index + '"><img src="' + esc(scene.src) + '" alt=""><span>' + esc(scene.name) + '</span></button>').join('') + '</div><label class="art-upload" for="auth-art-file">' + symbol('image') + '<span><strong>Bilgisayarımdan görsel seç</strong><small>PNG, JPG, WebP veya AVIF · En fazla 10 MB</small></span><input id="auth-art-file" type="file" accept="image/png,image/jpeg,image/webp,image/avif"></label><div class="art-url-row"><label for="auth-art-url">veya görsel adresi</label><div><input id="auth-art-url" type="text" placeholder="https://… veya assets/…"><button class="button outline" type="button" data-art-load>Getir</button></div></div><div class="art-position"><label for="auth-art-x">Yatay konum<input id="auth-art-x" type="range" min="0" max="100" value="' + draft.x + '"></label><label for="auth-art-y">Dikey konum<input id="auth-art-y" type="range" min="0" max="100" value="' + draft.y + '"></label></div><p id="auth-art-status" class="art-editor-status" role="status" aria-live="polite"></p><p class="art-local-note">Seçimin yalnızca bu tarayıcıda saklanır. Giriş ve kayıt görsellerini ayrı ayrı değiştirebilirsin.</p><div class="art-editor-actions"><button class="text-link" type="button" data-art-reset>Varsayılana dön</button><button class="button primary" type="button" data-art-save>Görseli Uygula' + symbol('check') + '</button></div></div>';
    editor._returnFocus = trigger;
    previewDraft();
    editor.showModal();
  }

  async function loadDraft(src) {
    const request = ++editorRequest;
    const image = new Image();
    const url = src instanceof Blob ? URL.createObjectURL(src) : src;
    editorStatus('Görsel yükleniyor…', false);
    const save = editor.querySelector('[data-art-save]');
    save.disabled = true;
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      if (!editor.open || request !== editorRequest) return;
      draft = { src, x: 50, y: 50 };
      previewDraft();
      editorStatus('Görsel hazır. Konumunu ayarlayıp uygulayabilirsin.', false);
    } catch (_) {
      if (editor.open && request === editorRequest) editorStatus('Görsel açılamadı. Adresi veya dosyayı kontrol et.', true);
    } finally {
      if (src instanceof Blob) URL.revokeObjectURL(url);
      if (editor.open && request === editorRequest) save.disabled = false;
    }
  }

  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-auth-form]')) return;
    event.preventDefault();
    submitForm(event.target);
  });

  document.addEventListener('click', async event => {
    const target = event.target;
    if (active && target.closest('.skip-link')) {
      event.preventDefault();
      (screen.querySelector('input') || document.getElementById('auth-title')).focus();
      return;
    }
    const toggle = target.closest('[data-show-password]');
    if (toggle) {
      const input = document.getElementById(toggle.dataset.showPassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      input.toggleAttribute('data-password-visible', show);
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', input.labels[0].textContent + (show ? ' gizle' : ' göster'));
      return;
    }
    const edit = target.closest('[data-edit-auth-art]');
    if (edit) { openEditor(edit); return; }
    if (target.closest('[data-art-close]')) { editor.close(); return; }
    const preset = target.closest('[data-art-preset]');
    if (preset) {
      editorRequest++;
      const scene = config.scenes[Number(preset.dataset.artPreset)];
      draft = { src: scene.src, x: scene.x, y: scene.y };
      previewDraft();
      editor.querySelector('[data-art-save]').disabled = false;
      editorStatus(scene.name + ' seçildi.', false);
      return;
    }
    if (target.closest('[data-art-load]')) {
      const value = document.getElementById('auth-art-url').value.trim();
      let url;
      try {
        url = new URL(value, location.href);
        if (!value || (url.protocol !== 'https:' && !/^assets\/[\w./-]+$/.test(value))) throw new Error('Invalid URL');
      } catch (_) { editorStatus('HTTPS görsel adresi veya assets/ ile başlayan bir dosya yolu gir.', true); return; }
      loadDraft(/^assets\//.test(value) ? value : url.href);
      return;
    }
    const save = target.closest('[data-art-save]');
    const reset = target.closest('[data-art-reset]');
    if (save || reset) {
      const button = save || reset;
      button.disabled = true;
      try {
        await writeArtwork(draftMode, reset ? null : draft);
        updateArtwork();
        editor.close();
      } catch (_) { editorStatus('Tarayıcı görseli kaydedemedi. Depolama iznini ve boş alanı kontrol edip tekrar dene.', true); }
      finally { button.disabled = false; }
    }
  });

  editor.addEventListener('change', event => {
    if (event.target.id !== 'auth-art-file') return;
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      editorStatus('PNG, JPG, WebP veya AVIF biçiminde, 10 MB altında bir görsel seç.', true);
      event.target.value = '';
      return;
    }
    loadDraft(file);
  });
  editor.addEventListener('input', event => {
    if (!draft || !['auth-art-x', 'auth-art-y'].includes(event.target.id)) return;
    draft[event.target.id === 'auth-art-x' ? 'x' : 'y'] = Number(event.target.value);
    document.getElementById('auth-art-preview').style.objectPosition = draft.x + '% ' + draft.y + '%';
  });
  editor.addEventListener('click', event => {
    if (event.target !== editor) return;
    const rect = editor.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) editor.close();
  });
  editor.addEventListener('close', () => {
    editorRequest++;
    revokeDraftUrl();
    editor._returnFocus?.focus({ preventScroll: true });
  });
  window.M3AUTH = { open };
  window.addEventListener('hashchange', render);
  render();
})();
