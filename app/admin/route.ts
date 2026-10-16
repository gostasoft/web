import html from "../../public/admin.html?raw";
import { getCmsAdmin } from "@/lib/cms-server";
import { CmsInputError } from "@/lib/cms-validation";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  try {
    getCmsAdmin(request);
    return new Response(html, { headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "same-origin",
    } });
  } catch (error) {
    if (error instanceof CmsInputError && error.status === 401) {
      return new Response(null, { status: 302, headers: {
        "Location": "/signin-with-chatgpt?return_to=%2Fadmin",
        "Cache-Control": "no-store",
      } });
    }
    return new Response("<!doctype html><html lang=\"tr\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Erişim gerekli · Metin3</title><body style=\"background:#100b0d;color:#f3e8df;font:18px system-ui;padding:10vh 8vw\"><h1>Yönetici erişimi gerekli</h1><p>Bu hesabın yönetici paneline erişimi yok.</p><a style=\"color:#f4b95f\" href=\"/\">Ana sayfaya dön</a></body></html>", {
      status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
