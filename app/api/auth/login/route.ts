import { env } from "cloudflare:workers";
import { authorizeCmsAdmin, requireSameOrigin, type CmsAdmin } from "@/lib/cms-security";
import { cmsDb, cmsError, cmsJson } from "@/lib/cms-server";
import { CmsInputError, readLimitedBody } from "@/lib/cms-validation";
import { CMS_LOGIN_FAILURE, cleanupCmsAuth, cmsCredentialVersion, cmsIdentityRateLimitKey, cmsLoginConfigured, cmsRateLimitKey, cmsSessionCookie, consumeCmsLoginAttempt, createCmsSession, parseCmsLoginPayload, verifyCmsPassword } from "@/lib/cms-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new CmsInputError(CMS_LOGIN_FAILURE, 401);
    const bytes = await readLimitedBody(request, 8192);
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new CmsInputError(CMS_LOGIN_FAILURE, 401); }
    const { username, password } = parseCmsLoginPayload(payload);
    const database = cmsDb();
    const now = Date.now();
    await cleanupCmsAuth(database, now);
    const identityKey = await cmsIdentityRateLimitKey(request);
    const aggregate = identityKey ? await consumeCmsLoginAttempt(database, identityKey, now) : { allowed: true, retryAfter: 0 };
    const attempt = aggregate.allowed ? await consumeCmsLoginAttempt(database, await cmsRateLimitKey(request), now) : aggregate;
    if (!attempt.allowed) {
      const response = cmsJson({ error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar dene." }, 429);
      response.headers.set("Retry-After", String(attempt.retryAfter));
      return response;
    }
    let owner: CmsAdmin | null = null;
    try { owner = authorizeCmsAdmin(request.headers, env.CMS_ADMIN_EMAIL); }
    catch (error) { if (!(error instanceof CmsInputError)) throw error; }
    // Compute the password result even for a mismatched username or Sites
    // identity. Every credential failure has the same public response.
    const passwordMatches = await verifyCmsPassword(password, env.CMS_PASSWORD_HASH);
    const configured = cmsLoginConfigured(env.CMS_LOGIN_EMAIL, env.CMS_PASSWORD_HASH);
    const usernameMatches = configured && username === env.CMS_LOGIN_EMAIL!.trim().toLowerCase();
    if (!owner || !configured || !usernameMatches || !passwordMatches) throw new CmsInputError(CMS_LOGIN_FAILURE, 401);
    const version = await cmsCredentialVersion(env.CMS_LOGIN_EMAIL!, env.CMS_PASSWORD_HASH!);
    const token = await createCmsSession(database, owner.id, version, now);
    const response = cmsJson({ authenticated: true, redirect: "/admin" });
    response.headers.set("Set-Cookie", cmsSessionCookie(token));
    return response;
  } catch (error) { return cmsError(error); }
}
