import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.CONTENT_VISUAL_BASE_URL ?? "http://127.0.0.1:3207";
const cdpPort = process.env.CONTENT_VISUAL_CDP_PORT ? Number(process.env.CONTENT_VISUAL_CDP_PORT) : await freePort();
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

const chromeProfile = await mkdtemp(path.join(os.tmpdir(), "mediahub-content-visual-"));
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

  for (const width of [390, 1440]) {
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
  const url = `${baseUrl}/app/content/demo-review`;

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
  await waitForExpression(send, `Boolean(document.querySelector('[data-testid="guided-queue-status"]'))`, 20000);
  await waitForExpression(send, `Boolean(document.querySelector('[data-testid="material-wizard"]'))`, 20000);

  const inspected = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const isVisible = (node) => Boolean(node && node.getClientRects().length);
      const text = document.body.innerText;
      const queueStatuses = Array.from(document.querySelectorAll('[data-testid="guided-queue-status"]'));
      const visibleTelegramButtons = Array.from(document.querySelectorAll('button'))
        .filter((button) => button.innerText.trim() === 'Опубликовать в тестовый Telegram' && isVisible(button));
      const visibleDetails = Array.from(document.querySelectorAll('details')).filter(isVisible);
      const materialSteps = Array.from(document.querySelectorAll('[data-testid="material-wizard-step"]'))
        .filter(isVisible)
        .map((node) => node.innerText);
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
      return {
        clientWidth: document.documentElement.clientWidth,
        detailsOpenCount: visibleDetails.filter((details) => details.open).length,
        hasDisabledButton: Array.from(document.querySelectorAll('button')).some((button) => button.disabled),
        hasGuidedField: Boolean(document.querySelector('form [name="fieldKey"]')),
        hasMain: Boolean(document.querySelector('main')),
        hasMaterialWizard: text.includes('Мастер материала'),
        hasPlatformPreviews: text.includes('Превью площадок'),
        hasPreflightHook: queueStatuses.some((node) => node.hasAttribute('data-guided-queue-preflight')),
        hasQueueStatus: queueStatuses.length > 0,
        hasRepeatableGroup: Boolean(document.querySelector('form [name="groupKey"]')),
        hasRetryShellHook: queueStatuses.some((node) => node.hasAttribute('data-guided-queue-retry-shell')),
        hasTemplateName: text.includes('Шаблон: Обзор места'),
        hasTechnicalStudio: text.includes('Фактическая форма рубрики') && text.includes('Факт-локи') && text.includes('Проверки'),
        legacyCopyPresent: ['Голосовой пилот', 'Мастер и Telegram', 'Мобильный путь теста', 'Обучение на телефоне']
          .some((value) => text.includes(value)),
        materialStepCount: materialSteps.length,
        missingMaterialSteps: requiredSteps.filter((step) => !materialSteps.some((textValue) => textValue.includes(step))),
        scrollWidth: document.documentElement.scrollWidth,
        telegramButtonsInsideOutput: visibleTelegramButtons.length > 0 &&
          visibleTelegramButtons.every((button) => Boolean(button.closest('[data-testid="telegram-output-block"]'))),
        visibleDetailsCount: visibleDetails.length,
        wizardBeforeCapture: text.indexOf('Мастер материала') !== -1 &&
          text.indexOf('Сбор материала') !== -1 &&
          text.indexOf('Мастер материала') < text.indexOf('Сбор материала'),
      };
    })()`,
  });

  const value = inspected.result.value;
  assert.equal(value.hasMain, true, `${check.width}px main missing`);
  assert.equal(value.hasMaterialWizard, true, `${check.width}px material wizard missing`);
  assert.equal(value.hasTemplateName, true, `${check.width}px template name missing`);
  assert.equal(value.legacyCopyPresent, false, `${check.width}px legacy pilot copy still visible`);
  assert.equal(value.materialStepCount, 8, `${check.width}px material wizard must show eight visible steps`);
  assert.deepEqual(value.missingMaterialSteps, [], `${check.width}px material wizard missing steps`);
  assert.equal(value.telegramButtonsInsideOutput, true, `${check.width}px Telegram publish button must stay inside output block`);
  assert.equal(value.hasGuidedField, true, `${check.width}px guided field form missing`);
  assert.equal(value.hasRepeatableGroup, true, `${check.width}px repeatable group form missing`);
  assert.equal(value.hasQueueStatus, true, `${check.width}px queue status slot missing`);
  assert.equal(value.hasPreflightHook, true, `${check.width}px preflight hook missing`);
  assert.equal(value.hasRetryShellHook, true, `${check.width}px retry shell hook missing`);
  assert.equal(value.hasDisabledButton, true, `${check.width}px fixture mutation buttons must be disabled`);
  assert.equal(value.scrollWidth <= value.clientWidth, true, `${check.width}px horizontal overflow`);
  if (check.width < 600) {
    assert.equal(value.wizardBeforeCapture, true, `${check.width}px wizard must come before capture panel`);
    assert.equal(value.visibleDetailsCount >= 3, true, `${check.width}px mobile details sections missing`);
    assert.equal(value.detailsOpenCount, 0, `${check.width}px mobile details must start collapsed`);
  } else {
    assert.equal(value.hasTechnicalStudio, true, `${check.width}px desktop technical studio missing`);
    assert.equal(value.hasPlatformPreviews, true, `${check.width}px desktop platform previews missing`);
  }

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = `/private/tmp/mediahub-ui10bc-content-${check.width}.png`;
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
      // Keep polling until the server is ready.
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
