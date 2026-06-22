import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const moduleScope = await loadServiceModule("guided-queue-diagnostics.ts", {
  require(specifier) {
    if (specifier === "@/services/guided-queue-store") {
      return {};
    }
    throw new Error(`Unexpected require: ${specifier}`);
  },
});

const { formatGuidedQueueDiagnostic } = moduleScope;

assert.equal(typeof formatGuidedQueueDiagnostic, "function");
assert.equal(formatGuidedQueueDiagnostic(summary({ jobCount: 0 })), null);
assert.equal(
  formatGuidedQueueDiagnostic(summary({
    fieldJobCount: 1,
    jobCount: 1,
    retryableJobCount: 1,
  })),
  "Состав очереди: 1 поле; 1 можно повторить.",
);
assert.equal(
  formatGuidedQueueDiagnostic(summary({
    fieldJobCount: 2,
    jobCount: 5,
    repeatableGroupJobCount: 1,
    retryableJobCount: 4,
    unknownJobCount: 2,
  })),
  "Состав очереди: 2 поля, 1 группа полей, 2 неопознанных изменения; 4 можно повторить.",
);
assert.equal(
  formatGuidedQueueDiagnostic(summary({
    blockedJobCount: 1,
    fieldJobCount: 5,
    jobCount: 11,
    repeatableGroupJobCount: 5,
    unknownJobCount: 1,
  })),
  "Состав очереди: 5 полей, 5 групп полей, 1 неопознанное изменение; 1 требует обновления.",
);
assert.equal(
  formatGuidedQueueDiagnostic(summary({
    blockedJobCount: 2,
    jobCount: 2,
    unknownJobCount: 2,
  })),
  "Состав очереди: 2 неопознанных изменения; 2 требуют обновления.",
);
assert.equal(
  formatGuidedQueueDiagnostic(summary({
    blockedJobCount: 5,
    jobCount: 15,
    repeatableGroupJobCount: 15,
    retryableJobCount: 10,
  })),
  "Состав очереди: 15 групп полей; 10 можно повторить, 5 требуют обновления.",
);

const diagnostic = formatGuidedQueueDiagnostic(summary({
  blockedJobCount: 1,
  fieldJobCount: 1,
  jobCount: 4,
  repeatableGroupJobCount: 1,
  retryableJobCount: 2,
  unknownJobCount: 2,
}));
for (const privateValue of ["Черновик", "secret", "legacy", "unclassified"]) {
  assert.equal(
    diagnostic.includes(privateValue),
    false,
    `queue diagnostic must not expose queued value: ${privateValue}`,
  );
}

console.log("guided queue diagnostic checks passed");

function summary(overrides) {
  return {
    blockedJobCount: 0,
    fieldJobCount: 0,
    jobCount: 0,
    repeatableGroupJobCount: 0,
    retryableJobCount: 0,
    unknownJobCount: 0,
    ...overrides,
  };
}

async function loadServiceModule(fileName, overrides = {}) {
  const sourcePath = new URL(`../apps/web/src/services/${fileName}`, import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const transpiled = typescript.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName,
  });

  const moduleScope = {
    exports: {},
    module: { exports: {} },
    ...overrides,
  };
  moduleScope.exports = moduleScope.module.exports;

  new Script(transpiled.outputText, { filename: fileName.replace(/\.ts$/, ".cjs") }).runInNewContext(moduleScope);
  return moduleScope.module.exports;
}
