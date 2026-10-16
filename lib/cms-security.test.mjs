import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { runInNewContext } from "node:vm";

// Exercise production TypeScript directly using the bundled Node runtime.
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const validationUrl = moduleUrl(source("./cms-validation.ts"));
const { validateCmsDocument, validateSaveRequest, isSafeLink, isSafeImageSource, detectImage, readLimitedBody } = await import(validationUrl);
const { authorizeCmsAdmin, requireSameOrigin } = await import(moduleUrl(source("./cms-security.ts").replace('"./cms-validation"', JSON.stringify(validationUrl))));
const { readStoredCmsDocument, saveStoredCmsDocument } = await import(moduleUrl(source("./cms-store.ts")));

function validDocument() {
  return { version: 1, texts: { "nav.home": "Ana sayfa" }, links: { support: "https://discord.gg/metin3" }, images: { logo: { src: "assets/ui/metin3-logo.png", fit: "contain", x: 50, y: 50 } }, content: {
    classes: [{ id: "warrior", name: "Savaşçı", eyebrow: "Cesaret", headline: "Bir hikâye", description: "Açıklama", style: "Yakın", classNote: "Güç", img: "assets/class-warrior.webp", symbol: "assets/ui/class-warrior.png" }],
    news: [], worlds: [{ id: "village", number: "01", title: "Köy", eyebrow: "Başlangıç", description: "Taş sokaklar", img: "assets/world-village.webp" }], faq: [],
  }, auth: { login: { eyebrow: "Giriş", title: "Hoş geldin", description: "Devam et" }, register: { eyebrow: "Kayıt", title: "Katıl", description: "Başla" } } };
}

test("owner gate requires Sites identity and configured exact normalized email", () => {
  const headers = new Headers({ "oai-authenticated-user-id": "stable-owner-id", "oai-authenticated-user-email": " Owner@Example.com " });
  assert.equal(authorizeCmsAdmin(headers, "owner@example.com").id, "stable-owner-id");
  assert.throws(() => authorizeCmsAdmin(new Headers(), "owner@example.com"), (error) => error.status === 401);
  assert.throws(() => authorizeCmsAdmin(headers, undefined), (error) => error.status === 403);
  assert.throws(() => authorizeCmsAdmin(headers, "another@example.com"), (error) => error.status === 403);
});

test("write origin must be present, identical and not cross-site", () => {
  assert.doesNotThrow(() => requireSameOrigin(new Request("https://site.example/api/admin/content", { headers: { origin: "https://site.example" } })));
  for (const headers of [{}, { origin: "https://evil.example" }, { origin: "https://site.example", "sec-fetch-site": "cross-site" }]) {
    assert.throws(() => requireSameOrigin(new Request("https://site.example/api/admin/content", { headers })), (error) => error.status === 403);
  }
});

test("document contract rejects scripts, prototype keys, missing fields and oversize input", () => {
  assert.equal(validateCmsDocument(validDocument()).version, 1);
  assert.equal(validateSaveRequest({ data: validDocument(), revision: 0 }).revision, 0);
  const unset = validDocument(); unset.links.support = "";
  assert.equal(validateCmsDocument(unset).links.support, "");
  assert.equal(isSafeLink(""), false);
  unset.links.support = "javascript:alert(1)";
  assert.throws(() => validateCmsDocument(unset));
  for (const link of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "data:text/html,x"]) assert.equal(isSafeLink(link), false);
  for (const image of ["data:image/png;base64,x", "assets/../unsafe.png", "https://site.example/payload.svg", "javascript:x"]) assert.equal(isSafeImageSource(image), false);
  const poisoned = JSON.parse(JSON.stringify(validDocument()).replace('"nav.home":"Ana sayfa"', '"__proto__":{"polluted":true}'));
  assert.throws(() => validateCmsDocument(poisoned));
  const invalid = validDocument(); delete invalid.auth.login.title;
  assert.throws(() => validateCmsDocument(invalid));
  const oversized = validDocument(); oversized.texts = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index), "ş".repeat(8000)]));
  assert.throws(() => validateCmsDocument(oversized));
  assert.throws(() => validateSaveRequest({ data: validDocument(), revision: -1 }));
  for (const collection of ["classes", "worlds"]) {
    const empty = validDocument(); empty.content[collection] = [];
    assert.throws(() => validateCmsDocument(empty));
  }
});

test("actual published defaults satisfy the complete server contract", () => {
  const context = { window: {} };
  runInNewContext(source("../public/cms-defaults.js"), context);
  const document = JSON.parse(JSON.stringify(context.window.M3CMS_DEFAULTS));
  assert.equal(validateCmsDocument(document).version, 1);
  assert.equal(document.links.download, "");
  assert.equal(document.links.community, "");
  assert.equal(document.links.support, "");
});

test("upload magic validation accepts supported raster signatures and refuses SVG", () => {
  assert.equal(detectImage(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0])).type, "image/png");
  assert.equal(detectImage(Uint8Array.from([255,216,255,224,0,0,0,0,0,0,0,0,0,0,0,0])).type, "image/jpeg");
  assert.equal(detectImage(new TextEncoder().encode("RIFFxxxxWEBPxxxx")).type, "image/webp");
  assert.equal(detectImage(Uint8Array.from([0,0,0,24,102,116,121,112,97,118,105,102,0,0,0,0,109,105,102,49,97,118,105,102])).type, "image/avif");
  assert.equal(detectImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(detectImage(new Uint8Array(0)), null);
});

test("body limit catches declared and streamed oversized payloads", async () => {
  await assert.rejects(readLimitedBody(new Request("https://site.example", { method: "POST", body: "too-long", headers: { "content-length": "8" } }), 3), (error) => error.status === 413);
  await assert.rejects(readLimitedBody(new Request("https://site.example", { method: "POST", body: "too-long" }), 3), (error) => error.status === 413);
  assert.equal(new TextDecoder().decode(await readLimitedBody(new Request("https://site.example", { method: "POST", body: "ok" }), 3)), "ok");
});

test("SQLite atomically rejects stale revisions and records stable updater ID", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE cms_documents (id integer PRIMARY KEY, data text NOT NULL, revision integer DEFAULT 1 NOT NULL, updated_at text NOT NULL, updated_by text NOT NULL)");
  const database = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    let args = [];
    const query = { bind(...values) { args = values; return query; }, async first() { return statement.get(...args) ?? null; } };
    return query;
  } };
  assert.deepEqual(await readStoredCmsDocument(database), { data: null, revision: 0 });
  assert.equal(await saveStoredCmsDocument(database, validDocument(), 7, "stable-owner-id"), null);
  assert.equal(await saveStoredCmsDocument(database, validDocument(), 0, "stable-owner-id"), 1);
  assert.equal(await saveStoredCmsDocument(database, validDocument(), 0, "other-id"), null);
  assert.equal(await saveStoredCmsDocument(database, validDocument(), 1, "stable-owner-id"), 2);
  assert.equal(await saveStoredCmsDocument(database, validDocument(), 1, "other-id"), null);
  assert.equal((await readStoredCmsDocument(database)).revision, 2);
  assert.equal(sqlite.prepare("SELECT updated_by FROM cms_documents").get().updated_by, "stable-owner-id");
  sqlite.close();
});
