import { cmsError, cmsJson, getCmsAdmin, readCmsDocument, saveCmsDocument } from "@/lib/cms-server";
import { requireSameOrigin } from "@/lib/cms-security";
import { CmsInputError, MAX_DOCUMENT_BYTES, readLimitedBody, validateSaveRequest } from "@/lib/cms-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    getCmsAdmin(request);
    return cmsJson(await readCmsDocument());
  } catch (error) { return cmsError(error); }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const user = getCmsAdmin(request);
    requireSameOrigin(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new CmsInputError("İçerik JSON biçiminde gönderilmeli.", 415);
    const bytes = await readLimitedBody(request, MAX_DOCUMENT_BYTES + 8192);
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new CmsInputError("İçerik okunamadı; JSON biçimini kontrol et."); }
    const { data, revision } = validateSaveRequest(payload);
    const savedRevision = await saveCmsDocument(data, revision, user.id);
    if (savedRevision === null) {
      const current = await readCmsDocument();
      return cmsJson({ error: "İçerik başka bir pencerede güncellendi. Son sürümü yükleyip tekrar dene.", revision: current.revision }, 409);
    }
    return cmsJson({ data, revision: savedRevision });
  } catch (error) { return cmsError(error); }
}
