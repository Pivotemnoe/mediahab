import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.PREMIUM_APP_FLOW_VISUAL_BASE_URL ?? "http://127.0.0.1:3207";
const cdpPort = process.env.PREMIUM_APP_FLOW_VISUAL_CDP_PORT
  ? Number(process.env.PREMIUM_APP_FLOW_VISUAL_CDP_PORT)
  : await freePort();
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const routeChecks = [
  {
    name: "app-home",
    path: "/app",
    required: ["Что создаём?", "Надиктовать материал", "Вставить текст", "Проверка перед отправкой"],
    absent: ["API-режим", "backend", "Техническая сборка", "Дашборд", "UI"],
    testId: "quick-create-open",
    palette: true,
  },
  {
    name: "app-dashboard",
    path: "/app/dashboard",
    required: ["Что создаём?", "Надиктовать материал", "Продолжить работу"],
    absent: ["API-режим", "backend", "Техническая сборка", "Дашборд", "UI"],
    testId: "quick-create-open",
  },
  {
    name: "new-content",
    path: "/app/content/new",
    required: ["Создать материал", "Собрать текст", "Блоки", "Атмосфера", "Live preview", "Telegram", "MAX", "Instagram"],
    absent: [
      "Создать материал без технического шума",
      "Первый рабочий шаг после создания",
      "Подсказки",
      "Здесь запись не идёт",
      "Что уже подключено в пилоте",
      "API-режим",
      "Дашборд",
    ],
    testId: "new-content-composer",
  },
  {
    name: "content-composer",
    path: "/app/content/demo-lunch",
    required: ["Выберите блок", "Атмосфера", "Проверка перед публикацией", "Расширенный режим"],
    absent: ["Контент-студия", "Этап UI 05", "API-режим", "backend", "Дашборд"],
    testId: "content-composer",
  },
  {
    name: "publications",
    path: "/app/publications",
    required: ["Проверка и отправка материалов", "Версии площадок", "Публикация не уйдёт сама", "Расширенный режим"],
    absent: ["Техническая сборка", "Публикационный контур", "Этап UI 07", "API-режим", "backend", "Дашборд"],
    testId: "publication-review",
  },
  {
    name: "project-builder",
    path: "/app/projects/chto-poest-armavir/builder",
    required: ["Конструктор проекта", "advanced", "Создать материал", "Предпросмотр изменений"],
    absent: ["API-режим", "backend", "Дашборд"],
    testId: "quick-create-open",
  },
];

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

const chromeProfile = await mkdtemp(path.join(os.tmpdir(), "mediahub-premium-flow-"));
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
    for (const route of routeChecks) {
      checks.push(await runRouteCheck(browser, route, width));
    }
  }

  browser.close();
  console.log(JSON.stringify(checks, null, 2));
} finally {
  chrome.kill("SIGTERM");
}

async function runRouteCheck(browser, route, width) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, payload = {}) => browser.send(method, payload, sessionId);
  const url = `${baseUrl}${route.path}`;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await send("Page.navigate", { url });
  await waitForExpression(send, `location.href === ${JSON.stringify(url)} && document.readyState !== 'loading'`, 20000);
  await waitForExpression(send, `Boolean(document.querySelector(${JSON.stringify(`[data-testid="${route.testId}"]`)}))`, 20000);
  await new Promise((resolve) => setTimeout(resolve, 750));

  if (route.palette) {
    await send("Runtime.evaluate", {
      expression: `document.querySelector('[data-testid="quick-create-open"]')?.click()`,
      returnByValue: true,
    });
    await waitForExpression(send, `Boolean(document.querySelector('[data-testid="quick-create-palette"]'))`, 5000);
  }

  const inspected = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const visibleText = document.body.innerText;
      return {
        clientWidth: document.documentElement.clientWidth,
        hasOldSidebar: Boolean(document.querySelector('aside')),
        hasVoiceBottomSheet: ${JSON.stringify(route.name)} === 'content-composer'
          ? Boolean(document.querySelector('[data-testid="voice-bottom-sheet"]'))
          : true,
        missing: ${JSON.stringify(route.required)}.filter((value) => !visibleText.includes(value)),
        forbidden: ${JSON.stringify(route.absent)}.filter((value) => visibleText.includes(value)),
        paletteVisible: Boolean(document.querySelector('[data-testid="quick-create-palette"]')),
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`,
  });

  const value = inspected.result.value;
  assert.deepEqual(value.missing, [], `${route.name} ${width}px missing required text`);
  assert.deepEqual(value.forbidden, [], `${route.name} ${width}px contains old technical text`);
  assert.equal(value.hasOldSidebar, false, `${route.name} ${width}px still renders old sidebar`);
  assert.equal(value.hasVoiceBottomSheet, true, `${route.name} ${width}px voice bottom sheet missing`);
  assert.equal(value.scrollWidth <= value.clientWidth, true, `${route.name} ${width}px horizontal overflow`);
  if (route.palette) {
    assert.equal(value.paletteVisible, true, `${route.name} ${width}px command palette did not open`);
  }

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = `/private/tmp/mediahub-ui11p-${route.name}-${width}.png`;
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await browser.send("Target.closeTarget", { targetId });

  return {
    route: route.name,
    width,
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
