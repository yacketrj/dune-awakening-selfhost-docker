import test from "node:test";
import assert from "node:assert/strict";
import { createAuth, clearSessionCookie, hasTrustedRequestOrigin, isTrustedHost, json, parseCookies, setSessionCookie } from "../src/auth.js";

test("auth creates readable signed sessions", () => {
  const auth = createAuth({ sessionSecret: "secret", adminPassword: "admin", authDisabled: false });
  const session = auth.makeSession();
  const req = { headers: { cookie: `asc_session=${encodeURIComponent(session.cookie)}` } };
  assert.equal(auth.readSession(req)?.id, session.id);
  assert.equal(auth.passwordMatches("admin"), true);
  assert.equal(auth.passwordMatches("wrong"), false);
});

test("auth rejects state-changing requests without CSRF token", () => {
  const auth = createAuth({ sessionSecret: "secret", adminPassword: "admin", authDisabled: false });
  const session = auth.makeSession();
  const req = { method: "POST", headers: { cookie: `asc_session=${encodeURIComponent(session.cookie)}` } };
  const res = fakeResponse();
  assert.equal(auth.requireAuth(req, res), null);
  assert.equal(res.status, 403);
});

test("auth accepts state-changing requests with CSRF token", () => {
  const auth = createAuth({ sessionSecret: "secret", adminPassword: "admin", authDisabled: false });
  const session = auth.makeSession();
  const req = { method: "POST", headers: { cookie: `asc_session=${encodeURIComponent(session.cookie)}`, "x-csrf-token": session.csrf } };
  const res = fakeResponse();
  assert.equal(auth.requireAuth(req, res)?.id, session.id);
  assert.equal(res.status, null);
});

test("auth rejects state-changing requests from untrusted origins", () => {
  const config = {
    sessionSecret: "secret",
    adminPassword: "admin",
    authDisabled: false,
    publicBaseUrl: "https://console.example.test",
    allowedOrigins: ["https://console.example.test"]
  };
  const auth = createAuth(config);
  const session = auth.makeSession();
  const req = {
    method: "POST",
    headers: {
      cookie: `asc_session=${encodeURIComponent(session.cookie)}`,
      "x-csrf-token": session.csrf,
      origin: "https://evil.example.test",
      host: "console.example.test"
    }
  };
  const res = fakeResponse();
  assert.equal(auth.requireAuth(req, res), null);
  assert.equal(res.status, 403);
});

test("origin checks allow same-origin HTTP for private non-HTTPS use", () => {
  assert.equal(hasTrustedRequestOrigin({
    headers: {
      origin: "http://127.0.0.1:8088",
      host: "127.0.0.1:8088"
    }
  }, {}), true);
});

test("origin checks trust forwarded hosts only when proxy trust is enabled", () => {
  const req = {
    headers: {
      origin: "https://console.example.test",
      host: "attacker.example.test",
      "x-forwarded-host": "console.example.test",
      "x-forwarded-proto": "https"
    }
  };

  assert.equal(hasTrustedRequestOrigin(req, {}), false);
  assert.equal(hasTrustedRequestOrigin(req, { trustProxy: true }), true);
});

test("host allowlist blocks DNS rebinding style host headers when configured", () => {
  assert.equal(isTrustedHost({ headers: { host: "console.example.test" } }, { allowedHosts: ["console.example.test"] }), true);
  assert.equal(isTrustedHost({
    headers: {
      host: "attacker.example.test",
      "x-forwarded-host": "console.example.test"
    }
  }, { allowedHosts: ["console.example.test"] }), false);
  assert.equal(isTrustedHost({ headers: { host: "attacker.example.test" } }, { allowedHosts: ["console.example.test"] }), false);
});

test("session cookies can opt into Secure for production/container deployments", () => {
  const res = fakeResponse();
  setSessionCookie(res, { cookie: "abc.sig" }, { secureCookies: true });
  assert.match(res.headers["Set-Cookie"], /HttpOnly/);
  assert.match(res.headers["Set-Cookie"], /SameSite=Strict/);
  assert.match(res.headers["Set-Cookie"], /Secure/);

  clearSessionCookie(res, { secureCookies: true });
  assert.match(res.headers["Set-Cookie"], /Max-Age=0/);
  assert.match(res.headers["Set-Cookie"], /Secure/);
});

test("json responses include defensive browser headers", () => {
  const res = fakeResponse();
  json(res, 200, { ok: true }, {}, { hstsEnabled: true, hstsMaxAge: 123 });
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers.pragma, "no-cache");
  assert.equal(res.headers["x-robots-tag"], "noindex, nofollow, noarchive");
  assert.match(res.headers["content-security-policy"], /default-src 'self'/);
  assert.equal(res.headers["cross-origin-opener-policy"], "same-origin");
  assert.equal(res.headers["referrer-policy"], "no-referrer");
  assert.equal(res.headers["strict-transport-security"], "max-age=123; includeSubDomains");
  assert.match(res.headers["permissions-policy"], /camera=\(\)/);
});

test("cookie parser keeps malformed encoded cookies from crashing auth", () => {
  const cookies = parseCookies("asc_session=%E0%A4%A; other=value");
  assert.equal(cookies.get("asc_session"), "%E0%A4%A");
  assert.equal(cookies.get("other"), "value");
});

function fakeResponse() {
  return {
    status: null,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(status, headers = {}) {
      this.status = status;
      Object.assign(this.headers, headers);
    },
    end(body) {
      this.body = body;
    }
  };
}
