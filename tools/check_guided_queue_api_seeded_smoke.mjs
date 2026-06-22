import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pnpmRuntime = "/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm";
const pythonRuntime = path.join(repoRoot, ".venv/bin/python");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const screenshotDir = "/private/tmp";

class CdpClient {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new CdpClient(ws);
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) {
        return;
      }
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
        return;
      }
      resolve(message.result ?? {});
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.ws.close();
  }
}

const apiPort = await freePort();
const nextPort = await freePort();
const cdpPort = await freePort();
const tempDir = await mkdtemp(path.join(os.tmpdir(), "mediahub-ui10ax-"));
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const nextBaseUrl = `http://127.0.0.1:${nextPort}`;
const chromeProfile = path.join(tempDir, "chrome-profile");
const sqlitePath = path.join(tempDir, "api.sqlite");
const processes = [];

try {
  await mkdir(chromeProfile, { recursive: true });
  const api = spawnProcess(pythonRuntime, ["tools/api_smoke_server.py", "--host", "127.0.0.1", "--port", String(apiPort)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      APP_ENV: "test",
      CORS_ORIGINS: nextBaseUrl,
      DATABASE_URL: `sqlite+aiosqlite:///${sqlitePath}`,
      SESSION_COOKIE_SECURE: "false",
    },
    label: "api",
  });
  processes.push(api);
  await waitForEndpoint(`${apiBaseUrl}/api/v1/health/live`, 20000);

  const auth = await register(apiBaseUrl);
  const project = await importFoodProject(apiBaseUrl, auth);
  const content = await createContent(apiBaseUrl, auth, project.project.id, project.rubric.id);

  const next = spawnProcess(pnpmRuntime, ["--filter", "@temichev/web", "dev", "--hostname", "127.0.0.1", "--port", String(nextPort)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_DATA_MODE: "api",
    },
    label: "next",
  });
  processes.push(next);
  await waitForEndpoint(`${nextBaseUrl}/app/content/${content.id}`, 30000, { cookie: auth.cookieHeader });

  const chrome = spawnProcess(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${chromeProfile}`,
    `--remote-debugging-port=${cdpPort}`,
    "about:blank",
  ], { cwd: repoRoot, label: "chrome" });
  processes.push(chrome);
  await waitForEndpoint(`http://127.0.0.1:${cdpPort}/json/version`, 15000);

  const version = await fetchJson(`http://127.0.0.1:${cdpPort}/json/version`);
  const browserCdp = await CdpClient.connect(version.webSocketDebuggerUrl);
  const checks = [
    { width: 390, height: 1100, path: `${screenshotDir}/mediahub-ui10ax-api-seeded-390.png` },
    { width: 1440, height: 1100, path: `${screenshotDir}/mediahub-ui10ax-api-seeded-1440.png` },
  ];
  const results = [];
  for (const check of checks) {
    results.push(await runBrowserCheck(browserCdp, {
      auth,
      check,
      contentId: content.id,
      nextBaseUrl,
    }));
  }
  browserCdp.close();
  console.log(JSON.stringify(results, null, 2));
} finally {
  await stopProcesses(processes);
}

async function runBrowserCheck(browserCdp, params) {
  const { targetId } = await browserCdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browserCdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, payload = {}) => browserCdp.send(method, payload, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: params.check.width,
    height: params.check.height,
    deviceScaleFactor: 1,
    mobile: params.check.width < 600,
  });
  for (const cookie of params.auth.cookies) {
    await send("Network.setCookie", {
      domain: "127.0.0.1",
      name: cookie.name,
      path: "/",
      url: params.nextBaseUrl,
      value: cookie.value,
    });
  }
  const contentUrl = `${params.nextBaseUrl}/app/content/${params.contentId}`;
  await send("Page.navigate", { url: contentUrl });
  await waitForExpression(
    send,
    `location.href === ${JSON.stringify(contentUrl)} && document.readyState !== 'loading'`,
    20000,
  );
  const storageKey = `tmh:guided-form-queue:v1:repeatable:${params.contentId}:dishes:new`;
  const queueJob = {
    code: "version_conflict",
    fieldTypes: {
      "field:name": "text",
      "field:observations": "text",
      "field:price": "money",
    },
    metadata: {
      contentId: params.contentId,
      groupKey: "dishes",
      intent: "lock",
      itemVersion: 1,
      kind: "repeatable_group",
      sourceType: "user_text",
    },
    recoveryAction: "refresh",
    requestId: "ui10ax-seeded",
    savedAt: new Date().toISOString(),
    values: {
      "field:name": "Старая уха",
      "field:observations": "Рыбный вкус нормальный.",
      "field:price": "320",
    },
  };
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(queueJob))})`,
  });
  await send("Page.navigate", { url: contentUrl });
  await waitForExpression(
    send,
    `Boolean(document.querySelector('[data-testid="guided-queue-status"][data-guided-queue-status="blocked"][data-guided-queue-kind="repeatable_group"][data-guided-queue-recovery="refresh"]'))`,
    30000,
  );
  await waitForExpression(send, `document.body.innerText.includes('В очереди есть несинхронизированное добавление позиции')`, 10000);
  const inspected = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const blocked = document.querySelector('[data-testid="guided-queue-status"][data-guided-queue-status="blocked"][data-guided-queue-kind="repeatable_group"][data-guided-queue-recovery="refresh"]');
      const refresh = blocked?.querySelector('[data-testid="guided-queue-refresh"]');
      const retry = blocked?.querySelector('[data-testid="guided-queue-retry"]');
      const clear = blocked?.querySelector('[data-testid="guided-queue-clear"]');
      const bodyText = document.body.innerText || '';
      return {
        blockedText: blocked?.innerText || '',
        clientWidth: document.documentElement.clientWidth,
        hasClear: Boolean(clear),
        hasMain: Boolean(document.querySelector('main')),
        hasRefresh: Boolean(refresh),
        hasRetry: Boolean(retry),
        modeTextVisible: bodyText.includes('api'),
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`,
  });
  const value = inspected.result.value;
  assert.equal(value.hasMain, true, `${params.check.width}px main missing`);
  assert.equal(value.hasRefresh, true, `${params.check.width}px refresh button missing`);
  assert.equal(value.hasRetry, false, `${params.check.width}px retry button must be absent for refresh recovery`);
  assert.equal(value.hasClear, true, `${params.check.width}px clear button missing`);
  assert.equal(value.scrollWidth <= value.clientWidth, true, `${params.check.width}px horizontal overflow`);
  assert.match(value.blockedText, /Обновить страницу/);
  assert.match(value.blockedText, /Очистить локальную очередь/);
  assert.match(value.blockedText, /Код: version_conflict/);
  assert.match(value.blockedText, /ID запроса: ui10ax-seeded/);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(params.check.path, Buffer.from(screenshot.data, "base64"));
  await send("Runtime.evaluate", {
    expression: `document.querySelector('[data-testid="guided-queue-status"][data-guided-queue-status="blocked"][data-guided-queue-kind="repeatable_group"][data-guided-queue-recovery="refresh"] [data-testid="guided-queue-clear"]')?.click()`,
  });
  await waitForExpression(
    send,
    `localStorage.getItem(${JSON.stringify(storageKey)}) === null && !document.querySelector('[data-testid="guided-queue-status"][data-guided-queue-status="blocked"][data-guided-queue-kind="repeatable_group"][data-guided-queue-recovery="refresh"]')`,
    10000,
  );
  const clearResult = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const emptyStatuses = Array.from(document.querySelectorAll('[data-testid="guided-queue-status"][data-guided-queue-status="empty"]'));
      return {
        hasBlockedRepeatableRefresh: Boolean(document.querySelector('[data-testid="guided-queue-status"][data-guided-queue-status="blocked"][data-guided-queue-kind="repeatable_group"][data-guided-queue-recovery="refresh"]')),
        hasEmptyRepeatableStatus: emptyStatuses.some((node) => node.getAttribute('data-guided-queue-kind') === 'none' && node.innerText.includes('Очередь автосохранения пуста.')),
        storedJob: localStorage.getItem(${JSON.stringify(storageKey)}),
      };
    })()`,
  });
  assert.equal(clearResult.result.value.storedJob, null, `${params.check.width}px queue job must be removed from localStorage`);
  assert.equal(clearResult.result.value.hasBlockedRepeatableRefresh, false, `${params.check.width}px blocked repeatable queue must disappear after clear`);
  assert.equal(clearResult.result.value.hasEmptyRepeatableStatus, true, `${params.check.width}px empty queue status must be visible after clear`);
  await browserCdp.send("Target.closeTarget", { targetId });
  return {
    width: params.check.width,
    path: params.check.path,
    clientWidth: value.clientWidth,
    clearRemovedStorage: clearResult.result.value.storedJob === null,
    scrollWidth: value.scrollWidth,
    hasRefresh: value.hasRefresh,
    hasRetry: value.hasRetry,
  };
}

async function register(baseUrl) {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    body: JSON.stringify({
      display_name: "UI 10ax Smoke",
      email: `ui10ax-${Date.now()}@example.com`,
      password: "strong-password-123",
      workspace_name: "UI 10ax Workspace",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  const cookies = response.headers.getSetCookie().map(parseSetCookie).filter(Boolean);
  assert(cookies.some((cookie) => cookie.name === "tmh_session"), "tmh_session cookie missing");
  assert(cookies.some((cookie) => cookie.name === "tmh_csrf"), "tmh_csrf cookie missing");
  return {
    cookies,
    cookieHeader: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
    csrfToken: payload.csrf_token,
    workspaceId: payload.workspace.id,
  };
}

async function importFoodProject(baseUrl, auth) {
  const imported = await apiJson(`${baseUrl}/api/v1/workspaces/${auth.workspaceId}/projects/from-preset`, {
    auth,
    body: { preset_key: "chto-poest-armavir" },
    method: "POST",
  });
  const rubrics = await apiJson(`${baseUrl}/api/v1/projects/${imported.project.id}/rubrics`, { auth });
  const rubric = rubrics.rubrics.find((item) => item.slug === "obzor-nedeli");
  assert(rubric, "obzor-nedeli rubric missing");
  return { project: imported.project, rubric };
}

async function createContent(baseUrl, auth, projectId, rubricId) {
  return apiJson(`${baseUrl}/api/v1/projects/${projectId}/content-items`, {
    auth,
    body: { rubric_id: rubricId, title_internal: "UI 10ax API seeded smoke" },
    method: "POST",
  });
}

async function apiJson(url, options = {}) {
  const headers = { Accept: "application/json" };
  if (options.auth) {
    headers.Cookie = options.auth.cookieHeader;
    headers["X-CSRF-Token"] = options.auth.csrfToken;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method: options.method ?? "GET",
  });
  const payload = await response.json();
  assert.equal(response.ok, true, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

function parseSetCookie(header) {
  const [pair] = header.split(";");
  const index = pair.indexOf("=");
  if (index === -1) {
    return null;
  }
  return {
    name: pair.slice(0, index),
    value: pair.slice(index + 1),
  };
}

function spawnProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    if (process.env.UI10AX_VERBOSE) {
      process.stdout.write(`[${options.label}] ${chunk}`);
    }
  });
  child.stderr.on("data", (chunk) => {
    if (process.env.UI10AX_VERBOSE) {
      process.stderr.write(`[${options.label}] ${chunk}`);
    }
  });
  child.once("error", (error) => {
    process.stderr.write(`[${options.label}] failed to start: ${error.message}\n`);
  });
  child.once("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGKILL") {
      process.stderr.write(`[${options.label}] exited with code=${code} signal=${signal}\n`);
    }
  });
  return child;
}

async function stopProcesses(items) {
  await Promise.all(items.reverse().map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }, 3000).unref();
  })));
}

async function waitForEndpoint(url, timeoutMs, options = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: options.cookie ? { Cookie: options.cookie } : undefined,
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Service is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForExpression(send, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.result.value === true) {
      return;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `${url} returned ${response.status}`);
  return response.json();
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
