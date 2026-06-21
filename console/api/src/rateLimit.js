export function createLoginRateLimiter(options = {}) {
  const {
    maxAttempts = 8,
    windowMs = 15 * 60 * 1000,
    blockMs = 15 * 60 * 1000,
    now = () => Date.now()
  } = options;
  const attempts = new Map();

  function check(key) {
    const current = attempts.get(key);
    const timestamp = now();
    if (!current) return { allowed: true, retryAfterSeconds: 0 };
    if (current.blockedUntil && current.blockedUntil > timestamp) {
      return { allowed: false, retryAfterSeconds: Math.ceil((current.blockedUntil - timestamp) / 1000) };
    }
    if (current.firstAttemptAt + windowMs <= timestamp) {
      attempts.delete(key);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function recordFailure(key) {
    const timestamp = now();
    const current = attempts.get(key);
    const next = !current || current.firstAttemptAt + windowMs <= timestamp
      ? { count: 1, firstAttemptAt: timestamp, blockedUntil: 0 }
      : { ...current, count: current.count + 1 };
    if (next.count >= maxAttempts) next.blockedUntil = timestamp + blockMs;
    attempts.set(key, next);
    return check(key);
  }

  function recordSuccess(key) {
    attempts.delete(key);
  }

  return { check, recordFailure, recordSuccess };
}

export function createFixedWindowRateLimiter(options = {}) {
  const {
    maxRequests = 300,
    windowMs = 60 * 1000,
    maxKeys = 5000,
    now = () => Date.now()
  } = options;
  const buckets = new Map();
  const limit = Math.max(1, Number(maxRequests) || 300);
  const windowSize = Math.max(1000, Number(windowMs) || 60 * 1000);
  const keyLimit = Math.max(100, Number(maxKeys) || 5000);

  function check(key, cost = 1) {
    const timestamp = now();
    const normalizedKey = String(key || "unknown");
    const normalizedCost = Math.max(1, Number(cost) || 1);
    let bucket = buckets.get(normalizedKey);
    if (!bucket || bucket.resetAt <= timestamp) {
      bucket = { count: 0, resetAt: timestamp + windowSize };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
    if (bucket.count + normalizedCost > limit) {
      buckets.set(normalizedKey, bucket);
      pruneExpired(timestamp);
      return { allowed: false, limit, remaining: 0, retryAfterSeconds, resetSeconds: retryAfterSeconds };
    }

    bucket.count += normalizedCost;
    buckets.set(normalizedKey, bucket);
    pruneExpired(timestamp);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
    return { allowed: true, limit, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: 0, resetSeconds };
  }

  function pruneExpired(timestamp = now()) {
    if (buckets.size <= keyLimit) return;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= timestamp) buckets.delete(key);
      if (buckets.size <= keyLimit) break;
    }
  }

  function reset(key) {
    buckets.delete(String(key || "unknown"));
  }

  return { check, reset };
}
