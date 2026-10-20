'use strict';
(function (root) {
  const effects = new Set(['attack', 'magic', 'energy']);

  // Only local assets; no remote requests, traversal, script or data URLs.
  function sources(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.filter(item => {
      if (!item || typeof item.src !== 'string' || !/^\/?assets\/[a-z0-9_./-]+\.(webm|mp4)$/i.test(item.src) || item.src.includes('..')) return false;
      const type = /\.webm$/i.test(item.src) ? 'video/webm' : 'video/mp4';
      if (item.type !== type || seen.has(item.src)) return false;
      seen.add(item.src);
      return true;
    }).slice(0, 2).map(item => ({ src: item.src, type: item.type }));
  }

  function canMove(state) {
    return state.visible && !state.hidden && !state.reduced && !state.paused && !state.saveData;
  }

  function mount(section, config) {
    if (!section) return { select() {}, destroy() {} };
    const doc = section.ownerDocument;
    const motionQuery = root.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = root.navigator.connection;
    const toggle = section.querySelector('[data-character-motion]');
    const note = section.querySelector('[data-character-note]');
    const cleanups = [];
    let paused = false;
    let destroyed = false;
    let hover = null;
    let frame = 0;
    let observer;
    try { paused = root.sessionStorage.getItem('met3.characterMotionPaused') === '1'; } catch (_) { /* Storage may be disabled. */ }

    function listen(target, event, callback) {
      if (!target?.addEventListener) return;
      target.addEventListener(event, callback);
      cleanups.push(() => target.removeEventListener(event, callback));
    }

    const cards = Array.from(section.querySelectorAll('[data-character-id]')).map(card => {
      const entry = config?.[card.dataset.characterId] || {};
      const item = {
        card, entry, visible: false, clips: {}, current: null, action: false,
        badge: card.querySelector('[data-character-status]')
      };
      card.dataset.effect = effects.has(entry.effect) ? entry.effect : 'energy';
      for (const kind of ['idle', 'action']) {
        const candidates = sources(entry[kind]);
        if (!candidates.length) continue;
        const video = doc.createElement('video');
        video.className = 'm3-character-video';
        video.muted = true;
        video.defaultMuted = true;
        video.loop = kind === 'idle';
        video.playsInline = true;
        video.preload = 'none';
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        video.setAttribute('disablepictureinpicture', '');
        video.tabIndex = -1;
        card.querySelector('.m3-character-media').append(video);
        const clip = { video, candidates, loaded: false, failed: false, running: false, pending: false, epoch: 0 };
        item.clips[kind] = clip;
        listen(video, 'playing', () => {
          if (item.current !== clip || !clip.running) { video.pause(); return; }
          card.classList.add('m3-has-video');
          video.classList.add('is-playing');
          updateNote();
        });
        listen(video, 'error', () => {
          clip.failed = true;
          stop(clip);
          if (kind === 'action') item.action = false;
          sync();
        });
        listen(video, 'ended', () => { if (kind === 'action') { item.action = false; sync(); } });
      }
      listen(card, 'pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        hover = item;
        sync();
      });
      listen(card, 'pointerleave', () => {
        if (hover === item) hover = null;
        resetLight(card);
        sync();
      });
      listen(card, 'pointermove', event => {
        if (event.pointerType !== 'mouse' || !canMove(policy(item))) return;
        if (frame) root.cancelAnimationFrame(frame);
        const x = event.clientX, y = event.clientY;
        frame = root.requestAnimationFrame(() => {
          frame = 0;
          if (destroyed) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--m3-light-x', Math.max(0, Math.min(100, (x - rect.left) / rect.width * 100)) + '%');
          card.style.setProperty('--m3-light-y', Math.max(0, Math.min(100, (y - rect.top) / rect.height * 100)) + '%');
        });
      });
      return item;
    });

    function policy(item) {
      const rect = item.card.getBoundingClientRect();
      return {
        visible: item.visible && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < root.innerHeight,
        hidden: doc.hidden, reduced: motionQuery.matches, paused,
        saveData: Boolean(connection?.saveData)
      };
    }

    function resetLight(card) {
      card.style.removeProperty('--m3-light-x');
      card.style.removeProperty('--m3-light-y');
    }

    function stop(clip) {
      if (!clip) return;
      clip.running = false;
      clip.pending = false;
      clip.epoch++;
      clip.video.pause();
      clip.video.classList.remove('is-playing');
    }

    function play(item, clip) {
      if (clip.running || clip.pending || clip.failed) return;
      if (!clip.loaded) {
        clip.loaded = true;
        for (const candidate of clip.candidates) {
          const source = doc.createElement('source');
          source.src = candidate.src;
          source.type = candidate.type;
          clip.video.append(source);
        }
        clip.video.load();
      }
      clip.running = true;
      clip.pending = true;
      const epoch = ++clip.epoch;
      Promise.resolve(clip.video.play()).then(() => {
        if (epoch !== clip.epoch || destroyed) return;
        clip.pending = false;
      }).catch(() => {
        if (epoch !== clip.epoch || destroyed) return;
        clip.failed = true; // Autoplay denial or a broken file must keep a usable poster.
        stop(clip);
        item.action = false;
        sync();
      });
    }

    function updateNote() {
      let configured = 0, running = 0;
      cards.forEach(item => {
        const usable = Object.values(item.clips).some(clip => !clip.failed);
        if (usable) configured++;
        const playing = item.current?.video.classList.contains('is-playing');
        if (playing) running++;
        if (item.badge) item.badge.textContent = playing ? 'Animasyon' : usable ? 'Video hazır' : 'Görsel önizleme';
      });
      const hasMedia = cards.some(item => Object.keys(item.clips).length);
      if (note) note.textContent = configured === 0
        ? hasMedia ? 'Animasyon şu anda oynatılamıyor. Mevcut karakter görselleri gösteriliyor.' : 'Karakter animasyonları henüz eklenmedi. Mevcut karakter görselleri gösteriliyor.'
        : running ? 'Seçili karakterin animasyonu oynatılıyor. Diğer karakterler beklemede.'
          : 'Karakter görselleri gösteriliyor. Animasyonlar görünürlük ve hareket tercihlerine göre oynatılır.';
    }

    function sync() {
      if (destroyed) return;
      const limited = motionQuery.matches || paused || Boolean(connection?.saveData);
      section.classList.toggle('m3-motion-off', limited);
      if (toggle) {
        toggle.disabled = motionQuery.matches || Boolean(connection?.saveData);
        toggle.setAttribute('aria-pressed', String(!limited));
        toggle.textContent = motionQuery.matches ? 'Azaltılmış hareket açık' : connection?.saveData ? 'Veri tasarrufu açık' : paused ? 'Hareketi aç' : 'Hareketi durdur';
      }
      const active = hover && canMove(policy(hover)) ? hover : cards.find(item => item.card.getAttribute('aria-selected') === 'true');
      cards.forEach(item => {
        const moving = canMove(policy(item));
        item.card.classList.toggle('m3-motion-visible', moving);
        const selected = active === item;
        item.card.classList.toggle('m3-character-active', selected);
        if (!moving || !selected) item.action = false;
        let desired = item.action && !item.clips.action?.failed ? item.clips.action : item.clips.idle;
        if (desired?.failed || !moving || !selected) desired = null;
        if (item.current !== desired) {
          stop(item.current);
          item.card.classList.remove('m3-has-video');
          item.current = desired;
        }
        if (desired) play(item, desired);
        if (!moving) resetLight(item.card);
      });
      updateNote();
    }

    function measure() {
      cards.forEach(item => {
        const rect = item.card.getBoundingClientRect();
        item.visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < root.innerHeight;
      });
      sync();
    }

    if ('IntersectionObserver' in root) {
      observer = new root.IntersectionObserver(entries => {
        entries.forEach(entry => {
          const item = cards.find(item => item.card === entry.target);
          if (item) item.visible = entry.isIntersecting;
        });
        sync();
      }, { threshold: 0 });
      cards.forEach(item => observer.observe(item.card));
    } else listen(root, 'scroll', measure);
    listen(root, 'resize', measure);
    listen(root, 'hashchange', measure);
    listen(doc, 'visibilitychange', sync);
    listen(motionQuery, 'change', sync);
    listen(connection, 'change', sync);
    listen(toggle, 'click', () => {
      paused = !paused;
      try { root.sessionStorage.setItem('met3.characterMotionPaused', paused ? '1' : '0'); } catch (_) { /* Optional preference. */ }
      sync();
    });
    measure();

    return {
      select(index, trigger) {
        hover = null;
        cards.forEach((item, i) => {
          item.action = Boolean(trigger && i === index && item.clips.action && !item.clips.action.failed);
          if (item.action) item.clips.action.video.currentTime = 0;
        });
        sync();
      },
      destroy() {
        destroyed = true;
        observer?.disconnect();
        if (frame) root.cancelAnimationFrame(frame);
        cleanups.forEach(cleanup => cleanup());
        cards.forEach(item => Object.values(item.clips).forEach(clip => {
          stop(clip);
          clip.video.replaceChildren();
          clip.video.removeAttribute('src');
          clip.video.load();
          clip.video.remove();
        }));
      }
    };
  }
  root.M3CHARACTERS = { mount, sources, canMove };
})(window);
