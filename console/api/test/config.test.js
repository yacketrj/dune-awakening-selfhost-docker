import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, publicConfig } from "../src/config.js";

test("web config exposes safe deployment flags and JSON body limit", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "arrakis-config-"));
  const previous = { ...process.env };
  process.env.DUNE_DOCKER_DIR = repoRoot;
  process.env.NODE_ENV = "production";
  process.env.ADMIN_PUBLIC_BASE_URL = "https://console.example.test/admin";
  process.env.ADMIN_ALLOWED_ORIGINS = "https://ops.example.test";
  process.env.ADMIN_ALLOWED_HOSTS = "console-admin.example.test";
  process.env.ADMIN_TRUST_PROXY = "1";
  process.env.ADMIN_PUBLIC_HEALTH_ENABLED = "1";
  process.env.ADMIN_MAX_JSON_BYTES = "12345";
  process.env.ADMIN_API_RATE_LIMIT_WINDOW_MS = "30000";
  process.env.ADMIN_API_RATE_LIMIT_MAX = "99";
  process.env.ADMIN_API_MUTATION_RATE_LIMIT_MAX = "33";
  process.env.ADMIN_API_EXPENSIVE_RATE_LIMIT_MAX = "44";
  try {
    const config = loadConfig();
    assert.equal(config.secureCookies, true);
    assert.equal(config.cookieSameSite, "Strict");
    assert.equal(config.publicBaseUrl, "https://console.example.test");
    assert.deepEqual(config.allowedOrigins, ["https://ops.example.test", "https://console.example.test"]);
    assert.deepEqual(config.allowedHosts, ["console-admin.example.test", "console.example.test"]);
    assert.equal(config.trustProxy, true);
    assert.equal(config.publicHealthEnabled, true);
    assert.equal(config.hstsEnabled, true);
    assert.equal(config.maxJsonBytes, 12345);
    assert.equal(config.requestTimeoutMs, 120000);
    assert.equal(config.headersTimeoutMs, 10000);
    assert.equal(config.apiRateLimitWindowMs, 30000);
    assert.equal(config.apiRateLimitMax, 99);
    assert.equal(config.apiMutationRateLimitMax, 33);
    assert.equal(config.apiExpensiveRateLimitMax, 44);
    const exposed = publicConfig(config);
    assert.equal(exposed.secureCookies, true);
    assert.equal(exposed.cookieSameSite, "Strict");
    assert.equal(exposed.publicBaseUrl, "https://console.example.test");
    assert.equal(exposed.authDisabled, false);
    assert.equal(exposed.mockMode, false);
    assert.equal(Object.hasOwn(exposed, "repoRoot"), false);
    assert.equal(Object.hasOwn(exposed, "apiRateLimitMax"), false);
    assert.equal(Object.hasOwn(exposed, "adminPassword"), false);
    assert.equal(Object.hasOwn(exposed, "sessionSecret"), false);

    process.env.ADMIN_SECURE_COOKIES = "0";
    assert.equal(loadConfig().secureCookies, false);

    process.env.ADMIN_SECURE_COOKIES = "auto";
    process.env.ADMIN_PUBLIC_BASE_URL = "";
    assert.equal(loadConfig().secureCookies, false);
  } finally {
    process.env = previous;
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("web config rejects disabled auth on a public base URL by default", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "arrakis-config-"));
  const previous = { ...process.env };
  process.env.DUNE_DOCKER_DIR = repoRoot;
  process.env.ADMIN_PUBLIC_BASE_URL = "https://console.example.test";
  process.env.ADMIN_AUTH_DISABLED = "1";
  try {
    assert.throws(() => loadConfig(), /ADMIN_AUTH_DISABLED=1 is not allowed/);
    process.env.ADMIN_ALLOW_AUTH_DISABLED_WITH_PUBLIC_URL = "1";
    assert.equal(loadConfig().authDisabled, true);
  } finally {
    process.env = previous;
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
