import { cmsError, cmsJson, readCmsDocument } from "@/lib/cms-server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try { return cmsJson(await readCmsDocument()); }
  catch (error) { return cmsError(error); }
}
