import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { handleProgressiveServerActionRequest, readActionFormDataWithLimit } from "../node_modules/vinext/dist/server/app-server-action-execution.js";
import { parseBodySizeLimit } from "../node_modules/vinext/dist/config/next-config.js";

const loadTypeScript = async (file) => import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(new URL(file, import.meta.url), "utf8"))).toString("base64")}`);
const { default: config } = await loadTypeScript("../next.config.ts");
const { MAX_UPLOAD_BYTES, readLimitedBody } = await loadTypeScript("./cms-validation.ts");

async function multipartRequest(fileBytes) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(fileBytes)], { type: "image/png" }), "character.png");
  const encoded = new Request("https://site.example/api/admin/upload", { method: "POST", body: form });
  const body = await encoded.arrayBuffer();
  return new Request(encoded.url, { method: "POST", body, headers: {
    "Content-Type": encoded.headers.get("content-type"),
    "Content-Length": String(body.byteLength),
    "Origin": "https://site.example",
  } });
}

async function frameworkPreparse(request, maximum) {
  return handleProgressiveServerActionRequest({
    request,
    contentType: request.headers.get("content-type"),
    actionId: null,
    allowedOrigins: [],
    maxActionBodySize: maximum,
    hasPageRoute: false,
    readFormDataWithLimit: readActionFormDataWithLimit,
    decodeAction: async () => null,
    clearRequestContext() {},
    getAndClearPendingCookies() { return []; },
    reportRequestError(error) { throw error; },
  });
}

test("Vinext permits CMS multipart uploads through 10 MB before the route's own file limit", async () => {
  // Reproduce the pre-route 413 under the framework default.
  const rejected = await frameworkPreparse(await multipartRequest(2 * 1024 * 1024), parseBodySizeLimit(undefined));
  assert.equal(rejected.status, 413);

  const configuredMaximum = parseBodySizeLimit(config.experimental.serverActions.bodySizeLimit);
  assert.ok(configuredMaximum > MAX_UPLOAD_BYTES + 16384);
  for (const fileBytes of [2 * 1024 * 1024, MAX_UPLOAD_BYTES]) {
    const request = await multipartRequest(fileBytes);
    assert.equal(await frameworkPreparse(request, configuredMaximum), null);
    // The original stream remains available to the CMS handler after Vinext
    // examines its clone. Its stricter streamed body limit remains effective.
    const body = await readLimitedBody(request, MAX_UPLOAD_BYTES + 16384);
    assert.ok(body.byteLength > fileBytes);
  }
  await assert.rejects(readLimitedBody(await multipartRequest(MAX_UPLOAD_BYTES + 16385), MAX_UPLOAD_BYTES + 16384), (error) => error.status === 413);
});
