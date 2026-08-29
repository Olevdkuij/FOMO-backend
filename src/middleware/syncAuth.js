// Protects the marbella-events sync endpoint. This isn't a user-facing
// endpoint (requireAuth/JWT doesn't fit — there's no user session, just an
// external script pushing a fresh dataset), so it's a single shared secret
// instead, sent as a header rather than a query string so it never ends up
// logged in server access logs or shell history.
function requireSyncSecret(req, res, next) {
  if (!process.env.SYNC_SECRET) {
    console.error('SYNC_SECRET is not set — refusing all sync requests');
    return res.status(500).json({ error: 'Sync is not configured on this server' });
  }
  const provided = req.header('x-sync-secret');
  if (provided !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { requireSyncSecret };
