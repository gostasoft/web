'use strict';
(async function () {
  await window.M3CMS_READY;
  const cmsText = (key, fallback) => window.M3CMS.text(key, fallback);
  const content = window.M3CONTENT;
  if (!content) return;
  const $ = function (selector) { return document.querySelector(selector); };
  const $$ = function (selector) { return Array.from(document.querySelectorAll(selector)); };
  const esc = function (value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); };
  const icon = function (name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };
  const state = { filter: 'Tümü', allNews: false, classIndex: 0, worldIndex: 0 };
  const dialog = $('#site-dialog');
  const dialogContent = $('#dialog-content');
  let modalTrigger = null;
  let modalDestination = null;

  function renderNews() {
    const ordered = content.news;
    const categories = ['Tümü', ...new Set(ordered.map(item => item.category).filter(category => category && category !== 'Tümü'))];
    if (!categories.includes(state.filter)) state.filter = 'Tümü';
    if ($$('.filter').map(button => button.dataset.filter).join('\u0000') !== categories.join('\u0000')) {
      $('.filter-bar').innerHTML = categories.map(category => '<button class="filter" data-filter="' + esc(category) + '" aria-pressed="false">' + esc(category) + '</button>').join('');
    }
    const filtered = ordered.filter(function (item) { return state.filter === 'Tümü' || item.category === state.filter; });
    const visible = state.allNews || state.filter !== 'Tümü' ? filtered : filtered.slice(0, 3);
    $('#news-grid').innerHTML = visible.map(function (item) {
      return '<button class="news-card" data-article="' + esc(item.id) + '" aria-label="' + esc(item.title) + ' yazısını oku"><div class="news-card-image"><img src="' + esc(item.img) + '" alt="" width="1280" height="720" loading="lazy"><span class="news-category">' + esc(item.category.toLocaleUpperCase('tr')) + '</span></div><div class="news-card-body"><h3>' + esc(item.title) + '</h3><p>' + esc(item.excerpt) + '</p><span class="read-line"><span>' + esc(item.readTime) + ' okuma</span>' + icon('arrow') + '</span></div></button>';
    }).join('');
    $$('.filter').forEach(function (button) {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#all-news').hidden = state.filter !== 'Tümü' || filtered.length <= 3;
    $('#all-news').innerHTML = esc(state.allNews ? cmsText('button.lessNews', 'Daha Az Göster') : cmsText('button.allNews', 'Tüm Haberleri Gör')) + icon('arrow');
  }

  function renderClasses() {
    $('#class-tabs').innerHTML = content.classes.map(function (item, index) {
      return '<button class="class-card" role="tab" id="class-' + esc(item.id) + '" data-class="' + index + '" aria-selected="' + (index === state.classIndex) + '" aria-controls="class-detail" tabindex="' + (index === state.classIndex ? '0' : '-1') + '"><img src="' + esc(item.img) + '" alt="" width="195" height="260" loading="lazy"><span class="class-card-copy">' + (item.symbol ? '<img class="class-symbol" src="' + esc(item.symbol) + '" alt="" width="48" height="48">' : '') + '<span class="class-index">0' + (index + 1) + '</span><strong>' + esc(item.name) + '</strong><small>' + esc(item.style) + '</small></span></button>';
    }).join('');
    renderClassDetail();
  }

  function selectClass(index, focus) {
    state.classIndex = (index + content.classes.length) % content.classes.length;
    $$('.class-card').forEach(function (button, i) {
      const active = i === state.classIndex;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    renderClassDetail();
  }

  function renderClassDetail() {
    const item = content.classes[state.classIndex];
    $('#class-detail').setAttribute('aria-labelledby', 'class-' + item.id);
    $('#class-detail').innerHTML = '<div><p class="eyebrow">' + esc(item.eyebrow) + '</p><h3>' + esc(item.headline) + '</h3><span class="class-note">' + esc(item.classNote) + '</span></div><div class="class-detail-description"><p>' + esc(item.description) + '</p><button class="text-link" data-modal="register">' + esc(item.name) + ' ' + esc(cmsText('button.classStory', 'ile hikâyeni yaz')) + icon('arrow') + '</button></div>';
  }

  function renderWorldTabs() {
    $('#world-tabs').innerHTML = content.worlds.map(function (item, index) {
      return '<button class="world-tab" role="tab" id="world-' + esc(item.id) + '" data-world="' + index + '" aria-controls="world-stage" aria-selected="' + (index === state.worldIndex) + '" tabindex="' + (index === state.worldIndex ? '0' : '-1') + '"><span class="world-number">' + esc(item.number) + '</span><span><strong>' + esc(item.title) + '</strong><small>' + esc(item.eyebrow) + '</small></span>' + icon('arrow') + '</button>';
    }).join('');
    selectWorld(0, false);
  }

  function selectWorld(index, focus) {
    state.worldIndex = (index + content.worlds.length) % content.worlds.length;
    const item = content.worlds[state.worldIndex];
    $$('.world-tab').forEach(function (button, i) {
      const active = i === state.worldIndex;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    const image = $('#world-image');
    image.src = item.img;
    image.alt = item.title + ' — Metin3 dünyasından bir manzara';
    $('#world-stage').setAttribute('aria-labelledby', 'world-' + item.id);
    $('#world-caption').innerHTML = '<p class="eyebrow">' + esc(item.number) + ' / ' + esc(item.eyebrow) + '</p><h3>' + esc(item.title) + '</h3><p>' + esc(item.description) + '</p>';
    $('#world-expand').setAttribute('aria-label', item.title + ' görselini büyüt');
  }

  function renderFaq() {
    $('#faq-list').innerHTML = content.faq.map(function (item) {
      return '<details class="faq-item" name="metin3-faq"><summary>' + esc(item.question) + '</summary><p>' + esc(item.answer) + '</p></details>';
    }).join('');
  }

  function showDialog(html, gallery) {
    modalTrigger = document.activeElement;
    modalDestination = null;
    dialog.classList.toggle('gallery-dialog', Boolean(gallery));
    dialogContent.innerHTML = html;
    document.body.classList.add('modal-open');
    if (!dialog.open) dialog.showModal();
    $('.dialog-close').focus({ preventScroll: true });
  }

  function openArticle(id) {
    const item = content.news.find(function (article) { return article.id === id; });
    if (!item) return;
    showDialog('<img class="article-image" src="' + esc(item.img) + '" alt="" width="1280" height="720"><article class="modal-pad article-body"><div class="modal-label"><span>' + esc(item.category.toLocaleUpperCase('tr')) + '</span><span>' + esc(item.readTime) + ' okuma</span></div><h2 id="dialog-title">' + esc(item.title) + '</h2>' + item.body.map(function (paragraph) { return '<p>' + esc(paragraph) + '</p>'; }).join('') + '<div class="modal-actions"><button class="button outline" data-close>Haberlere Dön' + icon('arrow') + '</button></div></article>', false);
  }

  function openGallery(src, title) {
    showDialog('<figure><img src="' + esc(src) + '" alt="' + esc(title) + '"><figcaption id="dialog-title">' + esc(title) + '</figcaption></figure>', true);
  }

  function openModal(type) {
    const configuredLink = window.M3CMS.link(type);
    if (configuredLink && ['download', 'community'].includes(type)) { location.assign(configuredLink); return; }
    if (type === 'download') {
      showDialog('<div class="modal-pad"><p class="eyebrow">YOLCULUĞA İLK ADIM</p><h2 id="dialog-title">Yeni bir dünyaya<br>hazır mısın?</h2><p>İndirme bağlantıları hazır olduğunda bu alanda paylaşılacak. O zamana kadar Metin3 dünyasına ve karakterlerine göz atabilirsin.</p><div class="availability-row">' + icon('download') + '<div><strong>Oyun İstemcisi</strong><small>İndirme bilgileri duyurulacak</small></div><span class="soon-pill">Yakında</span></div><div class="modal-actions"><button class="button primary" data-jump="#dunya">Dünyayı Keşfet' + icon('arrow') + '</button><button class="button outline" data-jump="#haberler">Duyurular</button></div><p class="modal-note">Bu web önizlemesinden dosya indirilmez.</p></div>', false);
    } else if (type === 'register' || type === 'account') {
      window.M3AUTH.open(type === 'register' ? 'register' : 'login');
    } else if (type === 'community') {
      showDialog('<div class="modal-pad"><p class="eyebrow">BİRLİKTE DAHA GÜÇLÜ</p><h2 id="dialog-title">Yol arkadaşlarını bul.</h2><p>Aynı dünyaya merak duyan oyuncularla buluş, hikâyeni paylaş. Resmî topluluk bağlantıları duyurulduğunda bu alanda yer alacak.</p><div class="modal-actions"><button class="button primary" data-jump="#haberler">Duyuruları Takip Et' + icon('chat') + '</button><button class="button outline" data-jump="#destek">Sorularına Yanıt Bul</button></div></div>', false);
    } else if (type === 'about') {
      showDialog('<div class="modal-pad"><p class="eyebrow">METIN3 WEB KONSEPTİ</p><h2 id="dialog-title">Eski ruh.<br>Yeni bir görünüm.</h2><p>Grand2 ana sayfasındaki tanıtım, indirme ve oyuncu erişimi yapısından esinlenilerek Metin3 için yeni bir görsel düzen hazırlandı.</p><p>Bu önizlemede sınıf seçimi, haber filtreleri, yazı pencereleri, dünya sahneleri ve menüler gezilebilir. Haberler örnek tanıtım içeriğidir; gerçek oyuncu hesabı veya oyun indirmesi sunulmaz.</p><div class="modal-actions"><button class="button primary" data-close>Keşfetmeye Devam Et' + icon('arrow') + '</button></div></div>', false);
    }
  }

  document.addEventListener('click', function (event) {
    const target = event.target;
    const article = target.closest('[data-article]');
    if (article) { openArticle(article.dataset.article); return; }
    const modal = target.closest('[data-modal]');
    if (modal) { openModal(modal.dataset.modal); return; }
    const classButton = target.closest('[data-class]');
    if (classButton) { selectClass(Number(classButton.dataset.class), false); return; }
    const worldButton = target.closest('[data-world]');
    if (worldButton) { selectWorld(Number(worldButton.dataset.world), false); return; }
    const filter = target.closest('[data-filter]');
    if (filter) { state.filter = filter.dataset.filter; state.allNews = false; renderNews(); return; }
    if (target.closest('[data-close]')) { dialog.close(); return; }
    const jump = target.closest('[data-jump]');
    if (jump) { modalDestination = $(jump.dataset.jump); dialog.close(); }
  });
  $('#all-news').addEventListener('click', function () { state.allNews = !state.allNews; renderNews(); });
  $('[data-gallery="hero"]').addEventListener('click', function () { openGallery(window.M3CMS.image('hero.main', 'assets/hero.webp').src, 'Metin3 — Kadim Dünya'); });
  $('#world-expand').addEventListener('click', function () { const item = content.worlds[state.worldIndex]; openGallery(item.img, item.title); });
  $('.dialog-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', function () {
    document.body.classList.remove('modal-open');
    if (modalDestination) {
      const destination = modalDestination;
      const focusTarget = destination.querySelector('h2,h1') || destination;
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
      destination.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      modalDestination = null;
    } else if (modalTrigger && modalTrigger.isConnected) modalTrigger.focus({ preventScroll: true });
  });
  const menu = $('#mobile-nav');
  const menuToggle = $('.menu-toggle');
  function closeMenu() { menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Menüyü aç'); }
  window.matchMedia('(min-width: 721px)').addEventListener('change', function (event) { if (event.matches) closeMenu(); });
  menuToggle.addEventListener('click', function () { const open = menuToggle.getAttribute('aria-expanded') !== 'true'; menu.hidden = !open; menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç'); });
  menu.addEventListener('click', function (event) { if (event.target.closest('a,button')) closeMenu(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
    const classButton = event.target.closest('[data-class]');
    const worldButton = event.target.closest('[data-world]');
    if (!classButton && !worldButton) return;
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const isClass = Boolean(classButton);
    const current = isClass ? state.classIndex : state.worldIndex;
    const length = isClass ? content.classes.length : content.worlds.length;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1);
    if (isClass) selectClass(next, true); else selectWorld(next, true);
  });
  window.M3APP = { refresh: function () {
    if (state.classIndex >= content.classes.length) state.classIndex = 0;
    state.worldIndex = 0;
    renderNews(); renderClasses(); renderWorldTabs(); renderFaq();
    window.M3CMS.refreshDOM();
  } };
  window.M3APP.refresh();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('.desktop-nav a').forEach(function (link) { if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    $$('main section[id]').forEach(function (section) { observer.observe(section); });
  }
})();
