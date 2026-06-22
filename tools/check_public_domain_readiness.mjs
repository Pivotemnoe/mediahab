import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const redirectStatuses = new Set([301, 302, 307, 308]);

function usage() {
  console.log(`Usage:
  node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru [--allow-https-failure] [--resolve-ip 89.169.46.92]

Checks:
  - HTTP endpoint answers and redirects to HTTPS.
  - HTTPS endpoint answers without a TLS error.

Options:
  --domain <host>          Domain to check. Do not include a scheme.
  --allow-https-failure    Exit 0 while reporting HTTPS as blocked.
  --resolve-ip <ip>        Pass curl --resolve for flaky local DNS diagnostics.
  --help                   Show this help.`);
}

function parseArgs(argv) {
  const args = {
    allowHttpsFailure: false,
    domain: null,
    help: false,
    resolveIp: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--help" || item === "-h") {
      args.help = true;
      continue;
    }
    if (item === "--allow-https-failure") {
      args.allowHttpsFailure = true;
      continue;
    }
    if (item === "--domain") {
      args.domain = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (item === "--resolve-ip") {
      args.resolveIp = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${item}`);
  }

  return args;
}

function normalizeIp(value) {
  if (value === null) {
    return null;
  }
  if (!/^[0-9a-fA-F:.]+$/.test(value)) {
    throw new Error(`Invalid --resolve-ip value: ${value}`);
  }
  return value;
}

function normalizeDomain(value) {
  if (!value || typeof value !== "string") {
    throw new Error("--domain is required");
  }
  const trimmed = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed || !/^[a-zA-Z0-9.-]+$/.test(trimmed) || trimmed.includes("..")) {
    throw new Error(`Invalid domain: ${value}`);
  }
  return trimmed;
}

function parseHeaders(stdout) {
  const headerBlocks = stdout.trim().split(/\r?\n\r?\n/).filter(Boolean);
  const block = headerBlocks.at(-1) ?? "";
  const lines = block.split(/\r?\n/);
  const statusLine = lines.shift() ?? "";
  const statusMatch = statusLine.match(/^HTTP\/\S+\s+(\d+)/);
  const headers = {};
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return {
    headers,
    raw: block,
    status: statusMatch ? Number(statusMatch[1]) : null,
  };
}

async function head(url, domain, resolveIp) {
  const curlArgs = ["-sSI", "--max-time", "10"];
  if (resolveIp) {
    const port = url.startsWith("https:") ? "443" : "80";
    curlArgs.push("--resolve", `${domain}:${port}:${resolveIp}`);
  }
  curlArgs.push(url);
  try {
    const { stdout } = await execFileAsync("curl", curlArgs, {
      maxBuffer: 1024 * 1024,
    });
    const parsed = parseHeaders(stdout);
    return {
      headers: parsed.headers,
      ok: Boolean(parsed.status),
      status: parsed.status,
      url,
    };
  } catch (error) {
    return {
      code: typeof error.code === "number" ? `curl_exit_${error.code}` : error.code ?? "curl_error",
      message: [error.message, error.stderr].filter(Boolean).join("\n"),
      ok: false,
      url,
    };
  }
}

function httpRedirectsToHttps(result, domain) {
  if (!result.ok || !redirectStatuses.has(result.status)) {
    return false;
  }
  const location = result.headers.location;
  if (typeof location !== "string") {
    return false;
  }
  return location === `https://${domain}/` || location.startsWith(`https://${domain}/`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const domain = normalizeDomain(args.domain);
const resolveIp = normalizeIp(args.resolveIp);
const httpUrl = `http://${domain}/`;
const httpsUrl = `https://${domain}/`;
const http = await head(httpUrl, domain, resolveIp);
const https = await head(httpsUrl, domain, resolveIp);
const checks = {
  httpRedirectsToHttps: httpRedirectsToHttps(http, domain),
  httpsAvailable: https.ok,
};
const blockers = [];

if (!checks.httpRedirectsToHttps) {
  blockers.push("http_not_redirecting_to_https");
}
if (!checks.httpsAvailable) {
  blockers.push("https_unavailable");
}

const result = {
  blockers,
  checks,
  domain,
  resolveIp,
  http: http.ok
    ? {
        location: http.headers.location ?? null,
        status: http.status,
        url: http.url,
      }
    : http,
  https: https.ok
    ? {
        status: https.status,
        url: https.url,
      }
    : https,
  ready: blockers.length === 0,
};

console.log(JSON.stringify(result, null, 2));

if (result.ready) {
  process.exit(0);
}

if (args.allowHttpsFailure && blockers.length === 1 && blockers[0] === "https_unavailable" && checks.httpRedirectsToHttps) {
  process.exit(0);
}

process.exit(1);
