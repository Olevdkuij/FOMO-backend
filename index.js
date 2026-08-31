require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { securityHeaders } = require('./src/middleware/security');
const { rateLimit } = require('./src/middleware/rateLimit');
const venuesRouter = require('./src/routes/venues');
const authRouter = require('./src/routes/auth');
const recapsRouter = require('./src/routes/recaps');
const postsRouter = require('./src/routes/posts');
const partiesRouter = require('./src/routes/parties');
const followsRouter = require('./src/routes/follows');
const usersRouter = require('./src/routes/users');
const notificationsRouter = require('./src/routes/notifications');
const reportsRouter = require('./src/routes/reports');
const blocksRouter = require('./src/routes/blocks');
const marbellaEventsRouter = require('./src/routes/marbellaEvents');
const mapkitTokenRouter = require('./src/routes/mapkitToken');
const adminRouter = require('./src/routes/admin');

const app = express();
const port = process.env.PORT || 3000;

// Render/Railway/Fly (and most hosts) put the app behind a reverse proxy —
// without this, req.ip is the proxy's address for every request, which
// would put every user in the same rate-limit bucket.
app.set('trust proxy', 1);

// Only origins listed in ALLOWED_ORIGINS (comma-separated) are allowed once
// it's set — until then (local dev, where it's normally unset) everything
// is allowed so this doesn't break the existing workflow. Requests with no
// Origin header at all (native app requests, curl, server-to-server) are
// always allowed — CORS is a browser-enforced mechanism and doesn't apply
// to those.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(securityHeaders);
app.use(express.json({ limit: '15mb' })); // posts/drops/party photos travel as base64 data URLs

app.get('/', (req, res) => {
  res.send('FOMO backend is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mongoConnected: mongoose.connection.readyState === 1 });
});

// Unauthenticated auth endpoints are the ones worth protecting from
// brute-force/spam most — a generous but real ceiling per IP.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many attempts — please wait a few minutes and try again.' }));
// A general backstop across the whole API so no single client can hammer it.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use('/api/venues', venuesRouter);
app.use('/api/auth', authRouter);
app.use('/api/recaps', recapsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/follows', followsRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/marbella-events', marbellaEventsRouter);
app.use('/api/mapkit-token', mapkitTokenRouter);
app.use('/api/admin', adminRouter);

// Anything under /api that didn't match a route above.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — always last. Never leak internals (stack
// traces, DB error text) to the client; the real detail still goes to the
// server log via console.error.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 400 ? 'Malformed request' : 'Something went wrong. Please try again.' });
});

async function start() {
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    console.error('MONGODB_URI is required in production — refusing to start without a real database.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET is required in production — refusing to start without it.');
    process.exit(1);
  }

  if (process.env.MONGODB_URI) {
    try {
      // A hard timeout so a brief network hiccup (or, in this dev sandbox,
      // no path at all to Atlas) fails fast with a clear log line instead of
      // hanging start() forever and never reaching app.listen().
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
    }
  } else {
    console.log('No MONGODB_URI set, skipping DB connection for now');
  }

  app.listen(port, () => {
    console.log(`FOMO backend listening at http://localhost:${port}`);
  });
}

start();
