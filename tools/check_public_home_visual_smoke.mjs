import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.PUBLIC_HOME_VISUAL_BASE_URL ?? "http://127.0.0.1:3207";
const cdpPort = process.env.PUBLIC_HOME_VISUAL_CDP_PORT ? Number(process.env.PUBLIC_HOME_VISUAL_CDP_PORT) : await freePort();
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

const chromeProfile = await mkdtemp(path.join(os.tmpdir(), "mediahub-public-home-visual-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--user-data-dir=${chromeProfile}`,
  `--remote-debugging-port=${cdpPort}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

try {
  await waitForEndpoint(`http://127.0.0.1:${cdpPort}/json/version`, 15000);
  const version = await fetchJson(`http://127.0.0.1:${cdpPort}/json/version`);
  const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
  const checks = [];

  for (const width of [390, 768, 1440, 1920]) {
    checks.push(await runCheck(browser, { width }));
  }

  browser.close();
  console.log(JSON.stringify(checks, null, 2));
} finally {
  chrome.kill("SIGTERM");
}

async function runCheck(browser, check) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, payload = {}) => browser.send(method, payload, sessionId);
  const url = `${baseUrl}/`;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: check.width,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: check.width < 600,
  });
  await send("Page.navigate", { url });
  await waitForExpression(send, `location.href === ${JSON.stringify(url)} && document.readyState !== 'loading'`, 20000);
  await waitForExpression(send, `Boolean(document.querySelector('[data-testid="public-home-hero"]'))`, 20000);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const inspected = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText;
      const hero = document.querySelector('[data-testid="public-home-hero"]');
      const workflow = document.querySelector('[data-testid="public-home-workflow"]');
      const entry = document.querySelector('[data-testid="public-home-entry"]');
      const links = Array.from(document.querySelectorAll('a')).map((link) => ({
        href: link.getAttribute('href') ?? '',
        text: link.innerText.trim(),
        visible: Boolean(link.getClientRects().length),
      }));
      const visibleLinks = links.filter((link) => link.visible);
      const hasLink = (href, label) => visibleLinks.some((link) => link.href === href && link.text.includes(label));
      return {
        clientWidth: document.documentElement.clientWidth,
        firstWorkflowTop: workflow ? workflow.getBoundingClientRect().top : null,
        hasCreateMaterialLink: hasLink('/app/content/new', 'Создать материал') || hasLink('/app/content/new', 'Открыть мастер'),
        hasEntrySection: Boolean(entry?.textContent?.includes('Вход в работу')),
        hasHero: Boolean(hero?.textContent?.includes('Temichev Media Hub')),
        hasManualConfirmation: text.includes('Публикация остаётся решением человека') &&
          text.includes('ручного подтверждения'),
        hasRegisterLink: hasLink('/register', 'Создать кабинет'),
        hasWorkflow: Boolean(workflow?.textContent?.includes('Мастер материала')) &&
          Boolean(workflow?.textContent?.includes('ИИ-сборка и версии')) &&
          Boolean(workflow?.textContent?.includes('Проверка и публикация')),
        oldHomeCopyPresent: [
          'MediaHub для обзоров и публикаций',
          'Контент-студия для локального медиа',
          'donika-telegram.jpeg',
        ].some((value) => text.includes(value) || document.documentElement.innerHTML.includes(value)),
        presetCopyPresent: ['Что поесть', 'Армавир', 'У Доника'].some((value) => text.includes(value)),
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`,
  });

  const value = inspected.result.value;
  assert.equal(value.hasHero, true, `${check.width}px hero missing`);
  assert.equal(value.hasCreateMaterialLink, true, `${check.width}px create material entry missing`);
  assert.equal(value.hasRegisterLink, true, `${check.width}px register entry missing`);
  assert.equal(value.hasWorkflow, true, `${check.width}px workflow missing`);
  assert.equal(value.hasEntrySection, true, `${check.width}px entry section missing`);
  assert.equal(value.hasManualConfirmation, true, `${check.width}px manual confirmation copy missing`);
  assert.equal(value.oldHomeCopyPresent, false, `${check.width}px old homepage copy still present`);
  assert.equal(value.presetCopyPresent, false, `${check.width}px preset-specific copy leaked to public home`);
  assert.equal(value.scrollWidth <= value.clientWidth, true, `${check.width}px horizontal overflow`);
  assert.equal(value.firstWorkflowTop < 1100, true, `${check.width}px next section hint is not visible`);

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = `/private/tmp/mediahub-ui11m-home-${check.width}.png`;
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await browser.send("Target.closeTarget", { targetId });

  return {
    width: check.width,
    path: screenshotPath,
    ...value,
  };
}

async function waitForEndpoint(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the browser debugging endpoint is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForExpression(send, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    lastValue = result.result?.value ?? null;
    if (lastValue) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `${url} returned ${response.status}`);
  return response.json();
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object", "free port address missing");
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}
