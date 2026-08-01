import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.NEW_CONTENT_VISUAL_BASE_URL ?? "http://127.0.0.1:3207";
const cdpPort = process.env.NEW_CONTENT_VISUAL_CDP_PORT ? Number(process.env.NEW_CONTENT_VISUAL_CDP_PORT) : await freePort();
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

const chromeProfile = await mkdtemp(path.join(os.tmpdir(), "mediahub-new-content-visual-"));
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
  const url = `${baseUrl}/app/content/new`;

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
  await waitForExpression(send, `Boolean(document.querySelector('[data-testid="new-content-composer"]'))`, 20000);
  await new Promise((resolve) => setTimeout(resolve, 750));

  const inspected = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const isVisible = (node) => Boolean(node && node.getClientRects().length);
      const text = document.body.innerText;
      const composer = document.querySelector('[data-testid="new-content-composer"]');
      const projectSelector = document.querySelector('[data-testid="new-content-project-selector"]');
      const rubricSelector = document.querySelector('[data-testid="new-content-rubric-selector"]');
      const entryActions = document.querySelector('[data-testid="new-content-entry-actions"]');
      const platformPreview = document.querySelector('[data-testid="new-content-platform-preview"]');
      const nextWorkspace = document.querySelector('[data-testid="new-content-next-workspace"]');
      const wizard = document.querySelector('[data-testid="material-wizard"]');
      const buttons = Array.from(document.querySelectorAll('button'));
      const createButtons = buttons.filter((button) => button.innerText.includes('Создать материал'));
      const startButtons = buttons.filter((button) => button.innerText.includes('Начать сбор'));
      const requiredSteps = [
        'Место и адрес',
        'Медиа',
        'Атмосфера',
        'Блюда',
        'Итог',
        'ИИ-блоки',
        'Версии платформ',
        'Публикация',
      ];
      const wizardText = wizard?.textContent ?? '';
      return {
        clientWidth: document.documentElement.clientWidth,
        createButtonVisible: createButtons.some(isVisible),
        hasComposer: isVisible(composer),
        hasEntryActions: Boolean(entryActions?.textContent?.includes('Надиктовать')) &&
          Boolean(entryActions?.textContent?.includes('Вставить текст')) &&
          Boolean(entryActions?.textContent?.includes('Добавить медиа')),
        hasManualConfirmation: text.includes('Публикация не начнётся без ручного подтверждения') ||
          text.includes('Отправка возможна только после просмотра версии и явного подтверждения'),
        hasNextWorkspace: Boolean(nextWorkspace?.textContent?.includes('Сбор материала')) &&
          Boolean(nextWorkspace?.textContent?.includes('диктовка, текст и медиа')),
        hasPlatformPreview: Boolean(platformPreview?.textContent?.includes('Telegram')) &&
          Boolean(platformPreview?.textContent?.includes('MAX')) &&
          Boolean(platformPreview?.textContent?.includes('Instagram')),
        hasProjectSelector: isVisible(projectSelector),
        hasRubricSelector: isVisible(rubricSelector) &&
          Boolean(rubricSelector?.textContent?.includes('Шаблон материала')),
        hasStartButton: startButtons.some(isVisible),
        hasTemplateName: wizardText.includes('Шаблон: Обзор места'),
        missingSteps: requiredSteps.filter((step) => !wizardText.includes(step)),
        oldPreflightCopyPresent: [
          'Подсказки',
          'Здесь запись не идёт',
          'не запись',
          'Что уже подключено в пилоте',
          'старт пилота',
          'пилотного черновика',
          'Создать черновик',
          'Последний блок',
          'API-режим',
        ].some((value) => text.includes(value)),
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`,
  });

  const value = inspected.result.value;
  assert.equal(value.hasComposer, true, `${check.width}px create composer missing`);
  assert.equal(value.hasProjectSelector, true, `${check.width}px project selector missing`);
  assert.equal(value.hasRubricSelector, true, `${check.width}px rubric selector missing`);
  assert.equal(value.createButtonVisible, true, `${check.width}px create material action missing`);
  assert.equal(value.hasEntryActions, true, `${check.width}px entry actions missing`);
  assert.equal(value.hasTemplateName, true, `${check.width}px template name missing`);
  assert.deepEqual(value.missingSteps, [], `${check.width}px material wizard missing steps`);
  assert.equal(value.hasPlatformPreview, true, `${check.width}px platform preview cards missing`);
  assert.equal(value.hasManualConfirmation, true, `${check.width}px manual publication confirmation missing`);
  assert.equal(value.hasNextWorkspace, true, `${check.width}px next workspace missing`);
  assert.equal(value.hasStartButton, true, `${check.width}px start collection button missing`);
  assert.equal(value.oldPreflightCopyPresent, false, `${check.width}px old preflight copy still present`);
  assert.equal(value.scrollWidth <= value.clientWidth, true, `${check.width}px horizontal overflow`);

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = `/private/tmp/mediahub-ui11n-new-content-${check.width}.png`;
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
