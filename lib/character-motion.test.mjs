import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync(new URL('../public/character-motion.js', import.meta.url), 'utf8');
class Target {
  listeners = new Map();
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, value = {}) { for (const fn of this.listeners.get(name) || []) fn(value); }
  listenerCount() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}
class Element extends Target {
  constructor() {
    super();
    this.attrs = {}; this.children = []; this.dataset = {}; this.styles = new Map();
    this.style = { setProperty: (k, v) => this.styles.set(k, v), removeProperty: k => this.styles.delete(k) };
    const classes = new Set();
    this.classList = { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, v) => v ? classes.add(x) : classes.delete(x) };
  }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  remove() { this.removed = true; }
  getBoundingClientRect() { return { top: 200, bottom: 600, left: 0, width: 250, height: 400 }; }
}
function fixture(config = {}, { reduced = false, saveData = false } = {}) {
  const win = new Target();
  const doc = new Target();
  const videos = [];
  doc.hidden = false;
  doc.createElement = tag => {
    const el = new Element();
    if (tag === 'video') {
      el.loads = 0; el.plays = 0; el.pauses = 0; el.currentTime = 0;
      el.load = () => el.loads++;
      el.pause = () => el.pauses++;
      el.play = () => { el.plays++; return el.reject ? Promise.reject(new Error('blocked')) : Promise.resolve(); };
      videos.push(el);
    }
    return el;
  };
  const mq = new Target(); mq.matches = reduced;
  const fine = new Target(); fine.matches = true;
  win.matchMedia = query => query.includes('reduced') ? mq : fine;
  win.navigator = { connection: Object.assign(new Target(), { saveData }) };
  win.sessionStorage = { getItem() { return null; }, setItem() {} };
  win.innerHeight = 800;
  win.requestAnimationFrame = fn => { fn(); return 1; };
  win.cancelAnimationFrame = () => {};
  win.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; win.observer = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const section = new Element(); section.ownerDocument = doc;
  const toggle = new Element(), note = new Element();
  const cards = ['warrior', 'ninja'].map((id, i) => {
    const card = new Element(); card.dataset.characterId = id; card.attrs['aria-selected'] = String(i === 0);
    const media = new Element(), badge = new Element();
    card.querySelector = selector => selector.includes('status') ? badge : media;
    card.media = media; card.badge = badge;
    return card;
  });
  section.querySelectorAll = () => cards;
  section.querySelector = selector => selector.includes('motion') ? toggle : note;
  runInNewContext(code, { window: win });
  const controller = win.M3CHARACTERS.mount(section, config);
  return { win, doc, videos, mq, fine, section, toggle, note, cards, controller, api: win.M3CHARACTERS };
}
const clip = file => [{ src: `assets/characters/${file}.webm`, type: 'video/webm' }, { src: `assets/characters/${file}.mp4`, type: 'video/mp4' }];
const config = { warrior: { effect: 'attack', idle: clip('warrior-idle'), action: clip('warrior-attack') }, ninja: { effect: 'attack', idle: clip('ninja-idle') } };
const flush = () => new Promise(resolve => setImmediate(resolve));

test('video slots accept local typed alternatives and reject remote, traversal, encoded and executable URLs', () => {
  const { api } = fixture();
  const candidates = [
    { src: 'https://example.com/x.mp4', type: 'video/mp4' },
    { src: '//example.com/x.mp4', type: 'video/mp4' },
    { src: 'assets/../private.mp4', type: 'video/mp4' },
    { src: 'assets/%2e%2e/x.mp4', type: 'video/mp4' },
    { src: 'javascript:alert(1)', type: 'video/mp4' },
    { src: 'assets/x.webm', type: 'video/mp4' },
    ...clip('warrior-idle'), ...clip('warrior-idle')
  ];
  assert.equal(JSON.stringify(api.sources(candidates)), JSON.stringify(clip('warrior-idle')));
  assert.equal(api.sources(null).length, 0);
});

test('missing original animation slots produce no videos or speculative network requests', () => {
  const f = fixture();
  assert.equal(f.videos.length, 0);
  assert.match(f.note.textContent, /henüz eklenmedi/);
  assert.equal(f.cards[0].badge.textContent, 'Görsel önizleme');
  f.toggle.emit('click');
  assert.equal(f.section.classList.contains('m3-motion-off'), true);
  assert.equal(f.toggle.attrs['aria-pressed'], 'false');
});

test('only active visible media loads; scroll and hidden document stop playback', async () => {
  const f = fixture(config);
  assert.deepEqual(f.videos.map(v => v.loads), [1, 0, 0]);
  assert.equal(f.videos[0].loop, true);
  assert.equal(f.videos[0].muted && f.videos[0].playsInline, true);
  f.win.observer.callback([{ target: f.cards[0], isIntersecting: false }]);
  assert.equal(f.videos[0].classList.contains('is-playing'), false);
  const plays = f.videos[0].plays;
  f.doc.hidden = true;
  f.win.observer.callback([{ target: f.cards[0], isIntersecting: true }]);
  assert.equal(f.videos[0].plays, plays);
  f.doc.hidden = false; f.doc.emit('visibilitychange');
  await flush();
  assert.equal(f.videos[0].plays, plays + 1);
});

test('reduced motion and data saving prevent source attachment and override the toggle', () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const f = fixture(config, options);
    assert.equal(f.videos.every(video => video.loads === 0 && video.children.length === 0), true);
    assert.equal(f.toggle.disabled, true);
    assert.equal(f.section.classList.contains('m3-motion-off'), true);
  }
  const f = fixture(config);
  f.mq.matches = true; f.mq.emit('change');
  assert.equal(f.videos[0].classList.contains('is-playing'), false);
  assert.equal(f.section.classList.contains('m3-motion-off'), true);
});

test('hover and tap/keyboard selection share one playback budget; actions return to idle', async () => {
  const f = fixture(config);
  f.cards[1].emit('pointerenter', { pointerType: 'mouse' });
  await flush();
  assert.equal(f.videos[2].loads, 1);
  assert.equal(f.cards[0].classList.contains('m3-character-active'), false);
  f.cards[1].emit('pointerleave');
  f.controller.select(0, true);
  assert.equal(f.videos[1].loads, 1);
  assert.equal(f.videos[1].loop, false);
  f.videos[1].emit('ended');
  assert.equal(f.videos[0].plays > 1, true);
  f.cards[0].attrs['aria-selected'] = 'false';
  f.cards[1].attrs['aria-selected'] = 'true';
  f.controller.select(1, true);
  assert.equal(f.cards[1].classList.contains('m3-character-active'), true);
});

test('mouse light follows a bounded position while touch and paused interaction stay static', () => {
  const f = fixture();
  f.cards[1].emit('pointerenter', { pointerType: 'touch' });
  assert.equal(f.cards[1].classList.contains('m3-character-active'), false);
  f.cards[1].emit('pointerenter', { pointerType: 'mouse' });
  assert.equal(f.cards[1].classList.contains('m3-character-active'), true);
  f.cards[1].emit('pointermove', { pointerType: 'mouse', clientX: 900, clientY: -200 });
  assert.equal(f.cards[1].styles.get('--m3-light-x'), '100%');
  assert.equal(f.cards[1].styles.get('--m3-light-y'), '0%');
  f.toggle.emit('click');
  assert.equal(f.cards[1].styles.size, 0);
  f.cards[1].emit('pointermove', { pointerType: 'mouse', clientX: 20, clientY: 300 });
  assert.equal(f.cards[1].styles.size, 0);
});

test('failed clips and autoplay rejection keep posters and handle promises without retry loops', async () => {
  const f = fixture(config);
  f.videos[0].emit('error');
  assert.equal(f.cards[0].classList.contains('m3-has-video'), false);
  f.videos[1].reject = true;
  f.controller.select(0, true);
  await flush();
  assert.equal(f.cards[0].badge.textContent, 'Görsel önizleme');
  const plays = f.videos[1].plays;
  f.controller.select(0, true);
  assert.equal(f.videos[1].plays, plays);
});

test('CMS rerender teardown removes listeners, sources and observers, including pending playback', async () => {
  const f = fixture(config);
  f.controller.destroy();
  await flush();
  assert.equal(f.win.observer.disconnected, true);
  for (const target of [f.win, f.doc, f.mq, f.fine, f.toggle, ...f.cards, ...f.videos]) assert.equal(target.listenerCount(), 0);
  assert.equal(f.videos.every(video => video.removed && video.children.length === 0), true);
  const plays = f.videos.reduce((n, v) => n + v.plays, 0);
  f.doc.emit('visibilitychange');
  assert.equal(f.videos.reduce((n, v) => n + v.plays, 0), plays);
});
