const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set — refusing to verify tokens');
    return res.status(500).json({ error: 'Server auth is not configured' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session — please log in again' });
  }
}

module.exports = { requireAuth };
