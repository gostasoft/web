'use strict';
(async function () {
  await window.M3CMS_READY;

  const screen = document.getElementById('auth-main');
  if (!window.M3AUTH_CONFIG || !screen) return;
  const home = document.getElementById('main');
  const footer = document.querySelector('.site-footer');
  const initialTitle = document.title;
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const routes = { login: '#giris', register: '#kayit', password: '#sifre-yenile', username: '#kullanici-adi' };
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const symbol = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const text = (key, fallback) => window.M3CMS?.text(key, fallback) ?? fallback;
  const artMode = mode => mode === 'register' ? 'register' : 'login';
  const percentage = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback;
  let active = null;

  function clearRememberedUsername() {
    try { localStorage.removeItem('m3-remembered-username'); } catch (_) { /* Browser storage is optional. */ }
  }
  // The earlier preview could remember any entered name. Clear that legacy
  // value before a form is shown; private credentials must never be prefilled.
  clearRememberedUsername();

  function artwork(mode) {
    const defaults = window.M3AUTH_CONFIG[artMode(mode)];
    const image = window.M3CMS?.image('auth.' + artMode(mode), defaults.src) || defaults;
    return {
      ...defaults,
      src: image.src || defaults.src,
      x: percentage(image.x, percentage(defaults.x, 50)),
      y: percentage(image.y, percentage(defaults.y, 50)),
      fit: image.fit === 'contain' ? 'contain' : 'cover'
    };
  }

  function field(name, label, type, options) {
    const opts = options || {};
    const password = type === 'password';
    return '<div class="auth-field"><label for="auth-' + name + '">' + esc(label) + '</label><div class="auth-input">' +
      symbol(opts.icon || (password ? 'shield' : 'user')) +
      '<input id="auth-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + (opts.autocomplete || 'off') + '"' +
      (opts.optional ? '' : ' required') + ' maxlength="' + (password ? '128' : '100') + '"' +
      (opts.value ? ' value="' + esc(opts.value) + '"' : '') + ' placeholder="' + esc(opts.placeholder || label) +
      '" aria-describedby="auth-' + name + '-error' + (opts.hint ? ' auth-' + name + '-hint' : '') + '">' +
      (password ? '<button type="button" class="password-toggle" data-show-password="auth-' + name +
        '" aria-label="' + esc(label) + ' göster" aria-pressed="false">' + symbol('eye') + '</button>' : '') +
      '</div>' + (opts.hint ? '<small class="auth-hint" id="auth-' + name + '-hint">' + esc(opts.hint) + '</small>' : '') +
      '<small class="auth-field-error" id="auth-' + name + '-error"></small></div>';
  }

  function formMarkup(mode) {
    const register = mode === 'register';
    const recovery = mode === 'password' || mode === 'username';
    let fields = '';
    if (register) fields += field('name', text('form.name', 'Adın ve soyadın'), 'text', {
      autocomplete: 'name', optional: true, placeholder: text('form.name', 'Adın ve soyadın') + ' (isteğe bağlı)'
    });
    if (!recovery) fields += field('username', text('form.username', 'Kullanıcı adı'), 'text', {
      autocomplete: 'username'
    });
    if (register || recovery) fields += field('email', text('form.email', 'E-posta adresi'), 'email', {
      autocomplete: 'email', icon: 'mail', placeholder: 'ornek@eposta.com'
    });
    if (!recovery) fields += field('password', text('form.password', 'Şifre'), 'password', {
      autocomplete: register ? 'new-password' : 'current-password',
      hint: register ? 'En az 8 karakter, bir harf ve bir rakam.' : ''
    });
    if (register) fields += field('confirm', text('form.passwordConfirm', 'Şifre tekrar'), 'password', { autocomplete: 'new-password' });
    const extra = mode === 'login' ? '<div class="auth-options"><label class="auth-checkbox" title="Oyuncu hesap servisi açıldığında kullanılabilir."><input name="remember" type="checkbox" disabled><span>' + esc(text('form.remember', 'Kullanıcı adımı hatırla')) +
      '</span></label><a href="#sifre-yenile">' + esc(text('form.forgotPassword', 'Şifremi unuttum')) + '</a></div>' : '';
    const submit = register ? text('button.register', 'Hesap Oluştur') : mode === 'login' ? text('button.login', 'Giriş Yap') : 'Devam Et';
    return '<form class="auth-form" data-auth-form="' + mode + '" novalidate>' + fields + extra +
      '<div class="auth-status" id="auth-status" role="status" aria-live="polite" hidden></div>' +
      '<button class="button primary full auth-submit" type="submit">' + esc(submit) + symbol('arrow') + '</button>' +
      (mode === 'login' ? '<a class="auth-username-help" href="#kullanici-adi">' + esc(text('form.forgotUsername', 'Kullanıcı adımı unuttum')) + '</a>' : '') +
      '</form>';
  }

  function render(force, focus) {
    const mode = Object.keys(routes).find(key => routes[key] === location.hash);
    if (!mode) {
      if (!active) return;
      active = null;
      screen.hidden = true;
      screen.replaceChildren();
      if (home) home.hidden = false;
      if (footer) footer.hidden = false;
      document.body.classList.remove('auth-open');
      document.title = initialTitle;
      if (!preview && focus !== false) {
        const target = document.getElementById(location.hash.slice(1)) || home;
        if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
      }
      return;
    }
    if (mode === active && !force) return;
    active = mode;
    const register = mode === 'register';
    const recovery = mode === 'password' || mode === 'username';
    const art = artwork(mode);
    const logo = window.M3CMS?.image('brand.logo', 'assets/brand/metin3-logo.png') || { src: 'assets/brand/metin3-logo.png' };
    const title = register ? text('auth.register.title', 'Efsanen burada başlıyor.') :
      mode === 'password' ? 'Şifreni yenile.' : mode === 'username' ? 'Hesabını yeniden bul.' : text('auth.login.title', 'Tekrar hoş geldin.');
    const description = register ? text('auth.register.description', 'Yeni bir yolculuk için kendi hesabını oluştur.') :
      recovery ? 'Hesabına bağlı e-posta adresiyle devam et.' : text('auth.login.description', 'Hesabına giriş yap, hikâyene devam et.');
    const loginLabel = esc(text('button.login', 'Giriş Yap'));
    const registerLabel = esc(text('button.register', 'Kayıt Ol'));
    document.title = (register ? text('button.register', 'Kayıt Ol') : recovery ? 'Hesap Yardımı' : text('button.login', 'Giriş Yap')) + ' | Metin3';
    if (home) home.hidden = true;
    if (footer) footer.hidden = true;
    document.body.classList.add('auth-open');
    document.querySelectorAll('.desktop-nav [aria-current]').forEach(link => link.removeAttribute('aria-current'));
    screen.innerHTML = '<div class="auth-layout">' +
      '<aside class="auth-showcase" aria-label="Metin3 dünyası">' +
      '<img id="auth-art" src="' + esc(art.src) + '" alt="Metin3 dünyasından fantastik karakter ve manzara" style="object-position:' +
      art.x + '% ' + art.y + '%;object-fit:' + art.fit + '">' +
      '<div class="auth-art-shade"></div><div class="auth-showcase-top"><a class="auth-back" href="#anasayfa">' +
      symbol('arrow') + esc(text('button.returnHome', 'Anasayfaya dön')) + '</a></div><div class="auth-showcase-copy">' +
      '<span class="auth-ornament" aria-hidden="true"></span><p class="eyebrow">' + esc(art.eyebrow) +
      '</p><h2>' + esc(art.title).replace(/\r?\n/g, '<br> ') + '</h2><p>' + esc(art.description) +
      '</p><div class="auth-art-caption"><span class="tiny-diamond"></span> SENİN YOLUN. SENİN EFSANEN.</div></div></aside>' +
      '<section class="auth-form-side" aria-labelledby="auth-title"><div class="auth-content">' +
      '<a href="#anasayfa" class="brand auth-brand" aria-label="Metin3 ana sayfa"><img class="brand-logo" src="' +
      esc(logo.src || 'assets/brand/metin3-logo.png') + '" alt="Metin3"></a>' +
      '<div class="auth-heading"><p class="eyebrow"><span></span>OYUNCU PANELİ</p><h1 id="auth-title" tabindex="-1">' +
      esc(title) + '</h1><p>' + esc(description) + '</p></div><div class="auth-card"><nav class="auth-tabs" aria-label="Hesap işlemleri">' +
      '<a href="#giris"' + (!register ? ' aria-current="page"' : '') + '>' + loginLabel + '</a>' +
      '<a href="#kayit"' + (register ? ' aria-current="page"' : '') + '>' + registerLabel + '</a></nav>' +
      formMarkup(mode) + '<div class="auth-switch">' + (register ? 'Zaten bir hesabın var mı? <a href="#giris">' +
        loginLabel + '</a>' : recovery ? '<a href="#giris">Giriş ekranına dön</a>' :
        'Henüz bir hesabın yok mu? <a href="#kayit">' + registerLabel + '</a>') +
      '</div></div><p class="auth-service-note">' + symbol('shield') +
      'Oyuncu hesap servisi açıldığında giriş ve kayıt işlemleri kullanılabilir.</p><div class="auth-footer">' +
      '<span>' + esc(text('footer.copyright', '© 2026 METIN3')) + '</span><a data-cms-link="support" data-cms-fallback="#destek" href="' + esc(window.M3CMS.link('support') || '#destek') + '">Yardıma mı ihtiyacın var?</a></div></div></section></div>';
    screen.hidden = false;
    const image = document.getElementById('auth-art');
    image.addEventListener('error', () => {
      const fallback = window.M3AUTH_CONFIG[artMode(mode)];
      if (image.getAttribute('src') !== fallback.src) image.src = fallback.src;
    }, { once: true });
    if (!preview && focus !== false) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('auth-title').focus({ preventScroll: true });
    }
  }

  function open(mode) {
    const target = routes[mode] || routes.login;
    if (location.hash !== target) location.hash = target;
    else if (!preview) (screen.querySelector('input') || document.getElementById('auth-title'))?.focus();
  }

  function status(message, error) {
    const box = document.getElementById('auth-status');
    box.hidden = false;
    box.classList.toggle('is-error', Boolean(error));
    box.textContent = message;
  }

  async function submitForm(form) {
    if (form.dataset.submitting === 'true') return;
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
    const clearPasswords = () => form.querySelectorAll('input[type="password"],input[data-password-visible]').forEach(input => { input.value = ''; });
    if (mode !== 'login') {
      // Registration and recovery do not have a player-account API. Never send
      // these fields or imply an account or recovery email has been created.
      clearPasswords();
      status(mode === 'register' ? 'Hesap servisi henüz açılmadı. Bilgilerin gönderilmedi ve hesap oluşturulmadı.' :
        'Hesap kurtarma servisi henüz açılmadı. E-posta gönderilmedi.', false);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const buttonMarkup = submitButton.innerHTML;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.textContent = 'Kontrol ediliyor…';
    status('Giriş bilgilerin kontrol ediliyor…', false);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      let result = {};
      try { result = await response.json(); } catch (_) { /* Treat malformed responses as unsuccessful. */ }
      if (response.ok && result.authenticated === true) {
        clearRememberedUsername();
        clearPasswords();
        window.location.assign('/admin');
        return;
      }
      if (form.isConnected) {
        status(response.status === 401 ? 'Kullanıcı adı veya şifre hatalı.' :
          response.status === 429 ? 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar dene.' :
          'Giriş işlemi tamamlanamadı. Lütfen daha sonra tekrar dene.', true);
      }
    } catch (_) {
      if (form.isConnected) status('Giriş sunucusuna ulaşılamadı. Bağlantını kontrol edip tekrar dene.', true);
    } finally {
      clearTimeout(timeout);
      clearPasswords();
      delete form.dataset.submitting;
      form.removeAttribute('aria-busy');
      submitButton.disabled = false;
      submitButton.innerHTML = buttonMarkup;
    }
  }

  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-auth-form]')) return;
    event.preventDefault();
    submitForm(event.target);
  });
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (active && target.closest('.skip-link')) {
      event.preventDefault();
      (screen.querySelector('input') || document.getElementById('auth-title'))?.focus();
      return;
    }
    const toggle = target.closest('[data-show-password]');
    if (!toggle) return;
    const input = document.getElementById(toggle.dataset.showPassword);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    input.toggleAttribute('data-password-visible', show);
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', input.labels[0].textContent + (show ? ' gizle' : ' göster'));
  });
  window.M3AUTH = {
    open,
    refresh: () => render(true, false)
  };
  window.addEventListener('hashchange', () => render(false, true));
  render(false, true);
})();

