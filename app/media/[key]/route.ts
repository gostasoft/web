import { cmsBucket, cmsError, cmsJson } from "@/lib/cms-server";

export const dynamic = "force-dynamic";
const CONTENT_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", avif: "image/avif" };

export async function GET(request: Request, context: { params: Promise<{ key: string }> }): Promise<Response> {
  try {
    const { key } = await context.params;
    if (!/^[a-f0-9-]{36}\.(png|jpg|webp|avif)$/.test(key)) return cmsJson({ error: "Görsel bulunamadı." }, 404);
    const object = await cmsBucket().get(key);
    if (!object) return cmsJson({ error: "Görsel bulunamadı." }, 404);
    const expectedType = CONTENT_TYPES[key.split(".").pop()!];
    if (object.httpMetadata?.contentType !== expectedType) return cmsJson({ error: "Görsel biçimi geçersiz." }, 404);
    const headers = new Headers({
      "Content-Type": expectedType,
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": object.httpEtag,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    if (request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
    return new Response(object.body, { headers });
  } catch (error) { return cmsError(error); }
}
