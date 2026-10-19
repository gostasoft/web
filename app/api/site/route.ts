import { cmsError, cmsJson, readCmsDocument } from "@/lib/cms-server";
import { publicCmsDocument } from "@/lib/cms-validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const snapshot = await readCmsDocument();
    return cmsJson({ ...snapshot, data: publicCmsDocument(snapshot.data) });
  }
  catch (error) { return cmsError(error); }
}
