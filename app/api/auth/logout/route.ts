import { env } from "cloudflare:workers";
import { authorizeCmsAdmin, requireSameOrigin } from "@/lib/cms-security";
import { cmsDb, cmsError, cmsJson } from "@/lib/cms-server";
import { clearCmsSessionCookie, cmsSessionToken, revokeCmsSession } from "@/lib/cms-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const owner = authorizeCmsAdmin(request.headers, env.CMS_ADMIN_EMAIL);
    await revokeCmsSession(cmsDb(), cmsSessionToken(request), owner.id);
    const response = cmsJson({ authenticated: false, redirect: "/#giris" });
    response.headers.set("Set-Cookie", clearCmsSessionCookie());
    return response;
  } catch (error) { return cmsError(error); }
}
