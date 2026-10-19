export const MAX_DOCUMENT_BYTES = 512 * 1024;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type CmsImage = { src: string; x?: number; y?: number; fit?: "cover" | "contain" };
export type CmsClass = {
  id: string; name: string; eyebrow: string; headline: string; description: string;
  style: string; classNote: string; img: string; [key: string]: unknown;
};
export type CmsNews = {
  id: string; category: string; title: string; excerpt: string; img: string;
  readTime: string; body: string[]; [key: string]: unknown;
};
export type CmsWorld = {
  id: string; number: string; title: string; eyebrow: string; description: string;
  img: string; [key: string]: unknown;
};
export type CmsFaq = { question: string; answer: string; [key: string]: unknown };
export type CmsAuthCopy = { eyebrow: string; title: string; description: string };
export type CmsBuiltinSource = "hero" | "start" | "news" | "classes" | "world" | "faq" | "community";
export type CmsSectionStyle = {
  tone: "dark" | "burgundy" | "transparent";
  align: "left" | "center";
  spacing: "compact" | "normal" | "wide";
  imageSide: "left" | "right";
};
export type CmsSectionItem = { id: string; title: string; body: string; image: CmsImage; href: string };
export type CmsSection = { id: string; kind: "builtin"; source: CmsBuiltinSource; visible: boolean } | {
  id: string; kind: "text" | "imageText" | "cards" | "gallery" | "faq" | "cta";
  visible: boolean; source?: CmsBuiltinSource; eyebrow: string; title: string; body: string;
  image: CmsImage; button: { label: string; href: string }; style: CmsSectionStyle; items: CmsSectionItem[];
};
export type CmsPage = { id: string; slug: string; title: string; description: string; published: boolean; sections: CmsSection[] };
export type CmsNavigation = { id: string; label: string; href: string; visible: boolean };
export type CmsBuilder = { version: 1; home: CmsSection[]; pages: CmsPage[]; navigation: CmsNavigation[] };
export type CmsDocument = {
  version: 1;
  texts: Record<string, string>;
  images: Record<string, CmsImage>;
  links: Record<string, string>;
  content: { classes: CmsClass[]; news: CmsNews[]; worlds: CmsWorld[]; faq: CmsFaq[] };
  auth: { login: CmsAuthCopy; register: CmsAuthCopy };
  builder?: CmsBuilder;
  [key: string]: unknown;
};

export class CmsInputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CmsInputError";
    this.status = status;
  }
}

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const KEY = /^[A-Za-z0-9._-]{1,100}$/;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function input(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CmsInputError(message);
}

function boundedString(value: unknown, maximum = 16000): value is string {
  return typeof value === "string" && value.length <= maximum && !value.includes("\0");
}

// Validate every key, including future fields, before any document is merged
// into the frontend defaults. This prevents prototype-polluting payloads.
function validateTree(value: unknown, depth = 0, budget = { count: 0 }): void {
  // The builder permits 200 sections with 20 small items each. Keep traversal
  // bounded while allowing that valid shape within the 512 KB document cap.
  input(++budget.count <= 50000 && depth <= 14, "İçerik çok karmaşık.");
  if (typeof value === "string") {
    input(boundedString(value), "Bir metin alanı çok uzun veya geçersiz.");
  } else if (typeof value === "number") {
    input(Number.isFinite(value), "Sayısal alan geçersiz.");
  } else if (Array.isArray(value)) {
    input(value.length <= 300, "Bir listede çok fazla öğe var.");
    for (const item of value) validateTree(item, depth + 1, budget);
  } else if (record(value)) {
    const entries = Object.entries(value);
    input(entries.length <= 400, "Bir bölümde çok fazla alan var.");
    for (const [key, item] of entries) {
      input(KEY.test(key) && !FORBIDDEN_KEYS.has(key), "İçerikte geçersiz alan adı var.");
      validateTree(item, depth + 1, budget);
    }
  } else {
    input(value === null || typeof value === "boolean", "İçerikte desteklenmeyen değer var.");
  }
}

export function isSafeImageSource(value: unknown): value is string {
  if (!boundedString(value, 2048) || !value || /[\u0000-\u0020\\<>"']/.test(value)) return false;
  if (/^(?:\/)?assets\/[A-Za-z0-9._/-]+$/.test(value)) {
    return !value.split("/").includes("..") && !/\.svg(?:$|[?#])/i.test(value);
  }
  if (/^\/media\/[a-f0-9-]{36}\.(?:png|jpg|webp|avif)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      !/\.svg$/i.test(url.pathname);
  } catch { return false; }
}

export function isSafeLink(value: unknown): value is string {
  if (!boundedString(value, 2048) || !value || /[\u0000-\u0020\\<>"']/.test(value)) return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try { return new URL(value, "https://site.local").origin === "https://site.local"; }
    catch { return false; }
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return !url.username && !url.password;
    return url.protocol === "mailto:" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname);
  } catch { return false; }
}

function fields(item: unknown, required: string[], label: string): asserts item is Record<string, unknown> {
  input(record(item), `${label} alanı geçersiz.`);
  for (const key of required) input(boundedString(item[key], key === "description" || key === "answer" ? 12000 : 4000), `${label}: ${key} alanı geçersiz.`);
}

function collection(value: unknown, limit: number, label: string): asserts value is Record<string, unknown>[] {
  input(Array.isArray(value) && value.length <= limit && value.every(record), `${label} listesi geçersiz.`);
  const ids = new Set<string>();
  for (const item of value) {
    if ("id" in item) {
      input(typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(item.id) && !ids.has(item.id), `${label}: kimlikler benzersiz olmalı.`);
      ids.add(item.id);
    }
  }
}

const BUILTIN_SOURCES = new Set(["hero", "start", "news", "classes", "world", "faq", "community"]);
const CUSTOM_SECTION_KINDS = new Set(["text", "imageText", "cards", "gallery", "faq", "cta"]);
const BUILDER_ID = /^[A-Za-z0-9_-]{1,100}$/;
const PAGE_SLUG = /^[a-z][a-z0-9-]{0,59}$/;

function exactBuilderFields(value: unknown, keys: string[], label: string): asserts value is Record<string, unknown> {
  input(record(value), `${label} alanı geçersiz.`);
  input(Object.keys(value).every((key) => keys.includes(key)), `${label} bölümünde desteklenmeyen alan var.`);
}

function builderRecords(value: unknown, maximum: number, label: string): asserts value is Record<string, unknown>[] {
  input(Array.isArray(value) && value.length <= maximum, `${label} listesi en fazla ${maximum} öğe içerebilir.`);
  const ids = new Set<string>();
  for (const item of value) {
    input(record(item) && typeof item.id === "string" && BUILDER_ID.test(item.id) && !FORBIDDEN_KEYS.has(item.id), `${label}: güvenli bir kimlik gerekli.`);
    input(!ids.has(item.id), `${label}: kimlikler benzersiz olmalı.`);
    ids.add(item.id);
  }
}

function builderImage(value: unknown): void {
  exactBuilderFields(value, ["src", "x", "y", "fit"], "Görsel");
  // Text-only blocks can leave their illustration unset. Legacy site images
  // retain their existing nonempty source requirement.
  input(value.src === "" || isSafeImageSource(value.src), "Bölüm görselinin adresi geçersiz.");
  for (const coordinate of [value.x, value.y]) input(coordinate === undefined || (typeof coordinate === "number" && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 100), "Görsel konumu 0 ile 100 arasında olmalı.");
  input(value.fit === undefined || value.fit === "cover" || value.fit === "contain", "Görsel yerleşimi geçersiz.");
}

function builderSections(value: unknown, home: boolean): asserts value is CmsSection[] {
  builderRecords(value, 40, home ? "Ana sayfa bölümleri" : "Sayfa bölümleri");
  const sources = new Set<string>();
  for (const section of value) {
    input(typeof section.visible === "boolean", "Bölüm görünürlüğü geçersiz.");
    if (section.kind === "builtin") {
      input(home, "Hazır site bölümleri yalnızca ana sayfada kullanılabilir.");
      exactBuilderFields(section, ["id", "kind", "source", "visible"], "Hazır bölüm");
      input(typeof section.source === "string" && BUILTIN_SOURCES.has(section.source), "Hazır bölüm kaynağı geçersiz.");
      input(!sources.has(section.source), "Bir hazır bölüm ana sayfada yalnızca bir kez kullanılabilir.");
      sources.add(section.source);
      continue;
    }
    exactBuilderFields(section, ["id", "kind", "source", "visible", "eyebrow", "title", "body", "image", "button", "style", "items"], "Özel bölüm");
    input(typeof section.kind === "string" && CUSTOM_SECTION_KINDS.has(section.kind), "Bölüm türü geçersiz.");
    input(section.source === undefined || (typeof section.source === "string" && BUILTIN_SOURCES.has(section.source)), "Bölüm kaynağı geçersiz.");
    input(boundedString(section.eyebrow, 100) && boundedString(section.title, 200) && boundedString(section.body, 12000), "Bölüm metni geçersiz veya çok uzun.");
    builderImage(section.image);
    exactBuilderFields(section.button, ["label", "href"], "Bölüm düğmesi");
    input(boundedString(section.button.label, 80) && (section.button.href === "" || isSafeLink(section.button.href)), "Bölüm düğmesinin metni veya bağlantısı geçersiz.");
    exactBuilderFields(section.style, ["tone", "align", "spacing", "imageSide"], "Bölüm görünümü");
    input(["dark", "burgundy", "transparent"].includes(section.style.tone as string) &&
      ["left", "center"].includes(section.style.align as string) &&
      ["compact", "normal", "wide"].includes(section.style.spacing as string) &&
      ["left", "right"].includes(section.style.imageSide as string), "Bölüm görünümü desteklenmiyor.");
    builderRecords(section.items, 20, "Bölüm öğeleri");
    for (const item of section.items) {
      exactBuilderFields(item, ["id", "title", "body", "image", "href"], "Bölüm öğesi");
      input(boundedString(item.title, 200) && boundedString(item.body, 12000) && (item.href === "" || isSafeLink(item.href)), "Bölüm öğesinin metni veya bağlantısı geçersiz.");
      builderImage(item.image);
    }
  }
}

function validateCmsBuilder(value: unknown): asserts value is CmsBuilder {
  exactBuilderFields(value, ["version", "home", "pages", "navigation"], "Sayfa düzenleyici");
  input(value.version === 1, "Sayfa düzenleyici sürümü geçersiz.");
  builderSections(value.home, true);
  builderRecords(value.pages, 30, "Özel sayfalar");
  const slugs = new Set<string>();
  let sectionCount = value.home.length;
  for (const page of value.pages) {
    exactBuilderFields(page, ["id", "slug", "title", "description", "published", "sections"], "Özel sayfa");
    input(typeof page.slug === "string" && PAGE_SLUG.test(page.slug) && !slugs.has(page.slug), "Sayfa adresi küçük harfle başlamalı ve benzersiz olmalı (en fazla 60 karakter).");
    slugs.add(page.slug);
    input(boundedString(page.title, 200) && boundedString(page.description, 12000) && typeof page.published === "boolean", "Sayfa başlığı, açıklaması veya yayın durumu geçersiz.");
    builderSections(page.sections, false);
    sectionCount += page.sections.length;
    input(sectionCount <= 200, "Toplam bölüm sayısı 200 sınırını aşıyor.");
  }
  builderRecords(value.navigation, 20, "Menü bağlantıları");
  for (const entry of value.navigation) {
    exactBuilderFields(entry, ["id", "label", "href", "visible"], "Menü bağlantısı");
    input(boundedString(entry.label, 80) && isSafeLink(entry.href) && typeof entry.visible === "boolean", "Menü metni, bağlantısı veya görünürlüğü geçersiz.");
  }
}

// This projection is for the visitor endpoint only. The authenticated editor
// retains the full document, including drafts, for editing and local preview.
export function publicCmsDocument(document: CmsDocument | null): CmsDocument | null {
  if (!document || document.builder === undefined) return document;
  try { validateCmsBuilder(document.builder); }
  catch { return { ...document, builder: undefined }; }
  const pages = document.builder.pages.filter((page) => page.published === true);
  const publishedSlugs = new Set(pages.map((page) => page.slug));
  const navigation = document.builder.navigation.filter((entry) => {
    const match = /^(?:\/)?#sayfa\/([^?#]*)/.exec(entry.href);
    if (!match) return true;
    try { return publishedSlugs.has(decodeURIComponent(match[1])); }
    catch { return false; }
  });
  return { ...document, builder: { ...document.builder, pages, navigation } };
}

export function validateCmsDocument(value: unknown): CmsDocument {
  validateTree(value);
  input(record(value) && value.version === 1, "İçerik sürümü geçersiz.");
  input(new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_DOCUMENT_BYTES, "İçerik 512 KB sınırını aşıyor.");
  input(record(value.texts) && Object.keys(value.texts).length <= 300, "Metin alanları geçersiz.");
  for (const text of Object.values(value.texts)) input(boundedString(text, 12000), "Metin alanı geçersiz.");
  input(record(value.links) && Object.keys(value.links).length <= 150, "Bağlantı alanları geçersiz.");
  // An empty optional link preserves the site's explanatory modal. Editors
  // can remove a previously configured destination without inventing a URL.
  for (const link of Object.values(value.links)) input(link === "" || isSafeLink(link), "Bağlantı güvenli bir adres olmalı.");
  input(record(value.images) && Object.keys(value.images).length <= 150, "Görsel alanları geçersiz.");
  for (const image of Object.values(value.images)) {
    input(record(image) && isSafeImageSource(image.src), "Görsel adresi geçersiz.");
    for (const position of [image.x, image.y]) input(position === undefined || (typeof position === "number" && Number.isFinite(position) && position >= 0 && position <= 100), "Görsel konumu 0 ile 100 arasında olmalı.");
    input(image.fit === undefined || image.fit === "cover" || image.fit === "contain", "Görsel yerleşimi geçersiz.");
  }
  input(record(value.content), "İçerik bölümleri geçersiz.");
  collection(value.content.classes, 16, "Sınıflar");
  input(value.content.classes.length > 0, "En az bir sınıf olmalı.");
  for (const item of value.content.classes) {
    fields(item, ["id", "name", "eyebrow", "headline", "description", "style", "classNote", "img"], "Sınıf");
    input(isSafeImageSource(item.img), "Sınıf görseli geçersiz.");
    input(item.symbol === undefined || isSafeImageSource(item.symbol), "Sınıf sembolü geçersiz.");
  }
  collection(value.content.news, 100, "Haberler");
  for (const item of value.content.news) {
    fields(item, ["id", "category", "title", "excerpt", "img", "readTime"], "Haber");
    input(isSafeImageSource(item.img), "Haber görseli geçersiz.");
    input(Array.isArray(item.body) && item.body.length <= 50 && item.body.every((text: unknown) => boundedString(text, 12000)), "Haber paragrafları geçersiz.");
  }
  collection(value.content.worlds, 30, "Dünya");
  input(value.content.worlds.length > 0, "En az bir dünya alanı olmalı.");
  for (const item of value.content.worlds) {
    fields(item, ["id", "number", "title", "eyebrow", "description", "img"], "Dünya");
    input(isSafeImageSource(item.img), "Dünya görseli geçersiz.");
  }
  collection(value.content.faq, 100, "Sık sorulan sorular");
  for (const item of value.content.faq) fields(item, ["question", "answer"], "Soru");
  input(record(value.auth), "Hesap ekranları geçersiz.");
  fields(value.auth.login, ["eyebrow", "title", "description"], "Giriş ekranı");
  fields(value.auth.register, ["eyebrow", "title", "description"], "Kayıt ekranı");
  if (value.builder !== undefined) validateCmsBuilder(value.builder);
  return value as CmsDocument;
}

export function validateSaveRequest(value: unknown): { data: CmsDocument; revision: number } {
  input(record(value) && Number.isSafeInteger(value.revision) && (value.revision as number) >= 0, "İçerik sürüm numarası geçersiz.");
  return { data: validateCmsDocument(value.data), revision: value.revision as number };
}

// File names and browser MIME hints are untrusted. Match only supported raster
// signatures and store under a fresh immutable name with the detected type.
export function detectImage(bytes: Uint8Array): { type: string; extension: string } | null {
  if (bytes.length < 16) return null;
  if ([137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) return { type: "image/png", extension: "png" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { type: "image/jpeg", extension: "jpg" };
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", extension: "webp" };
  if (ascii(4, 8) === "ftyp") {
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    if (boxSize < 16 || boxSize > bytes.length || boxSize > 4096) return null;
    const brands = [ascii(8, 12)];
    for (let index = 16; index + 4 <= boxSize; index += 4) brands.push(ascii(index, index + 4));
    if (brands.some((brand) => brand === "avif" || brand === "avis")) return { type: "image/avif", extension: "avif" };
  }
  return null;
}

export async function readLimitedBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) throw new CmsInputError("Dosya veya içerik boyutu sınırı aşıldı.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new CmsInputError("Dosya veya içerik boyutu sınırı aşıldı.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}
