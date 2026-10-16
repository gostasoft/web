import { CmsInputError } from "./cms-validation";

export type CmsAdmin = { id: string; email: string; displayName: string };

// These headers are supplied and verified by the Sites authentication proxy.
// Never substitute a client-submitted ID, local password or browser flag.
export function authorizeCmsAdmin(headers: Headers, configuredEmail: unknown): CmsAdmin {
  const id = headers.get("oai-authenticated-user-id")?.trim();
  const email = headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!id || !email) throw new CmsInputError("Yönetici paneli için hesabınla giriş yap.", 401);
  const allowed = typeof configuredEmail === "string" ? configuredEmail.trim().toLowerCase() : "";
  if (!allowed || !allowed.includes("@") || email !== allowed) {
    throw new CmsInputError("Bu hesabın yönetici paneline erişimi yok.", 403);
  }
  let displayName = email;
  const fullName = headers.get("oai-authenticated-user-full-name");
  if (fullName && headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(fullName).slice(0, 200) || email; } catch { /* Keep email. */ }
  }
  return { id, email, displayName };
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin !== new URL(request.url).origin || fetchSite === "cross-site") {
    throw new CmsInputError("Bu işlem yalnızca sitenin yönetici panelinden yapılabilir.", 403);
  }
}
