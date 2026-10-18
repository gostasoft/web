declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CMS_ADMIN_EMAIL?: string;
    CMS_LOGIN_EMAIL?: string;
    CMS_PASSWORD_HASH?: string;
  }
}
