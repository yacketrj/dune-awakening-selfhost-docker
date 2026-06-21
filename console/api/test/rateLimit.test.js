import test from "node:test";
import assert from "node:assert/strict";
import { createFixedWindowRateLimiter, createLoginRateLimiter } from "../src/rateLimit.js";

test("login rate limiter blocks repeated failures and resets after success", () => {
  let currentTime = 1000;
  const limiter = createLoginRateLimiter({
    maxAttempts: 3,
    windowMs: 1000,
    blockMs: 5000,
    now: () => currentTime
  });

  assert.equal(limiter.check("client").allowed, true);
  assert.equal(limiter.recordFailure("client").allowed, true);
  assert.equal(limiter.recordFailure("client").allowed, true);
  assert.equal(limiter.recordFailure("client").allowed, false);
  assert.equal(limiter.check("client").allowed, false);

  currentTime += 5001;
  assert.equal(limiter.check("client").allowed, true);
  limiter.recordFailure("client");
  limiter.recordSuccess("client");
  assert.equal(limiter.check("client").allowed, true);
});

test("fixed window API limiter blocks over-budget clients until reset", () => {
  let currentTime = 1000;
  const limiter = createFixedWindowRateLimiter({
    maxRequests: 2,
    windowMs: 1000,
    now: () => currentTime
  });

  assert.deepEqual(limiter.check("client"), {
    allowed: true,
    limit: 2,
    remaining: 1,
    retryAfterSeconds: 0,
    resetSeconds: 1
  });
  assert.equal(limiter.check("client").allowed, true);
  const blocked = limiter.check("client");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);

  currentTime += 1001;
  assert.equal(limiter.check("client").allowed, true);
});

test("fixed window API limiter accounts for request cost", () => {
  const limiter = createFixedWindowRateLimiter({ maxRequests: 3, windowMs: 1000 });

  assert.equal(limiter.check("client", 2).allowed, true);
  assert.equal(limiter.check("client", 2).allowed, false);
});
