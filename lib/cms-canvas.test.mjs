import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const validationUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source('./cms-validation.ts'))).toString('base64')}`;
const { validateCmsDocument, publicCmsDocument, MAX_DOCUMENT_BYTES } = await import(validationUrl);
const clone = (value) => JSON.parse(JSON.stringify(value));
const context = { window: {} };
runInNewContext(source('../public/cms-defaults.js'), context);
runInNewContext(source('../public/builder-model.js'), context);
runInNewContext(source('../public/canvas-model.js'), context);
const model = context.window.M3CANVAS;
const builder = context.window.M3BUILDER;

function fixture() {
  const document = clone(context.window.M3CMS_DEFAULTS);
  document.builder = clone(builder.defaults(document));
  document.builder.home.push(clone(builder.createSection('canvas', document)));
  return document;
}
function canvas(document) { return document.builder.home.at(-1).canvas; }
function element(type = 'text', index = 0) { return clone(model.createElement(type, index)); }
function reject(change) {
  const document = fixture();
  canvas(document).elements.push(element());
  change(document, canvas(document), canvas(document).elements[0]);
  assert.throws(() => validateCmsDocument(document), (error) => error.status === 400);
}
const layout = () => ({ desktop: { width: 100, height: 0, align: 'center' }, mobile: { width: 100, height: 0, align: 'center' } });

test('actual shared model creates every canvas element and preserves legacy content through save and public projection', () => {
  const document = fixture();
  document.texts['hero.title'] = 'Kayıtlı oyuncu başlığı';
  document.texts['footer.copyright'] = 'Kayıtlı telif yazısı';
  canvas(document).elements.push(...['text', 'image', 'button', 'box'].map((type, index) => element(type, index)));
  document.builder.home[0].layout = layout();
  const before = clone(document);
  assert.equal(builder.catalog.at(-1).kind, 'canvas');
  assert.equal(builder.catalog.length, 7);
  assert.equal(builder.createSection('unsupported').kind, 'text');
  assert.equal(validateCmsDocument(document), document);
  assert.deepEqual(validateCmsDocument(clone(document)), before);
  assert.deepEqual(publicCmsDocument(document), before);
  assert.deepEqual(document, before);
});

test('normalization clones valid geometry and styles while filling or clamping invalid imported values', () => {
  const valid = clone(model.createCanvas());
  valid.elements.push(element('image'));
  valid.elements[0].desktop = { x: 700, y: 500, width: 500, height: 300 };
  valid.elements[0].mobile = { x: 0, y: 780, width: 390, height: 220 };
  valid.elements[0].style.color = '#abcdef';
  valid.elements[0].style.opacity = 80.5;
  valid.elements[0].image.x = 42.5;
  const normalized = model.normalizeCanvas(valid);
  assert.deepEqual(clone(normalized), valid);
  normalized.elements[0].desktop.x = 0;
  assert.equal(valid.elements[0].desktop.x, 700);
  const imported = model.normalizeCanvas({ desktop: { height: NaN }, mobile: { height: 200 }, elements: [{ id: 'bad id', type: 'text', desktop: { x: Infinity, y: -1, width: 1500, height: 9000 }, mobile: { x: 1000, y: 1000, width: 500, height: 500 }, style: { color: 'url(javascript:bad)', opacity: 200 } }] });
  const document = fixture(); document.builder.home.at(-1).canvas = clone(imported);
  assert.doesNotThrow(() => validateCmsDocument(document));
  assert.deepEqual(clone(imported.elements[0].mobile), { x: 0, y: 0, width: 390, height: 200 });
  const once = clone(model.clampRect({ x: 1190, y: 799, width: 80, height: 50 }, 'desktop', 800));
  assert.deepEqual(once, { x: 1120, y: 750, width: 80, height: 50 });
  assert.deepEqual(clone(model.clampRect(once, 'desktop', 800)), once);
});

test('mobile stacking fits all visible objects, preserves order and flags, and leaves desktop frames unchanged', () => {
  const design = clone(model.createCanvas()); design.mobile.height = 6000;
  design.elements = Array.from({ length: 50 }, (_, index) => {
    const item = element('box', index);
    item.mobile.height = index % 2 ? 20 : 6000;
    item.mobile.y = 0;
    item.locked = index === 0;
    item.visible = index !== 2;
    return item;
  });
  const desktop = design.elements.map((item) => clone(item.desktop));
  assert.equal(model.stackMobile(design), design);
  assert.ok(design.mobile.height <= 6000);
  let edge = 0;
  for (const item of design.elements.filter((item) => item.visible)) {
    assert.ok(item.mobile.y >= edge);
    edge = item.mobile.y + item.mobile.height;
    assert.ok(edge <= design.mobile.height);
  }
  assert.equal(design.elements[0].locked, true);
  assert.equal(design.elements[2].visible, false);
  assert.deepEqual(design.elements.map((item) => item.desktop), desktop);
  const document = fixture(); document.builder.home.at(-1).canvas = clone(design);
  assert.doesNotThrow(() => validateCmsDocument(document));
});

test('element duplication changes identity without changing the source or allowing geometry to escape design width', () => {
  const item = element('button');
  item.desktop.x = 960; item.mobile.x = 150;
  const before = clone(item), duplicate = clone(model.duplicateElement(item));
  assert.notEqual(duplicate.id, item.id);
  assert.equal(duplicate.desktop.x, 960);
  assert.equal(duplicate.mobile.x, 150);
  assert.equal(duplicate.desktop.y, item.desktop.y);
  assert.deepEqual(item, before);
  const document = fixture(); canvas(document).elements.push(item, duplicate);
  assert.doesNotThrow(() => validateCmsDocument(document));
});

test('server enforces integer stage and frame boundaries including finite numbers, containment and both device frames', () => {
  const document = fixture(), design = canvas(document);
  design.desktop.height = 6000; design.mobile.height = 200;
  const item = element('box');
  item.desktop = { x: 0, y: 0, width: 1200, height: 6000 };
  item.mobile = { x: 370, y: 180, width: 20, height: 20 };
  design.elements.push(item);
  assert.doesNotThrow(() => validateCmsDocument(document));
  for (const value of [199, 6001, 200.5, NaN, Infinity, '800']) reject((_, design) => { design.desktop.height = value; });
  for (const key of ['x', 'y', 'width', 'height']) {
    for (const value of [NaN, Infinity, -1, 20.5, '20']) reject((_, __, item) => { item.desktop[key] = value; });
    reject((_, __, item) => { delete item.mobile[key]; });
  }
  reject((_, __, item) => { item.desktop.width = 19; });
  reject((_, __, item) => { item.mobile.height = 19; });
  reject((_, __, item) => { item.mobile.x = 100; });
  reject((_, __, item) => { item.desktop.y = 790; });
  reject((_, design) => { delete design.mobile; });
  reject((document) => { delete document.builder.home.at(-1).canvas; });
});

test('canvas identities, text, media and code-free style controls reject malformed or executable payloads', () => {
  for (const id of ['', '__proto__', 'constructor', 'has space', '../path']) reject((_, __, item) => { item.id = id; });
  reject((_, design, item) => { design.elements.push(clone(item)); });
  for (const key of ['name', 'text', 'image', 'style', 'href', 'locked', 'visible', 'type']) reject((_, __, item) => { delete item[key]; });
  reject((_, __, item) => { item.name = 'x'.repeat(101); });
  reject((_, __, item) => { item.text = 'x'.repeat(4001); });
  reject((_, __, item) => { item.locked = 'false'; });
  reject((_, __, item) => { item.type = 'html'; });
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//evil.test']) reject((_, __, item) => { item.href = value; });
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,x', 'https://example.test/x.svg', 'assets/../bad.png']) reject((_, __, item) => { item.image.src = value; });
  for (const value of ['red', '#fff', '#12345678', 'url(https://evil.test)']) reject((_, __, item) => { item.style.background = value; });
  for (const [key, value] of [['fontSize', 161], ['fontSize', 7], ['mobileFontSize', 101], ['borderWidth', 9], ['radius', 101], ['opacity', -1], ['fontFamily', 'url(x)'], ['fontWeight', 'bold'], ['align', 'justify']]) reject((_, __, item) => { item.style[key] = value; });
  reject((_, __, item) => { item.style.css = 'position:fixed'; });
  reject((_, __, item) => { item.html = '<script>alert(1)</script>'; });
  reject((_, design) => { design.backgroundScript = 'alert(1)'; });
});

test('layouts are optional on old builtins and custom sections, preserve saved canvas after type change and validate exact bounds', () => {
  const document = fixture();
  document.builder.home[0].layout = layout();
  const custom = document.builder.home.at(-1);
  custom.kind = 'text'; custom.layout = layout();
  custom.layout.desktop = { width: 20, height: 6000, align: 'right' };
  custom.layout.mobile = { width: 100, height: 200, align: 'left' };
  const before = clone(document);
  assert.doesNotThrow(() => validateCmsDocument(document));
  assert.deepEqual(publicCmsDocument(document), before);
  for (const [key, value] of [['width', 19], ['width', 101], ['width', 50.5], ['height', 199], ['height', 6001], ['height', -1], ['align', 'justify']]) {
    reject((document) => { document.builder.home[0].layout = layout(); document.builder.home[0].layout.desktop[key] = value; });
  }
  reject((document) => { document.builder.home[0].layout = { desktop: layout().desktop }; });
  reject((document) => { document.builder.home[0].layout = layout(); document.builder.home[0].layout.mobile.css = 'float:left'; });
  reject((document, design) => { document.builder.home[0].canvas = design; });
});

test('50 objects per design and 500 across homepage and pages are exact limits including inactive saved canvases', () => {
  const document = fixture();
  document.builder.home = Array.from({ length: 9 }, () => clone(builder.createSection('canvas')));
  const page = clone(builder.createPage()); page.sections = [clone(builder.createSection('canvas'))];
  document.builder.pages = [page];
  for (const section of [...document.builder.home, ...page.sections]) section.canvas.elements = Array.from({ length: 50 }, (_, index) => element('box', index));
  // A canvas retained after changing a block to text still counts toward its
  // bounds: switching templates must not bypass the server resource limit.
  document.builder.home[0].kind = 'text';
  assert.ok(Buffer.byteLength(JSON.stringify(document)) < MAX_DOCUMENT_BYTES);
  assert.doesNotThrow(() => validateCmsDocument(document));
  const tooManyInOne = clone(document); tooManyInOne.builder.home[0].canvas.elements.push(element());
  assert.throws(() => validateCmsDocument(tooManyInOne));
  document.builder.home.push(clone(builder.createSection('canvas')));
  document.builder.home.at(-1).canvas.elements.push(element());
  assert.throws(() => validateCmsDocument(document), /500/);
});

test('public projection retains published designs and geometry while removing draft canvas text without mutating editor data', () => {
  const document = fixture();
  const published = clone(builder.createPage()), draft = clone(builder.createPage());
  published.slug = 'yayindaki'; published.published = true;
  published.sections = [clone(builder.createSection('canvas'))]; published.sections[0].canvas.elements.push(element('button'));
  draft.slug = 'taslak'; draft.sections = [clone(builder.createSection('canvas'))];
  const secret = element('text'); secret.text = 'DRAFT CANVAS DO NOT LEAK'; draft.sections[0].canvas.elements.push(secret);
  document.builder.pages = [published, draft];
  const before = clone(document);
  const result = publicCmsDocument(validateCmsDocument(document));
  assert.deepEqual(result.builder.pages, [published]);
  assert.equal(JSON.stringify(result).includes('DO NOT LEAK'), false);
  assert.deepEqual(result.builder.home, before.builder.home);
  assert.deepEqual(document, before);
});
