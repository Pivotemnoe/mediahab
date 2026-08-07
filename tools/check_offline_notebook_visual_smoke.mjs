import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

let baseUrl = process.env.OFFLINE_NOTEBOOK_BASE_URL ?? "http://127.0.0.1:3212";
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  const managedServer = process.env.OFFLINE_NOTEBOOK_MANAGED_SERVER === "1" ? await createManagedServer() : null;
  if (managedServer) {
    await managedServer.start();
    baseUrl = managedServer.baseUrl;
  }
  const cdpPort = await freePort();
  const profile = await mkdtemp(path.join(os.tmpdir(), "nagovori-offline-notebook-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${cdpPort}`,
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    await waitForEndpoint(`http://127.0.0.1:${cdpPort}/json/version`, 15_000);
    const version = await fetchJson(`http://127.0.0.1:${cdpPort}/json/version`);
    const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
    const widths = (process.env.OFFLINE_NOTEBOOK_WIDTHS ?? "390,1440")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    const checks = [];
    for (const width of widths) checks.push(await runCheck(browser, width, managedServer));
    browser.close();
    console.log(JSON.stringify(checks, null, 2));
  } finally {
    chrome.kill("SIGTERM");
    if (managedServer) await managedServer.stop();
  }
}

async function runCheck(browser, width, managedServer) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params = {}) => browser.send(method, params, sessionId);
  const workspaceId = width === 390
    ? "00000000-0000-4000-8000-000000000390"
    : "00000000-0000-4000-8000-000000001440";

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: false });
  await send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: width === 390 ? 844 : 1000,
    mobile: width === 390,
    width,
  });
  await send("Page.navigate", { url: `${baseUrl}/offline-notebook.html` });
  await waitForExpression(send, `document.readyState !== "loading" && Boolean(document.querySelector("#note"))`, 20_000);
  await evaluate(send, `localStorage.setItem("nagovori:offline-workspace-id", ${JSON.stringify(workspaceId)})`);
  await send("Page.reload", { ignoreCache: true });
  await waitForExpression(send, `document.readyState !== "loading" && Boolean(document.querySelector("#note"))`, 20_000);
  await evaluate(send, `navigator.serviceWorker.ready.then(() => true)`, true);
  await send("Page.reload", { ignoreCache: false });
  await waitForExpression(send, `Boolean(navigator.serviceWorker.controller) && Boolean(document.querySelector("#save"))`, 20_000);

  await evaluate(send, `(() => {
    const input = document.querySelector("#note");
    input.value = "Офлайн-мысль ${width}";
    input.dispatchEvent(new Event("input", { bubbles:true }));
    document.querySelector("#save").click();
  })()`);
  await waitForExpression(send, `document.querySelector("#count")?.textContent === "1"`, 10_000);

  if (width === 390) {
    await evaluate(send, `document.querySelector("#record").click()`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await evaluate(send, `document.querySelector("#record").click()`);
    await waitForExpression(send, `document.querySelector("#count")?.textContent === "2"`, 15_000);
  }

  const inspected = await evaluate(send, `(() => ({
    bodyText: document.body.innerText,
    clientWidth: document.documentElement.clientWidth,
    count: Number(document.querySelector("#count")?.textContent || 0),
    hasBrand: ["Наговори", "Твои мысли.", "Твой стиль.", "Твои публикации."].every(value => document.body.innerText.includes(value)),
    hasVoiceButton: document.querySelector("#record")?.textContent.includes("Надиктовать"),
    scrollWidth: document.documentElement.scrollWidth,
  }))()`);
  assert.equal(inspected.hasBrand, true, `${width}px brand missing: ${inspected.bodyText}`);
  assert.equal(inspected.hasVoiceButton, true, `${width}px voice action missing`);
  assert.equal(inspected.scrollWidth <= inspected.clientWidth, true, `${width}px horizontal overflow`);
  assert.equal(inspected.count, width === 390 ? 2 : 1, `${width}px local queue mismatch`);

  const audioCheck = await evaluate(send, `new Promise((resolve, reject) => {
    const request = indexedDB.open("nagovori-offline-v1", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const rows = db.transaction("notebookQueue", "readonly").objectStore("notebookQueue").getAll();
      rows.onerror = () => reject(rows.error);
      rows.onsuccess = () => resolve(rows.result.filter(row => row.workspaceId === ${JSON.stringify(workspaceId)}).map(row => ({ id:row.id, audioSize:row.audioBlob?.size || 0 })));
    };
  })`, true);
  if (width === 390) assert.equal(audioCheck.some((row) => row.audioSize > 0), true, "recorded Blob was not persisted");

  const onlineScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const onlinePath = `/private/tmp/nagovori-offline-shell-${width}.png`;
  await writeFile(onlinePath, Buffer.from(onlineScreenshot.data, "base64"));

  const serviceWorkerReady = await evaluate(send, `Promise.all([
    Promise.resolve(Boolean(navigator.serviceWorker.controller)),
    caches.match("/offline-notebook.html").then(response => Boolean(response)),
  ])`, true);
  assert.deepEqual(serviceWorkerReady, [true, true], `${width}px offline shell was not cached`);

  if (managedServer) {
    await managedServer.stop();
  } else {
    await send("Network.emulateNetworkConditions", {
      connectionType: "none",
      downloadThroughput: 0,
      latency: 0,
      offline: true,
      uploadThroughput: 0,
    });
  }
  await send("Page.navigate", { url: `${baseUrl}/app/notebook?offline-smoke=${width}` });
  await waitForExpression(send, `document.body?.innerText.includes("Мысль не потеряется.")`, 20_000);
  await waitForExpression(send, `document.querySelector("#count")?.textContent === ${JSON.stringify(width === 390 ? "2" : "1")}`, 10_000);
  const fallback = await evaluate(send, `({
    count: document.querySelector("#count")?.textContent,
    hasOfflineEditor: Boolean(document.querySelector("#note")),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  })`);
  assert.equal(fallback.hasOfflineEditor, true, `${width}px service worker fallback missing`);
  assert.equal(Number(fallback.count), width === 390 ? 2 : 1, `${width}px fallback did not retain queue`);
  assert.equal(fallback.scrollWidth <= fallback.clientWidth, true, `${width}px fallback overflow`);
  const fallbackScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const fallbackPath = `/private/tmp/nagovori-offline-fallback-${width}.png`;
  await writeFile(fallbackPath, Buffer.from(fallbackScreenshot.data, "base64"));

  if (managedServer) {
    await managedServer.start();
  } else {
    await send("Network.emulateNetworkConditions", {
      connectionType: "wifi",
      downloadThroughput: -1,
      latency: 0,
      offline: false,
      uploadThroughput: -1,
    });
  }
  await browser.send("Target.closeTarget", { targetId });
  return { width, onlinePath, fallbackPath, ...inspected, audioEntries: audioCheck };
}

async function evaluate(send, expression, awaitPromise = false) {
  const response = await send("Runtime.evaluate", { awaitPromise, expression, returnByValue: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result?.value;
}

async function waitForExpression(send, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(send, expression)) return;
    } catch {
      // A navigation can replace the execution context while polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

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
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result ?? {});
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  close() { this.ws.close(); }
}

async function waitForEndpoint(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

async function createManagedServer() {
  const port = await freePort();
  let processHandle = null;
  const server = {
    baseUrl: `http://127.0.0.1:${port}`,
    async start() {
      if (processHandle) return;
      processHandle = spawn("./node_modules/.bin/next", ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd: new URL("../apps/web/", import.meta.url),
        stdio: ["ignore", "pipe", "pipe"],
      });
      await waitForEndpoint(`${server.baseUrl}/offline-notebook.html`, 20_000);
    },
    async stop() {
      if (!processHandle) return;
      const current = processHandle;
      processHandle = null;
      current.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => current.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
    },
  };
  return server;
}

await main();
