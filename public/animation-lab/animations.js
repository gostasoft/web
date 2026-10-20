/* MET3 Motion V01. Native ES module + Shadow DOM; no application/CMS globals. */
const CSS_URL = new URL('./animations.css', import.meta.url).href;
const VARIANTS = new Set(['spotlight', 'aura', 'item', 'ambient']);

export function mediaSources(webm, mp4, base) {
  const origin = new URL(base).origin;
  return [[webm, 'video/webm', '.webm'], [mp4, 'video/mp4', '.mp4']].flatMap(([value, type, suffix]) => {
    if (!value) return [];
    try {
      const url = new URL(value, base);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || !url.pathname.toLowerCase().endsWith(suffix)) return [];
      return [{ src: url.href, type }];
    } catch { return []; }
  });
}

export function motionMode({ visible, hidden, reduced, paused, saveData, mobile }) {
  if (!visible || hidden || reduced || paused || saveData) return 'rest';
  return mobile ? 'soft' : 'full';
}

// Video lifecycle is independent of the custom element and testable without a browser.
export function createVideoDriver(video, candidates, onState = () => {}) {
  const usable = candidates.filter(source => Boolean(video.canPlayType(source.type)));
  let index = 0, wanted = false, disposed = false, epoch = 0, pending = false, loaded = -1, failed = false;
  function state(value) { if (!disposed) onState(value); }
  function fallback() {
    epoch++; pending = false; video.pause(); state('poster');
    if (++index < usable.length) { if (wanted) play(); }
    else { failed = true; state('unavailable'); }
  }
  function play() {
    if (disposed || failed || pending) return;
    wanted = true;
    if (!usable[index]) { failed = true; state('unavailable'); return; }
    if (loaded !== index) {
      video.src = usable[index].src;
      video.load();
      loaded = index;
    }
    if (!video.paused) return;
    pending = true;
    const generation = ++epoch;
    try {
      Promise.resolve(video.play()).then(() => {
        if (generation === epoch && !disposed) pending = false;
      }).catch(error => {
        if (generation !== epoch || disposed) return;
        pending = false;
        if (error?.name === 'NotSupportedError') fallback();
        else { failed = true; video.pause(); state('unavailable'); }
      });
    } catch { fallback(); }
  }
  function onPlaying() { if (wanted && !disposed) state('playing'); else video.pause(); }
  function onError() { if (!disposed && !failed) fallback(); }
  video.addEventListener('playing', onPlaying);
  video.addEventListener('error', onError);
  return {
    play,
    pause() { wanted = false; epoch++; pending = false; video.pause(); state(failed ? 'unavailable' : 'poster'); },
    dispose() {
      disposed = true; wanted = false; epoch++; video.pause();
      video.removeEventListener('playing', onPlaying); video.removeEventListener('error', onError);
      video.removeAttribute('src'); video.load();
    }
  };
}

export class Met3Motion extends (globalThis.HTMLElement || class {}) {
  static observedAttributes = ['paused', 'variant', 'webm', 'mp4', 'mobile-video', 'label', 'cutout'];

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this._cleanups = [];
    this._visible = false;
    this._frame = 0;
    this._emphasis = false;
    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<link rel="stylesheet"><section class="m3m-stage" part="stage" data-mode="rest">
      <div class="m3m-texture" aria-hidden="true"></div><div class="m3m-glow" aria-hidden="true"></div><div class="m3m-backdrop" aria-hidden="true"></div>
      <div class="m3m-mist" aria-hidden="true"></div><div class="m3m-orbits" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="m3m-particles" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--n:${i}"></i>`).join('')}</div>
      <div class="m3m-copy"><slot name="copy"></slot></div>
      <button class="m3m-art-button" type="button" aria-pressed="false"><span class="m3m-tilt"><span class="m3m-float"><slot name="art"><span class="m3m-missing">Görsel bekleniyor</span></slot><video class="m3m-video" aria-hidden="true" tabindex="-1" muted playsinline loop preload="none" disablepictureinpicture></video><span class="m3m-scan" aria-hidden="true"></span></span></span></button>
      <div class="m3m-foreground" aria-hidden="true"></div><div class="m3m-footer"><span class="m3m-status"></span><button class="m3m-pause" type="button" aria-pressed="false">Hareketi durdur</button></div>
    </section>`;
    shadow.querySelector('link').href = CSS_URL;
    this._stage = shadow.querySelector('.m3m-stage');
    this._video = shadow.querySelector('video');
    this._artSlot = shadow.querySelector('slot[name="art"]');
    this._float = shadow.querySelector('.m3m-float');
    this._backdrop = shadow.querySelector('.m3m-backdrop');
    this._video.muted = true; this._video.defaultMuted = true; this._video.playsInline = true;
    this._pauseButton = shadow.querySelector('.m3m-pause');
    this._artButton = shadow.querySelector('.m3m-art-button');
    this._status = shadow.querySelector('.m3m-status');
    this._reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this._mobile = matchMedia('(max-width: 640px)');
    this._connection = navigator.connection;
    this._listen(this._pauseButton, 'click', () => this.toggleAttribute('paused'));
    this._listen(this._artButton, 'click', () => {
      this._emphasis = !this._emphasis;
      this._artButton.setAttribute('aria-pressed', String(this._emphasis));
      this._stage.classList.toggle('m3m-emphasis', this._emphasis);
    });
    this._listen(this._stage, 'pointerenter', event => { if (event.pointerType === 'mouse') this._stage.classList.add('m3m-hover'); });
    this._listen(this._stage, 'pointerleave', () => { this._stage.classList.remove('m3m-hover'); this._resetTilt(); });
    this._listen(this._stage, 'pointermove', event => {
      if (event.pointerType !== 'mouse' || this._mode !== 'full') return;
      if (this._frame) cancelAnimationFrame(this._frame);
      const x = event.clientX, y = event.clientY;
      this._frame = requestAnimationFrame(() => {
        this._frame = 0;
        if (!this._connected || this._mode !== 'full') return;
        const rect = this._stage.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (x - rect.left) / rect.width * 2 - 1));
        const ny = Math.max(-1, Math.min(1, (y - rect.top) / rect.height * 2 - 1));
        this._stage.style.setProperty('--m3m-rx', `${-ny * 2.2}deg`);
        this._stage.style.setProperty('--m3m-ry', `${nx * 3}deg`);
        this._stage.style.setProperty('--m3m-light-x', `${(nx + 1) * 50}%`);
      });
    });
    for (const target of [this._reduce, this._mobile, this._connection]) this._listen(target, 'change', () => this._sync());
    this._listen(document, 'visibilitychange', () => this._sync());
    if ('IntersectionObserver' in globalThis) {
      this._observer = new IntersectionObserver(entries => {
        this._visible = entries[0].isIntersecting;
        this._sync();
      }, { threshold: 0 });
      this._observer.observe(this);
    } else {
      const measure = () => { const r = this.getBoundingClientRect(); this._visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; this._sync(); };
      this._listen(window, 'scroll', measure); this._listen(window, 'resize', measure); measure();
    }
    this._configure();
    this._buildMedia();
    this._sync();
  }

  _listen(target, name, callback) {
    if (!target?.addEventListener) return;
    target.addEventListener(name, callback);
    this._cleanups.push(() => target.removeEventListener(name, callback));
  }

  _configure() {
    const variant = VARIANTS.has(this.getAttribute('variant')) ? this.getAttribute('variant') : 'spotlight';
    this._stage.dataset.variant = variant;
    this._stage.classList.toggle('m3m-cutout', this.hasAttribute('cutout'));
    const label = this.getAttribute('label') || 'MET3 animasyon modülü';
    this._stage.setAttribute('aria-label', label);
    this._artButton.setAttribute('aria-label', `${label}: ışık vurgusunu aç veya kapat`);
    this._artButton.hidden = variant === 'ambient';
    this._artButton.setAttribute('aria-pressed', String(this._emphasis));
    const mediaParent = variant === 'ambient' ? this._backdrop : this._float;
    if (this._artSlot.parentNode !== mediaParent) mediaParent.append(this._artSlot, this._video);
  }

  _buildMedia() {
    this._driver?.dispose();
    this._stage.classList.remove('m3m-video-playing');
    const candidates = mediaSources(this.getAttribute('webm'), this.getAttribute('mp4'), this.ownerDocument.baseURI);
    this._mediaState = 'poster';
    this._hasMedia = candidates.length > 0;
    this._driver = this._hasMedia ? createVideoDriver(this._video, candidates, state => {
      this._mediaState = state;
      this._stage.classList.toggle('m3m-video-playing', state === 'playing');
      this._updateStatus();
    }) : null;
  }

  _updateStatus() {
    if (!this._stage) return;
    const rest = this._mode === 'rest';
    const ambience = this._stage.dataset.variant === 'ambient';
    this._status.textContent = rest ? 'Durağan görünüm' : this._mediaState === 'playing' ? 'Video döngüsü' : this._mediaState === 'unavailable' ? 'Video kullanılamıyor · görsel + CSS' : ambience ? 'CSS atmosfer döngüsü' : this._mode === 'soft' ? 'Görsel + hafif CSS döngüsü' : 'Görsel + CSS döngüsü';
    const forced = this._reduce.matches || Boolean(this._connection?.saveData);
    this._pauseButton.disabled = forced;
    this._pauseButton.setAttribute('aria-pressed', String(this.hasAttribute('paused') || forced));
    this._pauseButton.textContent = this._reduce.matches ? 'Azaltılmış hareket' : this._connection?.saveData ? 'Veri tasarrufu' : this.hasAttribute('paused') ? 'Hareketi aç' : 'Hareketi durdur';
  }

  _sync() {
    if (!this._connected || !this._stage) return;
    this._mode = motionMode({ visible: this._visible, hidden: document.hidden, reduced: this._reduce.matches, paused: this.hasAttribute('paused'), saveData: Boolean(this._connection?.saveData), mobile: this._mobile.matches });
    this._stage.dataset.mode = this._mode;
    if (this._mode === 'rest' || (this._mode === 'soft' && !this.hasAttribute('mobile-video'))) this._driver?.pause();
    else this._driver?.play();
    if (this._mode !== 'full') this._resetTilt();
    this._updateStatus();
  }

  _resetTilt() {
    if (this._frame) cancelAnimationFrame(this._frame);
    this._frame = 0;
    for (const name of ['--m3m-rx', '--m3m-ry', '--m3m-light-x']) this._stage?.style.removeProperty(name);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._connected || oldValue === newValue) return;
    if (['webm', 'mp4'].includes(name)) this._buildMedia();
    else if (name === 'variant') {
      this._driver?.dispose(); this._driver = null;
      this._configure(); this._buildMedia();
    } else if (['label', 'cutout'].includes(name)) this._configure();
    this._sync();
  }

  disconnectedCallback() {
    this._connected = false;
    this._observer?.disconnect(); this._observer = null;
    this._cleanups?.forEach(cleanup => cleanup()); this._cleanups = [];
    this._resetTilt(); this._driver?.dispose(); this._driver = null;
  }
}

if (globalThis.customElements && !customElements.get('met3-motion')) customElements.define('met3-motion', Met3Motion);
