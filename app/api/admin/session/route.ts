import { cmsError, cmsJson, getCmsAdmin, readCmsDocument } from "@/lib/cms-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getCmsAdmin(request);
    const { revision } = await readCmsDocument();
    return cmsJson({ authorized: true, user: { displayName: user.displayName, email: user.email }, revision });
  } catch (error) { return cmsError(error); }
}
