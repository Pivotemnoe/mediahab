import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const sourcePath = new URL("../apps/web/src/services/runtime.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
  fileName: "runtime.ts",
});

const moduleScope = {
  exports: {},
  Headers,
  module: { exports: {} },
  process: { env: {} },
  Response,
};
moduleScope.exports = moduleScope.module.exports;

new Script(transpiled.outputText, { filename: "runtime.cjs" }).runInNewContext(moduleScope);

const { ApiRequestError, createApiRequestHeaders } = moduleScope.module.exports;

assert.equal(typeof createApiRequestHeaders, "function");

const mutationHeaders = createApiRequestHeaders({
  body: { value: { text: "Старый город" } },
  cookieHeader: "tmh_session=session-token; tmh_csrf=csrf-token",
  csrfToken: "csrf-token",
  path: "/api/v1/content-items/item-id/blocks/venue_name",
});
assert.equal(mutationHeaders.get("Accept"), "application/json");
assert.equal(mutationHeaders.get("Content-Type"), "application/json");
assert.equal(mutationHeaders.get("Cookie"), "tmh_session=session-token; tmh_csrf=csrf-token");
assert.equal(mutationHeaders.get("X-CSRF-Token"), "csrf-token");

const customCsrfHeaders = createApiRequestHeaders({
  body: { title_internal: "Обзор" },
  cookieHeader: "tmh_session=session-token; custom_csrf=custom-token",
  csrfHeaderName: "X-Custom-CSRF",
  csrfToken: "custom-token",
  path: "/api/v1/content-items/item-id",
});
assert.equal(customCsrfHeaders.get("X-Custom-CSRF"), "custom-token");
assert.equal(customCsrfHeaders.get("X-CSRF-Token"), null);

const noCsrfHeaders = createApiRequestHeaders({
  body: { event: "readiness" },
  cookieHeader: "tmh_session=session-token",
  path: "/api/v1/non-csrf-endpoint",
  requireCsrf: false,
});
assert.equal(noCsrfHeaders.get("Cookie"), "tmh_session=session-token");
assert.equal(noCsrfHeaders.get("X-CSRF-Token"), null);

assert.throws(
  () => createApiRequestHeaders({
    body: { value: { text: "Нет CSRF" } },
    cookieHeader: "tmh_session=session-token",
    path: "/api/v1/content-items/item-id/blocks/venue_name",
  }),
  (error) => {
    assert.equal(error instanceof ApiRequestError, true);
    assert.equal(error.status, 403);
    assert.equal(error.code, "csrf_required");
    assert.equal(error.path, "/api/v1/content-items/item-id/blocks/venue_name");
    return true;
  },
);

const emptyBodyHeaders = createApiRequestHeaders({
  cookieHeader: "tmh_session=session-token; tmh_csrf=csrf-token",
  csrfToken: "csrf-token",
  path: "/api/v1/content-items/item-id",
});
assert.equal(emptyBodyHeaders.get("Content-Type"), null);
assert.equal(emptyBodyHeaders.get("X-CSRF-Token"), "csrf-token");

console.log("api request header contract checks passed");
