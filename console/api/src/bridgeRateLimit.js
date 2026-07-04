export function createBridgeRateLimiter(options = {}) {
  const { perKeyMax = 60, globalMax = 300, windowMs = 60000, now = () => Date.now() } = options;
  const perKey = new Map();
  let globalHits = [];

  function prune() {
    const cutoff = now() - windowMs;
    for (const [key, timestamps] of perKey) {
      const active = timestamps.filter(t => t > cutoff);
      if (active.length) perKey.set(key, active);
      else perKey.delete(key);
    }
    globalHits = globalHits.filter(t => t > cutoff);
  }

  function check(key) {
    prune();
    const keyHits = perKey.get(key) || [];
    if (keyHits.length >= perKeyMax) {
      return { allowed: false, retryAfterSeconds: Math.ceil((keyHits[0] + windowMs - now()) / 1000) };
    }
    if (globalHits.length >= globalMax) {
      return { allowed: false, retryAfterSeconds: Math.ceil((globalHits[0] + windowMs - now()) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function record(key) {
    const t = now();
    const existing = perKey.get(key) || [];
    existing.push(t);
    perKey.set(key, existing);
    globalHits.push(t);
    return check(key);
  }

  function reset(key) {
    perKey.delete(key);
  }

  return { check, record, reset };
}
