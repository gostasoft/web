/* MET3: one bounded Canvas field; no network, CMS writes or external packages. */
export function atmospherePolicy({ reduced, saveData, hidden, paused, visible, blocked, mobile, width = 1280, height = 800, dpr = 1 }) {
  const rest = reduced || saveData || hidden || paused || !visible || blocked;
  return {
    mode: rest ? 'rest' : mobile ? 'soft' : 'full',
    fps: mobile ? 24 : 30,
    count: mobile ? 22 : Math.min(76, Math.max(38, Math.round(width * height / 20000))),
    ratio: Math.min(mobile ? 1 : 1.5, Math.max(1, dpr || 1)),
    bursts: !rest && !mobile
  };
}

// At most one pending frame; pausing drops wall-clock gaps rather than catching up.
export function createFrameLoop({ request, cancel, draw }) {
  let frame = 0, running = false, last = null, fps = 30, destroyed = false;
  function tick(time) {
    frame = 0;
    if (!running || destroyed) return;
    const elapsed = last === null ? 1 / fps : (time - last) / 1000;
    if (elapsed >= (1 / fps) - .001) {
      last = time;
      draw(Math.min(.06, Math.max(0, elapsed)));
    }
    if (running && !destroyed) frame = request(tick);
  }
  return {
    set(active, rate = 30) {
      fps = rate;
      if (destroyed || running === active) return;
      running = active; last = null;
      if (frame) cancel(frame);
      frame = active ? request(tick) : 0;
    },
    destroy() { destroyed = true; running = false; if (frame) cancel(frame); frame = 0; },
  };
}

export function makeMotes(count, random = Math.random) {
  return Array.from({ length: count }, (_, index) => ({
    kind: index % 5 === 0 ? 'firefly' : index % 3 === 0 ? 'ash' : 'ember',
    x: random(), y: random(), phase: random() * Math.PI * 2,
    speed: .008 + random() * .019, radius: .65 + random() * 1.25,
    drift: .006 + random() * .012, life: random() * 20,
  }));
}

export function mountAtmosphere(win = window, doc = document) {
  const main = doc.getElementById('main');
  if (!main || doc.querySelector('.m3-atmosphere') || (win.parent !== win && new URLSearchParams(win.location.search).has('preview'))) return null;
  const canvas = doc.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  canvas.className = 'm3-atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  const toggle = doc.createElement('button');
  toggle.type = 'button'; toggle.className = 'm3-atmos-toggle';
  toggle.setAttribute('aria-label', 'Atmosfer efektlerini durdur');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z"/></svg><span></span>';
  doc.body.append(canvas, toggle);
  const label = toggle.querySelector('span');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = win.matchMedia('(max-width: 720px)');
  const connection = win.navigator.connection;
  let paused = false, suspended = false, destroyed = false, dirty = true;
  try { paused = win.localStorage.getItem('met3.atmospherePaused') === '1'; } catch { /* Optional preference. */ }
  let width = win.innerWidth, height = win.innerHeight, ratio = 0, mode = 'rest', profile;
  let motes = [], protections = [], heroRect = null, time = 0, burstTime = 3, burst = null;
  let pointer = 0, wind = 0;
  const light = { x: 0, y: 0, targetX: 0, targetY: 0, alpha: 0, inside: false, primed: false };
  const cleanups = [], scenes = [];
  const listen = (target, type, callback, options) => {
    target?.addEventListener(type, callback, options);
    cleanups.push(() => target?.removeEventListener(type, callback, options));
  };
  const sceneObserver = win.IntersectionObserver ? new win.IntersectionObserver(entries => {
    entries.forEach(entry => { entry.target.dataset.visible = String(entry.isIntersecting); });
  }, { threshold: 0 }) : null;
  for (const parent of doc.querySelectorAll('.hero, .world-stage, .community-section')) {
    const scene = doc.createElement('div');
    scene.className = 'm3-atmos-scene'; scene.setAttribute('aria-hidden', 'true');
    scene.dataset.visible = 'true'; parent.append(scene); scenes.push(scene); sceneObserver?.observe(scene);
  }
  function rectVisible(element) {
    if (!element || element.hidden || !element.getClientRects().length) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom > 80 && rect.top < height && rect.width > 0;
  }
  function clear() { context.clearRect(0, 0, width, height); }
  function measure() {
    dirty = false;
    protections = Array.from(doc.querySelectorAll('main h1, main h2, main h3, .hero-description, .hero-actions, .hero-caption'))
      .filter(rectVisible).map(element => element.getBoundingClientRect());
    const hero = doc.getElementById('anasayfa');
    heroRect = rectVisible(hero) ? hero.getBoundingClientRect() : null;
  }
  const protectedAt = (x, y) => protections.some(r => x > r.left - 12 && x < r.right + 12 && y > r.top - 10 && y < r.bottom + 10);
  function point(x, y, size, color, alpha, glow = true) {
    if (y < (mobile.matches ? 80 : 103) || protectedAt(x, y)) return;
    context.globalAlpha = alpha;
    if (glow) {
      const halo = context.createRadialGradient(x, y, 0, x, y, size * 6);
      halo.addColorStop(0, color); halo.addColorStop(.16, color); halo.addColorStop(1, 'transparent');
      context.fillStyle = halo;
      context.beginPath(); context.arc(x, y, size * 6, 0, Math.PI * 2); context.fill();
    }
    context.fillStyle = color;
    context.beginPath(); context.ellipse(x, y, size * .55, size, -.5, 0, Math.PI * 2); context.fill();
  }
  function draw(dt) {
    if (dirty) measure();
    time += dt; clear();
    wind += (pointer - wind) * .025;
    // Diffuse cursor light shares the existing frame budget; never captures input.
    if (mode === 'full') {
      const ease = 1 - Math.exp(-dt * 12);
      light.x += (light.targetX - light.x) * ease;
      light.y += (light.targetY - light.y) * ease;
      light.alpha += ((light.inside ? 1 : 0) - light.alpha) * (1 - Math.exp(-dt * 7));
      if (light.alpha > .002) {
        const radius = Math.min(260, width * .3);
        const glow = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
        glow.addColorStop(0, 'rgba(255, 219, 165, .13)');
        glow.addColorStop(.36, 'rgba(239, 173, 108, .065)');
        glow.addColorStop(.7, 'rgba(180, 53, 37, .025)');
        glow.addColorStop(1, 'rgba(180, 53, 37, 0)');
        context.globalAlpha = light.alpha;
        context.fillStyle = glow;
        context.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
        context.globalAlpha = 1;
      }
    }
    for (const mote of motes) {
      mote.life += dt;
      mote.y = (mote.y - mote.speed * dt + 1) % 1;
      mote.x = (mote.x + (mote.drift + wind * .01) * dt + 1) % 1;
      const x = mote.x * width + Math.sin(time * .35 + mote.phase) * (mote.kind === 'firefly' ? 18 : mote.kind === 'ash' ? 14 : 7);
      const y = mote.y * height + Math.cos(time * .45 + mote.phase) * 9;
      const pulse = .35 + .65 * Math.pow((Math.sin(time * (mote.kind === 'firefly' ? 1.1 : .55) + mote.phase) + 1) / 2, 2);
      const alpha = (mote.kind === 'ash' ? .78 : .68) * pulse * Math.min(1, y / 130, (height - y) / 70);
      const color = mote.kind === 'firefly' ? '#f7d77b' : mote.kind === 'ash' ? '#ed2844' : '#ff4938';
      point(x, y, mote.radius, color, Math.max(0, alpha), true);
      // Thin crimson flakes flutter independently, rather than all looking like dots.
      if (mote.kind === 'ash' && y >= (mobile.matches ? 80 : 103) && !protectedAt(x, y)) {
        const size = mote.radius * 2.1;
        context.save();
        context.translate(x, y);
        context.rotate(mote.phase + time * .45);
        context.scale(.45 + Math.abs(Math.sin(time * .7 + mote.phase)) * .55, 1);
        context.globalAlpha = Math.max(0, alpha);
        context.fillStyle = color;
        context.beginPath(); context.moveTo(-size, -.35 * size); context.lineTo(.3 * size, -.65 * size);
        context.lineTo(size, .4 * size); context.lineTo(-.4 * size, .7 * size); context.closePath(); context.fill();
        context.restore();
      }
    }
    // A sparse, small golden bloom in the hero sky, without a full-screen flash.
    if (profile.bursts && heroRect) {
      burstTime -= dt;
      if (burstTime <= 0) { burstTime = 16 + Math.random() * 6; burst = { age: 0, x: width * (.72 + Math.random() * .17), y: Math.max(145, heroRect.top + heroRect.height * .27) }; }
    } else { burst = null; burstTime = Math.max(3, burstTime); }
    if (burst) {
      burst.age += dt;
      if (burst.age > 2.6) burst = null;
      else {
        const progress = burst.age / 2.6;
        const radius = 13 + (1 - Math.exp(-progress * 3)) * 95;
        for (let i = 0; i < 15; i++) {
          const angle = i / 15 * Math.PI * 2;
          const x = burst.x + Math.cos(angle) * radius;
          const y = burst.y + Math.sin(angle) * radius * .8 + progress * progress * 38;
          if (protectedAt(x, y) || y < 103) continue;
          const alpha = Math.sin(Math.PI * progress) * .42;
          point(x, y, 1.15, i % 3 ? '#ffc478' : '#f49351', alpha);
          context.strokeStyle = '#e9a65a'; context.globalAlpha = alpha * .5; context.lineWidth = .65;
          context.beginPath(); context.moveTo(x, y); context.lineTo(x - Math.cos(angle) * 7, y - Math.sin(angle) * 6); context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
  }
  const loop = createFrameLoop({ request: callback => win.requestAnimationFrame(callback), cancel: id => win.cancelAnimationFrame(id), draw });
  function sync() {
    if (destroyed) return;
    const nextWidth = win.innerWidth, nextHeight = win.innerHeight;
    const blocked = doc.body.classList.contains('auth-open') || doc.body.classList.contains('modal-open') || Boolean(doc.querySelector('dialog[open]'));
    const visible = rectVisible(main) || rectVisible(doc.getElementById('cms-page'));
    profile = atmospherePolicy({ reduced: reduced.matches, saveData: connection?.saveData, hidden: doc.hidden || suspended, paused, visible, blocked, mobile: mobile.matches, width: nextWidth, height: nextHeight, dpr: win.devicePixelRatio });
    if (width !== nextWidth || height !== nextHeight || ratio !== profile.ratio || motes.length !== profile.count) {
      width = nextWidth; height = nextHeight; ratio = profile.ratio;
      canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      motes = makeMotes(profile.count); dirty = true;
    }
    mode = profile.mode;
    if (mode !== 'full') { light.inside = false; light.primed = false; light.alpha = 0; }
    doc.body.dataset.atmosphere = mode;
    canvas.hidden = mode === 'rest';
    toggle.hidden = blocked || !visible || doc.hidden || suspended;
    toggle.disabled = reduced.matches || Boolean(connection?.saveData);
    toggle.setAttribute('aria-pressed', String(!paused && !toggle.disabled));
    toggle.setAttribute('aria-label', toggle.disabled ? 'Atmosfer hareketi cihaz tercihin nedeniyle kapalı' : paused ? 'Atmosfer efektlerini aç' : 'Atmosfer efektlerini durdur');
    label.textContent = toggle.disabled ? 'Hareket kapalı' : paused ? 'Atmosferi aç' : 'Atmosferi durdur';
    loop.set(mode !== 'rest', profile.fps);
    if (mode === 'rest') { clear(); burst = null; }
  }
  const observer = win.MutationObserver ? new win.MutationObserver(() => { dirty = true; sync(); }) : null;
  observer?.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  for (const container of [main, doc.getElementById('cms-page')]) {
    if (container) observer?.observe(container, { attributes: true, attributeFilter: ['hidden'], subtree: true, childList: true });
  }
  listen(win, 'scroll', () => { dirty = true; sync(); }, { passive: true });
  listen(win, 'resize', () => { dirty = true; sync(); }, { passive: true });
  listen(win, 'hashchange', () => { dirty = true; sync(); });
  listen(win, 'pointermove', event => {
    if (event.pointerType !== 'mouse' || mode !== 'full') return;
    pointer = event.clientX / Math.max(1, width) - .5;
    light.targetX = event.clientX; light.targetY = event.clientY; light.inside = true;
    if (!light.primed) { light.x = light.targetX; light.y = light.targetY; light.primed = true; }
  }, { passive: true });
  const leaveLight = () => { light.inside = false; light.primed = false; pointer = 0; };
  listen(doc, 'pointerleave', leaveLight);
  listen(win, 'blur', leaveLight);
  listen(doc, 'visibilitychange', sync);
  listen(reduced, 'change', sync); listen(mobile, 'change', sync); listen(connection, 'change', sync);
  listen(win, 'pagehide', () => { suspended = true; sync(); });
  listen(win, 'pageshow', () => { suspended = false; dirty = true; sync(); });
  listen(toggle, 'click', () => {
    paused = !paused;
    try { win.localStorage.setItem('met3.atmospherePaused', paused ? '1' : '0'); } catch { /* Optional preference. */ }
    sync();
  });
  sync();
  return { destroy() {
    destroyed = true; loop.destroy(); observer?.disconnect(); sceneObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup()); scenes.forEach(scene => scene.remove()); canvas.remove(); toggle.remove(); delete doc.body.dataset.atmosphere;
  } };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const start = () => Promise.resolve(window.M3CMS_READY).then(() => mountAtmosphere());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
