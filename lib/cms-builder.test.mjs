import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";

const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(code)).toString("base64")}`;
const validationUrl = moduleUrl(source("./cms-validation.ts"));
const { validateCmsDocument, validateSaveRequest, publicCmsDocument, MAX_DOCUMENT_BYTES } = await import(validationUrl);
const publicApiFixture = {};
globalThis.__cmsBuilderPublicFixture = publicApiFixture;
const serverUrl = moduleUrl(`export async function readCmsDocument() { return globalThis.__cmsBuilderPublicFixture.snapshot; }
  export function cmsJson(value) { return Response.json(value); }
  export function cmsError(error) { throw error; }`);
const publicRouteUrl = moduleUrl(source("../app/api/site/route.ts")
  .replace('"@/lib/cms-server"', JSON.stringify(serverUrl))
  .replace('"@/lib/cms-validation"', JSON.stringify(validationUrl)));
const { GET: publicGet } = await import(publicRouteUrl);
const clone = (value) => JSON.parse(JSON.stringify(value));

function legacyDocument() {
  const context = { window: {} };
  runInNewContext(source("../public/cms-defaults.js"), context);
  return clone(context.window.M3CMS_DEFAULTS);
}
function section(id = "section-1", kind = "text") {
  return { id, kind, visible: true, eyebrow: "MET3 ONLINE", title: "Bölüm başlığı", body: "Açıklama", image: { src: "" }, button: { label: "", href: "" }, style: { tone: "dark", align: "left", spacing: "normal", imageSide: "left" }, items: [] };
}
function page(id = "page-1", slug = "ilk-sayfa", published = true) {
  return { id, slug, title: "Sayfa başlığı", description: "Sayfa açıklaması", published, sections: [section()] };
}
function builder() {
  return { version: 1, home: [{ id: "builtin-hero", kind: "builtin", source: "hero", visible: true }, section()], pages: [page()], navigation: [{ id: "home", label: "Ana Sayfa", href: "#anasayfa", visible: true }] };
}
function documentWithBuilder() { return { ...legacyDocument(), builder: builder() }; }
function rejectChange(change) {
  const document = documentWithBuilder(); change(document.builder);
  assert.throws(() => validateCmsDocument(document), (error) => error.status === 400);
}

test("legacy documents remain valid and unchanged when builder is absent", () => {
  const document = legacyDocument();
  const before = clone(document);
  assert.equal(validateCmsDocument(document), document);
  assert.equal(publicCmsDocument(document), document);
  assert.deepEqual(document, before);
  assert.equal(publicCmsDocument(null), null);
});

test("actual shared builder model creates valid defaults, pages and all six section kinds without changing saved text", () => {
  const document = legacyDocument();
  document.texts["hero.title"] = "Kullanıcının kayıtlı başlığı";
  document.texts["footer.copyright"] = "Kullanıcının kayıtlı telif yazısı";
  const previousTexts = clone(document.texts);
  const context = { window: {} };
  runInNewContext(source("../public/builder-model.js"), context);
  const model = context.window.M3BUILDER;
  document.builder = clone(model.defaults(document));
  for (const kind of ["text", "imageText", "cards", "gallery", "faq", "cta"]) document.builder.home.push(clone(model.createSection(kind, document)));
  const createdPage = clone(model.createPage(document));
  createdPage.sections.push(...["text", "imageText", "cards", "gallery", "faq", "cta"].map((kind) => clone(model.createSection(kind, document))));
  document.builder.pages.push(createdPage);
  assert.equal(validateCmsDocument(document), document);
  const roundtrip = clone(document);
  assert.deepEqual(validateSaveRequest({ data: roundtrip, revision: 7 }), { data: document, revision: 7 });
  assert.deepEqual(document.texts, previousTexts);
  assert.equal(document.builder.pages[0].published, false);
});

test("builder count limits admit exact boundaries and reject overflows including total sections", () => {
  const document = documentWithBuilder();
  document.builder.home = Array.from({ length: 40 }, (_, index) => section(`home-${index}`));
  document.builder.pages = Array.from({ length: 4 }, (_, index) => ({ ...page(`page-${index}`, `sayfa-${index}`), sections: Array.from({ length: 40 }, (_, number) => section(`section-${number}`)) }));
  for (const entry of [...document.builder.home, ...document.builder.pages.flatMap((entry) => entry.sections)]) {
    entry.items = Array.from({ length: 20 }, (_, index) => ({ id: `item-${index}`, title: "", body: "", image: { src: "" }, href: "" }));
  }
  assert.ok(new TextEncoder().encode(JSON.stringify(document)).length <= MAX_DOCUMENT_BYTES);
  assert.equal(validateCmsDocument(document).builder.home.length, 40);
  document.builder.pages.push(page("last-page", "son-sayfa"));
  assert.throws(() => validateCmsDocument(document));
  rejectChange((value) => { value.home = Array.from({ length: 41 }, (_, index) => section(`home-${index}`)); });
  rejectChange((value) => { value.pages[0].sections = Array.from({ length: 41 }, (_, index) => section(`section-${index}`)); });
  rejectChange((value) => { value.pages = Array.from({ length: 31 }, (_, index) => ({ ...page(`page-${index}`, `sayfa-${index}`), sections: [] })); });
  rejectChange((value) => { value.navigation = Array.from({ length: 21 }, (_, index) => ({ id: `nav-${index}`, label: "Menü", href: "#anasayfa", visible: true })); });
  rejectChange((value) => { value.home[1].items = Array.from({ length: 21 }, (_, index) => ({ id: `item-${index}`, title: "Öğe", body: "", image: { src: "" }, href: "" })); });
  const maximum = documentWithBuilder();
  maximum.builder.pages = Array.from({ length: 30 }, (_, index) => ({ ...page(`page-${index}`, `sayfa-${index}`), sections: [] }));
  maximum.builder.navigation = Array.from({ length: 20 }, (_, index) => ({ id: `nav-${index}`, label: "Menü", href: "#anasayfa", visible: true }));
  maximum.builder.home[1].items = Array.from({ length: 20 }, (_, index) => ({ id: `item-${index}`, title: "Öğe", body: "", image: { src: "" }, href: "" }));
  assert.equal(validateCmsDocument(maximum).builder.pages.length, 30);
});

test("builder IDs and slugs are safe and unique within their documented scopes", () => {
  for (const id of ["has space", "<script>", "../path", "constructor", "__proto__", ""]) rejectChange((value) => { value.home[1].id = id; });
  rejectChange((value) => { value.home[1].id = value.home[0].id; });
  rejectChange((value) => { value.pages[0].sections.push(clone(value.pages[0].sections[0])); });
  rejectChange((value) => { value.pages.push({ ...page(), slug: "farkli-adres" }); });
  rejectChange((value) => { value.navigation.push(clone(value.navigation[0])); });
  rejectChange((value) => { value.home[1].items = [0, 1].map(() => ({ id: "duplicate", title: "Öğe", body: "", image: { src: "" }, href: "" })); });
  for (const slug of ["", "UPPER", "1-page", "sayfa/iki", "a".repeat(61), "türkçe"]) rejectChange((value) => { value.pages[0].slug = slug; });
  rejectChange((value) => { value.pages.push(page("different-id", value.pages[0].slug, false)); });
  const allowed = documentWithBuilder();
  allowed.builder.pages.push(page("another-page", "a".repeat(60), false));
  assert.doesNotThrow(() => validateCmsDocument(allowed));
});

test("builtins are minimal, unique home sources and forbidden in custom pages", () => {
  rejectChange((value) => { value.home.push({ id: "second-hero", kind: "builtin", source: "hero", visible: false }); });
  rejectChange((value) => { value.home[0].source = "unknown"; });
  rejectChange((value) => { value.home[0].title = "Unsupported override"; });
  rejectChange((value) => { value.pages[0].sections = [clone(value.home[0])]; });
  rejectChange((value) => { value.home[0].visible = "true"; });
});

test("custom fields, exact length boundaries and enum style choices are enforced", () => {
  for (const key of ["eyebrow", "title", "body", "image", "button", "style", "items"]) rejectChange((value) => { delete value.home[1][key]; });
  for (const [key, maximum] of [["eyebrow", 100], ["title", 200], ["body", 12000]]) {
    const accepted = documentWithBuilder(); accepted.builder.home[1][key] = "x".repeat(maximum);
    assert.doesNotThrow(() => validateCmsDocument(accepted));
    rejectChange((value) => { value.home[1][key] = "x".repeat(maximum + 1); });
  }
  rejectChange((value) => { value.home[1].button.label = "x".repeat(81); });
  rejectChange((value) => { value.navigation[0].label = "x".repeat(81); });
  rejectChange((value) => { value.pages[0].title = "x".repeat(201); });
  rejectChange((value) => { value.pages[0].description = "x".repeat(12001); });
  for (const [key, invalid] of [["tone", "custom-css"], ["align", "justify"], ["spacing", "-10px"], ["imageSide", "top"]]) rejectChange((value) => { value.home[1].style[key] = invalid; });
  rejectChange((value) => { value.pages[0].published = "false"; });
});

test("builder image and link safety allows unset illustration and optional href without adding executable features", () => {
  const accepted = documentWithBuilder();
  accepted.builder.home[1].items.push({ id: "item-1", title: "Öğe", body: "", image: { src: "", x: 0, y: 100, fit: "contain" }, href: "" });
  accepted.builder.home[1].button = { label: "Özel sayfa", href: "#sayfa/ilk-sayfa" };
  assert.doesNotThrow(() => validateCmsDocument(accepted));
  for (const unsafe of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example"]) {
    rejectChange((value) => { value.home[1].button.href = unsafe; });
    rejectChange((value) => { value.navigation[0].href = unsafe; });
  }
  rejectChange((value) => { value.navigation[0].href = ""; });
  for (const unsafe of ["data:image/png;base64,x", "assets/../bad.png", "https://example.test/unsafe.svg", "javascript:alert(1)"]) rejectChange((value) => { value.home[1].image.src = unsafe; });
  rejectChange((value) => { value.home[1].image.x = 101; });
  rejectChange((value) => { value.home[1].image.fit = "stretch"; });
  rejectChange((value) => { value.home[1].kind = "html"; });
  rejectChange((value) => { value.home[1].html = "<script>alert(1)</script>"; });
  rejectChange((value) => { value.home[1].style.css = "position:fixed"; });
  rejectChange((value) => { value.pages[0].script = "alert(1)"; });
  const legacy = legacyDocument(); legacy.images["hero.main"].src = "";
  assert.throws(() => validateCmsDocument(legacy));
  const poisoned = documentWithBuilder(); poisoned.builder.home[1].items = [JSON.parse('{"id":"item","title":"x","body":"","image":{"src":""},"href":"","__proto__":{"polluted":true}}')];
  assert.throws(() => validateCmsDocument(poisoned));
});

test("public projection strips draft page contents and their navigation without mutating saved editor data", () => {
  const document = documentWithBuilder();
  const draft = page("draft-page", "taslak-sayfa", false);
  draft.title = "DRAFT TITLE DO NOT PUBLISH";
  draft.description = "DRAFT DESCRIPTION DO NOT PUBLISH";
  draft.sections[0].body = "DRAFT BODY DO NOT PUBLISH";
  document.builder.pages.push(draft);
  document.builder.home[1].visible = false;
  document.builder.navigation.push(
    { id: "published", label: "Yayınlanan", href: "#sayfa/ilk-sayfa", visible: true },
    { id: "draft", label: "Taslak menüsü", href: "#sayfa/taslak-sayfa", visible: true },
    { id: "encoded-draft", label: "Kodlu taslak", href: "/#sayfa/%74aslak-sayfa", visible: true },
    { id: "missing", label: "Olmayan sayfa", href: "#sayfa/olmayan", visible: false },
    { id: "external", label: "Topluluk", href: "https://example.test/community", visible: true },
  );
  const before = clone(document);
  const projected = publicCmsDocument(validateCmsDocument(document));
  assert.equal(projected.builder.pages.length, 1);
  assert.equal(JSON.stringify(projected).includes("DO NOT PUBLISH"), false);
  assert.deepEqual(projected.builder.navigation.map((entry) => entry.id), ["home", "published", "external"]);
  assert.equal(projected.builder.home[1].visible, false);
  assert.deepEqual(projected.texts, document.texts);
  assert.deepEqual(document, before);
});

test("actual visitor GET preserves revision and legacy content while withholding all draft payloads", async () => {
  const document = documentWithBuilder();
  document.builder.pages[0].published = false;
  document.builder.pages[0].sections[0].body = "DO NOT LEAK THROUGH PUBLIC API";
  document.texts["hero.title"] = "Kayıtlı başlık";
  publicApiFixture.snapshot = { data: document, revision: 42 };
  const response = await publicGet();
  const body = await response.json();
  assert.equal(body.revision, 42);
  assert.equal(body.data.texts["hero.title"], "Kayıtlı başlık");
  assert.deepEqual(body.data.builder.pages, []);
  assert.equal(JSON.stringify(body).includes("DO NOT LEAK"), false);
  assert.equal(publicApiFixture.snapshot.data.builder.pages.length, 1);
  publicApiFixture.snapshot = { data: null, revision: 0 };
  assert.deepEqual(await (await publicGet()).json(), { data: null, revision: 0 });
  const malformed = { ...legacyDocument(), builder: { version: 1, pages: [{ published: false, secret: "DRAFT" }] } };
  assert.equal(JSON.stringify(publicCmsDocument(malformed)).includes("DRAFT"), false);
});
