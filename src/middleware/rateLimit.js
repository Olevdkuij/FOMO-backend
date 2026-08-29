// Minimal in-memory rate limiter — no external dependency needed (this
// environment's network policy blocks npm installs of packages like
// express-rate-limit, so this is hand-rolled instead). Tracks request
// counts per key in a fixed window. Good enough for a single server
// instance; if this backend is ever scaled to multiple instances, swap
// this for a shared store (e.g. Redis) so the limit is enforced across
// all of them instead of separately per instance.
const buckets = new Map();

function rateLimit({ windowMs, max, message }) {
  return function rateLimitMiddleware(req, res, next) {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.start + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
      return res.status(429).json({ error: message || 'Too many requests — please try again later.' });
    }
    next();
  };
}

// Periodically clear stale buckets so this map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { rateLimit };
