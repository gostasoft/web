/* Shared data model for the site editor and public page renderer. */
(function () {
  'use strict';
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const builtinCatalog = [
    { source: 'hero', label: 'Ana sahne' },
    { source: 'start', label: 'Başlangıç adımları' },
    { source: 'news', label: 'Haberler ve hesap alanı' },
    { source: 'classes', label: 'Karakter sınıfları' },
    { source: 'world', label: 'Dünya galerisi' },
    { source: 'faq', label: 'Sık sorulan sorular' },
    { source: 'community', label: 'Topluluk çağrısı' }
  ];
  const catalog = [
    { kind: 'text', label: 'Başlık ve metin', description: 'Tanıtım, kurallar veya uzun açıklamalar.' },
    { kind: 'imageText', label: 'Görsel ve metin', description: 'Bir görselin yanında başlık ve açıklama.' },
    { kind: 'cards', label: 'Bilgi kartları', description: 'Özellikler, bağlantılar veya rehber kartları.' },
    { kind: 'gallery', label: 'Görsel galerisi', description: 'Ekran görüntüleri ve açıklamalı görseller.' },
    { kind: 'faq', label: 'Soru ve cevap', description: 'Açılır sorular ve yanıtlar.' },
    { kind: 'cta', label: 'Duyuru ve buton', description: 'Öne çıkan bir mesaj ve yönlendirme butonu.' },
    { kind: 'canvas', label: 'Serbest tasarım', description: 'Metin, görsel, buton ve kutuları sürükleyip boyutlandır.' }
  ];
  function uid(prefix = 'block') {
    const suffix = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    return prefix + '-' + suffix;
  }
  function slugify(text) {
    return String(text || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .replace(/^[^a-z]+/, '').slice(0, 60).replace(/-+$/, '') || 'yeni-sayfa';
  }
  const emptyImage = () => ({ src: '', x: 50, y: 50, fit: 'cover' });
  function artwork(doc) {
    return copy(doc?.images?.['hero.main'] || { src: 'assets/hero.webp', x: 50, y: 42, fit: 'cover' });
  }
  function createSection(kind = 'text', doc) {
    if (!catalog.some((entry) => entry.kind === kind)) kind = 'text';
    const definition = catalog.find((entry) => entry.kind === kind);
    const section = {
      id: uid('bolum'), kind, visible: true,
      eyebrow: 'MET3 ONLINE', title: definition.label, body: '',
      image: kind === 'imageText' ? artwork(doc) : emptyImage(),
      button: { label: '', href: '' },
      style: { tone: 'dark', align: 'left', spacing: 'normal', imageSide: 'left' },
      items: []
    };
    if (kind === 'cta') section.button = { label: 'Hemen katıl', href: '#kayit' };
    if (kind === 'canvas') section.canvas = window.M3CANVAS?.createCanvas() || { version: 1, desktop: { height: 800 }, mobile: { height: 1000 }, elements: [] };
    if (['cards', 'gallery', 'faq'].includes(kind)) {
      section.items.push({ id: uid('oge'), title: kind === 'faq' ? 'Sorunu buraya yaz' : 'İlk öğe', body: '', image: kind === 'gallery' ? artwork(doc) : emptyImage(), href: '' });
    }
    return section;
  }
  function createPage(doc) {
    return { id: uid('sayfa'), slug: 'yeni-sayfa', title: 'Yeni sayfa', description: '', published: false, sections: [createSection('text', doc)] };
  }
  function defaults(doc) {
    const texts = doc?.texts || {};
    return {
      version: 1,
      home: builtinCatalog.map(({ source }) => ({ id: 'yerlesik-' + source, kind: 'builtin', source, visible: true })),
      pages: [],
      navigation: [
        ['home', 'Ana Sayfa', '#anasayfa'], ['world', 'Dünya', '#dunya'],
        ['classes', 'Sınıflar', '#siniflar'], ['news', 'Haberler', '#haberler'], ['support', 'Destek', '#destek']
      ].map(([key, label, href]) => ({ id: 'menu-' + key, label: texts['nav.' + key] ?? label, href, visible: true }))
    };
  }
  function normalize(builder, doc) {
    if (!builder || typeof builder !== 'object' || Array.isArray(builder)) return defaults(doc);
    const baseline = defaults(doc);
    return {
      ...copy(builder), version: 1,
      home: Array.isArray(builder.home) ? copy(builder.home) : baseline.home,
      pages: Array.isArray(builder.pages) ? copy(builder.pages) : [],
      navigation: Array.isArray(builder.navigation) ? copy(builder.navigation) : baseline.navigation
    };
  }
  window.M3BUILDER = { defaults, normalize, createSection, createPage, uid, slugify, catalog, builtinCatalog, pageHref: (page) => '#sayfa/' + page.slug };
})();
