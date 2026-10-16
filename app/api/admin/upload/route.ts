import { cmsBucket, cmsError, cmsJson, getCmsAdmin } from "@/lib/cms-server";
import { requireSameOrigin } from "@/lib/cms-security";
import { CmsInputError, MAX_UPLOAD_BYTES, detectImage, readLimitedBody } from "@/lib/cms-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = getCmsAdmin(request);
    requireSameOrigin(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new CmsInputError("Görsel dosyası seç.", 415);
    const body = await readLimitedBody(request, MAX_UPLOAD_BYTES + 16384);
    let form: FormData;
    try { form = await new Response(body, { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new CmsInputError("Görsel dosyası okunamadı."); }
    const file = form.get("file");
    if (!file || typeof file === "string" || form.getAll("file").length !== 1 || file.size === 0) throw new CmsInputError("Tek bir görsel dosyası seç.");
    if (file.size > MAX_UPLOAD_BYTES) throw new CmsInputError("Görsel en fazla 10 MB olabilir.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected) throw new CmsInputError("PNG, JPEG, WebP veya AVIF görseli yükle. SVG desteklenmiyor.", 415);
    const key = `${crypto.randomUUID()}.${detected.extension}`;
    const stored = await cmsBucket().put(key, bytes, {
      httpMetadata: { contentType: detected.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { uploadedBy: user.id, uploadedAt: new Date().toISOString() },
      onlyIf: { etagDoesNotMatch: "*" },
    });
    if (!stored) throw new CmsInputError("Görsel kaydedilemedi. Lütfen yeniden dene.", 503);
    const name = file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 240);
    return cmsJson({ url: `/media/${key}`, name, type: detected.type, size: bytes.byteLength }, 201);
  } catch (error) { return cmsError(error); }
}
