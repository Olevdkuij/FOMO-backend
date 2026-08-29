// A handful of standard security response headers (the same ones a package
// like `helmet` sets) — written by hand since this environment's network
// policy blocks installing new npm packages. Nothing here is exotic; it's
// the baseline every production API should send.
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  next();
}

module.exports = { securityHeaders };
