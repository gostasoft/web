import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mediaSources, motionMode, createVideoDriver, Met3Motion } from '../public/animation-lab/animations.js';

const base = 'https://met3.example/animation-lab/index.html';
const media = mediaSources('./assets/idle.webm', './assets/idle.mp4', base);
const tick = () => new Promise(resolve => setImmediate(resolve));
class Video extends EventTarget {
  constructor(support = ['video/webm', 'video/mp4']) { super(); this.support = support; this.paused = true; this.loads = []; this.plays = 0; this.pauseCount = 0; }
  canPlayType(type) { return this.support.includes(type) ? 'probably' : ''; }
  load() { this.loads.push(this.src || ''); }
  play() { this.plays++; this.paused = false; return this.fail ? Promise.reject(this.fail) : Promise.resolve(); }
  pause() { this.paused = true; this.pauseCount++; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  emit(type) { this.dispatchEvent(new Event(type)); }
}

test('lab media accepts typed same-origin alternatives and refuses credentialed or executable sources', () => {
  assert.deepEqual(media, [
    { src: 'https://met3.example/animation-lab/assets/idle.webm', type: 'video/webm' },
    { src: 'https://met3.example/animation-lab/assets/idle.mp4', type: 'video/mp4' }
  ]);
  for (const bad of ['https://other.example/a.webm', 'javascript:alert(1)', 'data:video/webm;base64,eA==', 'https://user:secret@met3.example/a.webm', './bad.mp4']) assert.equal(mediaSources(bad, null, base).length, 0);
});

test('visibility, user pause, reduced motion, hidden tab and Save-Data always take priority over mobile mode', () => {
  const state = { visible: true, hidden: false, reduced: false, paused: false, saveData: false, mobile: false };
  assert.equal(motionMode(state), 'full');
  assert.equal(motionMode({ ...state, mobile: true }), 'soft');
  for (const key of ['hidden', 'reduced', 'paused', 'saveData']) assert.equal(motionMode({ ...state, [key]: true, mobile: true }), 'rest');
  assert.equal(motionMode({ ...state, visible: false }), 'rest');
});

test('video remains unloaded until permitted, pauses cleanly and resumes the same clip', async () => {
  const video = new Video(), states = [];
  const driver = createVideoDriver(video, media, state => states.push(state));
  assert.equal(video.loads.length, 0);
  driver.play(); await tick(); video.emit('playing');
  assert.equal(video.src, media[0].src);
  assert.equal(states.at(-1), 'playing');
  driver.pause();
  assert.equal(video.paused, true);
  assert.equal(states.at(-1), 'poster');
  driver.play(); await tick();
  assert.equal(video.loads.length, 1);
  assert.equal(video.plays, 2);
});

test('MP4 is selected directly when WebM is unsupported and used after a WebM decode error', async () => {
  const mp4Only = new Video(['video/mp4']);
  createVideoDriver(mp4Only, media).play();
  assert.equal(mp4Only.src, media[1].src);
  const video = new Video(), states = [];
  createVideoDriver(video, media, state => states.push(state)).play();
  await tick(); video.emit('error'); await tick(); video.emit('playing');
  assert.deepEqual(video.loads, media.map(item => item.src));
  assert.equal(states.at(-1), 'playing');
});

test('blocked autoplay falls back to the poster without retry storms or unhandled rejections', async () => {
  const video = new Video(), states = [];
  video.fail = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
  const driver = createVideoDriver(video, media, state => states.push(state));
  driver.play(); await tick();
  assert.equal(states.at(-1), 'unavailable');
  driver.play(); driver.play(); driver.pause();
  assert.equal(video.plays, 1);
  assert.equal(video.paused, true);
});

test('both broken codecs stop at the poster; stale promises cannot revive a disposed video', async () => {
  const video = new Video(), states = [];
  const driver = createVideoDriver(video, media, state => states.push(state));
  driver.play(); await tick(); video.emit('error'); await tick(); video.emit('error');
  assert.equal(states.at(-1), 'unavailable');
  const plays = video.plays;
  driver.play(); assert.equal(video.plays, plays);
  driver.dispose(); video.emit('playing'); await tick();
  assert.equal(video.src, '');
  assert.equal(video.paused, true);
  assert.equal(states.at(-1), 'unavailable');
});

test('disconnect releases component observers, listeners, pointer frame and video driver', () => {
  const element = new Met3Motion();
  const released = [];
  element._connected = true;
  element._observer = { disconnect() { released.push('observer'); } };
  element._cleanups = [() => released.push('listener')];
  element._stage = { style: { removeProperty() {} } };
  element._driver = { dispose() { released.push('video'); } };
  element.disconnectedCallback();
  assert.deepEqual(released, ['observer', 'listener', 'video']);
  assert.equal(element._connected, false);
  assert.equal(element._observer, null);
  assert.equal(element._driver, null);
});

test('demo and module stay independent from CMS, auth, external CDN and site entry files', () => {
  const script = readFileSync(new URL('../public/animation-lab/animations.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/animation-lab/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /M3CMS|M3AUTH|localStorage|sessionStorage|fetch\(|\/api\//);
  assert.doesNotMatch(html, /src="https?:|href="https?:|cms\.js|auth\.js/);
  assert.equal((html.match(/<met3-motion\b/g) || []).length, 4);
  assert.match(script, /attachShadow\(\{ mode: 'open' \}\)/);
});
