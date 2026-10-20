import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atmospherePolicy, createFrameLoop, makeMotes, mountAtmosphere } from '../public/atmosphere.js';

const desktop = { visible: true, width: 1600, height: 1000, dpr: 3 };
test('accessibility, data saving, dialogs, hidden routes and user pause cannot be overridden by desktop effects', () => {
  assert.equal(atmospherePolicy(desktop).mode, 'full');
  for (const key of ['reduced', 'saveData', 'hidden', 'paused', 'blocked']) {
    const policy = atmospherePolicy({ ...desktop, [key]: true });
    assert.equal(policy.mode, 'rest', key); assert.equal(policy.bursts, false, key);
  }
  assert.equal(atmospherePolicy({ ...desktop, visible: false }).mode, 'rest');
});
test('mobile disables blooms, reduces particle and frame budgets and caps retina canvas allocation', () => {
  const large = atmospherePolicy(desktop), small = atmospherePolicy({ ...desktop, mobile: true });
  assert.equal(large.count, 76); assert.equal(large.ratio, 1.5);
  assert.equal(small.count, 22); assert.equal(small.ratio, 1); assert.equal(small.fps, 24);
  assert.equal(small.bursts, false); assert.equal(small.mode, 'soft');
  assert.equal(atmospherePolicy({ ...desktop, width: 300, height: 300 }).count, 38);
});
function frames() {
  let id = 0; const queue = new Map(), draws = [];
  const loop = createFrameLoop({ request: cb => { queue.set(++id, cb); return id; }, cancel: key => queue.delete(key), draw: dt => draws.push(dt) });
  return { loop, queue, draws, tick(time) { const [key, callback] = queue.entries().next().value; queue.delete(key); callback(time); } };
}
test('repeated route/scroll updates retain a single frame; pause and disposal release the scheduler', () => {
  const f = frames();
  for (let i = 0; i < 10; i++) f.loop.set(true);
  assert.equal(f.queue.size, 1);
  f.tick(100); assert.equal(f.queue.size, 1); assert.equal(f.draws.length, 1);
  f.loop.set(false); assert.equal(f.queue.size, 0);
  f.loop.set(true); f.loop.destroy(); assert.equal(f.queue.size, 0);
  f.loop.set(true); assert.equal(f.queue.size, 0);
});
test('render rate is bounded and resuming after a hidden tab cannot fast-forward particles', () => {
  const f = frames(); f.loop.set(true, 30);
  for (let i = 0; i <= 60; i++) f.tick(i * 1000 / 60);
  assert.ok(f.draws.length >= 29 && f.draws.length <= 32);
  f.loop.set(false); f.loop.set(true); f.tick(9000000);
  assert.ok(f.draws.at(-1) <= .06);
  f.tick(100000000); assert.equal(f.draws.at(-1), .06);
});
test('each particle family is present, bounded and independent between mounts', () => {
  const first = makeMotes(22, () => .5), second = makeMotes(22, () => .5);
  assert.deepEqual(new Set(first.map(p => p.kind)), new Set(['firefly', 'ash', 'ember']));
  assert.ok(first.every(p => p.x >= 0 && p.x < 1 && p.y >= 0 && p.y < 1 && p.radius < 2));
  first[0].x = 0; assert.equal(second[0].x, .5);
});

class Target extends EventTarget {
  constructor() { super(); this.dataset = {}; this.hidden = false; this.style = {}; this.children = []; this.attrs = {}; this.classList = { contains: () => false }; }
  append(...elements) { this.children.push(...elements); }
  setAttribute(key, value) { this.attrs[key] = value; }
  getClientRects() { return [{}]; }
  getBoundingClientRect() { return { top: 103, bottom: 900, left: 0, right: 1200, width: 1200, height: 797 }; }
  querySelector() { return this.label ||= new Target(); }
  remove() { this.removed = true; }
}
function environment() {
  const main = new Target(), body = new Target(), canvas = new Target(), toggle = new Target();
  let nextId = 0; const callbacks = new Map();
  const ctx = { setTransform() {}, clearRect() {} };
  canvas.getContext = () => ctx;
  const doc = Object.assign(new Target(), {
    body, hidden: false, getElementById: id => id === 'main' ? main : null,
    querySelector: () => null, querySelectorAll: () => [], createElement: name => name === 'canvas' ? canvas : toggle,
  });
  const queries = [];
  const win = Object.assign(new Target(), {
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 2, location: { search: '' }, navigator: {},
    matchMedia: () => { const q = Object.assign(new Target(), { matches: false }); queries.push(q); return q; },
    localStorage: { getItem: () => null, setItem() {} },
    requestAnimationFrame: cb => { callbacks.set(++nextId, cb); return nextId; }, cancelAnimationFrame: id => callbacks.delete(id),
  });
  win.parent = win;
  return { win, doc, canvas, toggle, main, callbacks, queries };
}
test('mounted atmosphere pauses for hidden documents, motion preference, route changes and bfcache lifecycle', () => {
  const e = environment(); const controller = mountAtmosphere(e.win, e.doc);
  assert.equal(e.callbacks.size, 1); assert.equal(e.doc.body.dataset.atmosphere, 'full');
  e.doc.hidden = true; e.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(e.callbacks.size, 0); assert.equal(e.canvas.hidden, true);
  e.doc.hidden = false; e.doc.dispatchEvent(new Event('visibilitychange')); assert.equal(e.callbacks.size, 1);
  e.queries[0].matches = true; e.queries[0].dispatchEvent(new Event('change'));
  assert.equal(e.callbacks.size, 0); assert.equal(e.toggle.disabled, true);
  e.queries[0].matches = false; e.queries[0].dispatchEvent(new Event('change'));
  e.main.hidden = true; e.win.dispatchEvent(new Event('hashchange')); assert.equal(e.callbacks.size, 0);
  e.main.hidden = false; e.win.dispatchEvent(new Event('hashchange')); assert.equal(e.callbacks.size, 1);
  e.win.dispatchEvent(new Event('pagehide')); assert.equal(e.callbacks.size, 0);
  e.win.dispatchEvent(new Event('pageshow')); assert.equal(e.callbacks.size, 1);
  e.toggle.dispatchEvent(new Event('click')); assert.equal(e.callbacks.size, 0);
  e.toggle.dispatchEvent(new Event('click')); assert.equal(e.callbacks.size, 1);
  controller.destroy(); assert.equal(e.callbacks.size, 0); assert.equal(e.canvas.removed, true); assert.equal(e.toggle.removed, true);
  e.win.dispatchEvent(new Event('scroll')); assert.equal(e.callbacks.size, 0);
});
test('unsupported Canvas and authenticated editor previews receive no decorative UI or animation', () => {
  const e = environment(); e.canvas.getContext = () => null;
  assert.equal(mountAtmosphere(e.win, e.doc), null); assert.equal(e.doc.body.children.length, 0);
  e.win.parent = {}; e.win.location.search = '?preview=1';
  assert.equal(mountAtmosphere(e.win, e.doc), null); assert.equal(e.callbacks.size, 0);
});
