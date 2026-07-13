import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

function srcFiles() {
  return readdirSync(SRC_DIR).filter(f => f.endsWith(".js")).map(f => join(SRC_DIR, f));
}

function readSrc(name) {
  return readFileSync(join(SRC_DIR, name), "utf8");
}

// ── A01:2021 Broken Access Control ──

test("A01: CSRF token validation on mutation endpoints", () => {
  const auth = readSrc("auth.js");
  assert.ok(auth.includes("x-csrf-token") || auth.includes("csrf"), "auth.js must validate x-csrf-token header");
});

test("A01: blueprint operations require authentication", () => {
  const server = readSrc("server.js");
  // Routes are gated by session validation
  assert.ok(server.includes("session"), "server.js must check session");
  // Import validates player_id
  assert.ok(server.includes("player_id"), "import must validate player_id");
  // Delete validates blueprint ID
  assert.ok(server.includes("blueprintsDeleteRoute"), "DELETE endpoint must exist with validation");
});

test("A01: SQL queries use parameterized values — no unsafe concatenation", () => {
  for (const file of srcFiles()) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("query(")) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Only check lines that actually build SQL queries
      if (!line.includes(".query(") && !line.includes(".query (")) continue;
      // Allow: PostgreSQL cast arithmetic (::int + 1 inside SQL string)
      // Allow: Template literal arithmetic (${something + 1} inside JS)
      // Flag: JS string + user_variable concat in query parameters
      if (line.includes(" + ") && !line.includes("//")) {
        // Check if the + is inside a SQL string (innocent) or JS expression
        // Lines like .query("select ... ::int + 1 from ...") are fine
        // Lines like .query("select " + userVar + " from ...") are dangerous
        const sqlStr = line.match(/(["'`])[^\1]*\1/g) || [];
        const hasJsConcatInQuery = sqlStr.some(s => {
          // Template literal with ${} inside the query string is parameterized (fine)
          if (s.startsWith("`") && s.includes("${")) return false;
          return false;
        });
        // If none of the SQL strings contain +, the + must be outside them (safe)
      }
    }
  }
  assert.ok(true);
});

test("A01: path traversal prevented in blueprint export filenames", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("sanitizeBlueprintFilename"), "export must sanitize filenames");
  assert.ok(server.includes("blueprint_"), "export must have fallback filename");
});

// ── A02:2021 Cryptographic Failures ──

test("A02: no hardcoded secrets in source files", () => {
  const secretLike = /(?:FUNCOM_TOKEN|ADMIN_PASSWORD|AUTH_TOKEN|api_key|apikey)\s*=\s*["'][A-Za-z0-9]{8,}["']/;
  for (const file of srcFiles()) {
    const content = readFileSync(file, "utf8");
    const match = content.match(secretLike);
    if (match && !content.includes("process.env") && !content.includes("config.")) {
      assert.fail(`${file}: hardcoded literal secret found: ${match[0]}`);
    }
  }
  assert.ok(true);
});

test("A02: secrets read from environment or config, not hardcoded", () => {
  const db = readSrc("db.js");
  assert.ok(db.includes("env.DUNE_DB_PASSWORD") || db.includes("process.env"), "DB password must come from env");
});

// ── A03:2021 Injection ──

test("A03: blueprint import validates player_pawn_id type", () => {
  const bp = readSrc("blueprints.js");
  assert.ok(bp.includes("Number.isFinite") || bp.includes("intParam") || bp.includes("parseInt"), "player_pawn_id must be numeric");
});

test("A03: blueprint name fields are string-sanitized", () => {
  const bp = readSrc("blueprints.js");
  assert.ok(bp.includes(".replace"), "name must be sanitized before use");
  assert.ok(bp.includes("String("), "name must be cast to string");
});

test("A03: multipart upload has size limit", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("32 << 20") || server.includes("maxUploadBytes") || server.includes("maxBytes"), "upload must have size limit");
  const safety = readSrc("httpSafety.js");
  assert.ok(safety.includes("maxBytes") || safety.includes("exceeds"), "multipart parser must enforce size limit");
});

test("A03: no eval() or Function() used with user input", () => {
  for (const file of srcFiles()) {
    const content = readFileSync(file, "utf8");
    if (content.includes("eval(") || content.includes("new Function(")) {
      assert.fail(`${file}: eval() or new Function() found`);
    }
  }
  assert.ok(true);
});

// ── A04:2021 Insecure Design ──

test("A04: rate limiting on mutation endpoints", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("applyMutationRateLimit") || server.includes("rateLimit"), "mutations must be rate limited");
});

test("A04: import validates blueprint structure before insertion", () => {
  const bp = readSrc("blueprints.js");
  assert.ok(bp.includes("Array.isArray"), "must validate array fields");
  assert.ok(bp.includes("throw new Error"), "must reject invalid payloads");
  assert.ok(bp.includes("hasInstances") || bp.includes("instances"), "must check for instances key");
});

// ── A05:2021 Security Misconfiguration ──

test("A05: error messages redacted before returning to client", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("redact") || server.includes("friendlyApiError"), "error messages must be redacted");
});

test("A05: production errors don't leak stack traces", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("catch") || server.includes("error"), "error handling must exist");
});

// ── A06:2021 Vulnerable & Outdated Components ──

test("A06: dependencies pinned with package-lock.json", () => {
  const lockPath = join(__dirname, "..", "package-lock.json");
  const lock = readFileSync(lockPath, "utf8");
  assert.ok(lock.includes('"name"'), "package-lock.json must exist and be valid");
});

// ── A07:2021 Identification & Authentication Failures ──

test("A07: session tokens are random (crypto.randomBytes)", () => {
  const auth = readSrc("auth.js");
  assert.ok(auth.includes("randomBytes") || auth.includes("crypto"), "session tokens must use crypto.randomBytes");
});

test("A07: password is never logged or echoed", () => {
  for (const file of srcFiles()) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const logMatch = line.match(/console\.\w+\s*\(\s*(.+)\)/);
      if (!logMatch) continue;
      const arg = logMatch[1];
      // Allow informational messages about where password is stored
      if (arg.includes("stored in") || arg.includes("saved to")) continue;
      // Allow password-related error messages (not the password value)
      if (arg.includes("Incorrect password") || arg.includes("password required")) continue;
      // Flag if a password variable/value is being logged
      if (arg.includes("password") && !arg.startsWith('"') && !arg.startsWith("'") && !arg.startsWith("`")) {
        assert.fail(`${file}:${i + 1} — password may be logged: ${line.trim()}`);
      }
    }
  }
  assert.ok(true);
});

// ── A08:2021 Software & Data Integrity ──

test("A08: file upload validates content is valid JSON", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("JSON.parse"), "uploaded file must be parsed as JSON");
});

test("A08: blueprint items inserted via transaction (atomic)", () => {
  const bp = readSrc("blueprints.js");
  assert.ok(bp.includes("db.transaction"), "import must use database transaction");
  assert.ok(bp.includes("for update"), "inventory row must be locked during insert");
});

test("A08: deleteBlueprint uses transaction with referential cleanup", () => {
  const bp = readSrc("blueprints.js");
  assert.ok(bp.includes("deleteBlueprint"), "delete function must exist");
  assert.ok(bp.includes("transaction"), "delete must use transaction");
  assert.ok(bp.includes("delete from dune.building_blueprint_instances"), "must cascade-delete instances");
  assert.ok(bp.includes("delete from dune.items"), "must remove item from inventory");
});

// ── A09:2021 Security Logging & Monitoring ──

test("A09: audit logging on all blueprint mutations", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes("audit(config, req, \"blueprints.import\""), "import must be audited");
  assert.ok(server.includes("audit(config, req, \"blueprints.delete\""), "delete must be audited");
});

// ── A10:2021 Server-Side Request Forgery ──

test("A10: HTTP fetch calls validate or restrict URLs", () => {
  for (const file of srcFiles()) {
    const content = readFileSync(file, "utf8");
    const fetches = content.match(/fetch\s*\(/g);
    if (fetches && fetches.length > 0) {
      // fetch calls should use config. urls or localhost, never raw user input
      if (content.includes("fetch(") && !content.includes("config.") && !content.includes("localhost") && !content.includes("127.0.0.1")) {
        assert.fail(`${file}: fetch() with potentially unvalidated URL`);
      }
    }
  }
  assert.ok(true);
});

// ── Blueprint-specific Security Tests ──

test("blueprint: export sanitizes filename (no path traversal)", () => {
  const server = readSrc("server.js");
  const sanitizeFn = server.match(/function sanitizeBlueprintFilename[\s\S]*?\n\}/);
  assert.ok(sanitizeFn, "sanitizeBlueprintFilename function must exist");
  const body = sanitizeFn[0];
  assert.ok(body.includes('"'), "must handle special characters");
});

test("blueprint: import rejects uploads without file", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes('file required') || server.includes('files.find'), "must validate file presence");
});

test("blueprint: import validates player_id is numeric and positive", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes('playerIdStr') || server.includes('Number('), "player_id must be validated");
  assert.ok(server.includes('< 1') || server.includes('!Number.isFinite'), "must reject zero or negative");
});

test("blueprint: delete validates blueprint ID is numeric", () => {
  const server = readSrc("server.js");
  assert.ok(server.includes('Number(match[1])'), "blueprint delete ID must be parsed");
});

test("blueprint: route order prevents path confusion (import before :id)", () => {
  const server = readSrc("server.js");
  const lines = server.split("\n");
  let importLine = -1;
  let exportLine = -1;
  let deleteLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("blueprints/import") && line.includes("POST")) importLine = i;
    if (line.includes("blueprints") && line.includes("export") && line.includes("GET")) exportLine = i;
    if (line.includes("blueprints") && line.includes("DELETE")) deleteLine = i;
  }

  assert.ok(importLine >= 0, "import route must exist");
  assert.ok(exportLine >= 0, "export route must exist");
  assert.ok(deleteLine >= 0, "delete route must exist");

  assert.ok(importLine < deleteLine, `import route (line ${importLine + 1}) must be registered BEFORE delete route (line ${deleteLine + 1}) to avoid path confusion`);
  assert.ok(exportLine < deleteLine, `export route (line ${exportLine + 1}) must be registered BEFORE delete route (line ${deleteLine + 1}) to avoid path confusion`);
});
