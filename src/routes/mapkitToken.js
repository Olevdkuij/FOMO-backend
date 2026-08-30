const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();

// MapKit JS (the web map library, used by the FOMO frontend's Venues map
// view) needs a short-lived signed JWT rather than a plain client-side API
// key like Google Maps used. The frontend calls this endpoint on load —
// and again whenever MapKit JS needs to refresh it — via mapkit.init's
// authorizationCallback. See MAPKIT_SETUP.md for the one-time Apple
// Developer setup (Maps ID + key) this depends on.
//
// Required env vars (see .env.example):
//   MAPKIT_TEAM_ID   Apple Developer Team ID
//   MAPKIT_KEY_ID    The Maps key's Key ID
//   MAPKIT_KEY_PATH  Path to the AuthKey_<KeyID>.p8 file (defaults to
//                    secrets/AuthKey_<MAPKIT_KEY_ID>.p8 in this repo)

let cachedKey = null;
function getPrivateKey() {
  if (cachedKey) return cachedKey;

  // Preferred: MAPKIT_KEY_BASE64, a single-line base64 encoding of the .p8
  // file's exact bytes. A multi-line PEM pasted through a browser textarea
  // (Render's Secret Files editor) is easy to corrupt — line breaks or
  // whitespace get mangled in transit — which surfaces as a cryptic
  // "secretOrPrivateKey must be an asymmetric key" error from jsonwebtoken.
  // Base64 is a single unbroken line, so there's nothing for a text field
  // to mangle. Generate it with:
  //   base64 -i AuthKey_<KeyID>.p8 | tr -d '\n'
  if (process.env.MAPKIT_KEY_BASE64) {
    cachedKey = Buffer.from(process.env.MAPKIT_KEY_BASE64, 'base64').toString('utf8');
    return cachedKey;
  }

  // Fallback: a file path (e.g. Render Secret File, or the local secrets/
  // folder in dev).
  const keyPath = process.env.MAPKIT_KEY_PATH
    || path.join(__dirname, '..', '..', 'secrets', `AuthKey_${process.env.MAPKIT_KEY_ID}.p8`);
  cachedKey = fs.readFileSync(keyPath, 'utf8');
  return cachedKey;
}

function generateMapKitToken() {
  const teamId = process.env.MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  if (!teamId || !keyId) {
    throw new Error('MAPKIT_TEAM_ID or MAPKIT_KEY_ID is not set');
  }

  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    // Short-lived on purpose — MapKit JS calls this endpoint again to
    // refresh before the token expires, so there's no benefit to a longer
    // lifetime and a real cost if the token ever leaks.
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
  };
  if (process.env.MAPKIT_ALLOWED_ORIGIN) {
    payload.origin = process.env.MAPKIT_ALLOWED_ORIGIN;
  }

  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'ES256',
    header: { kid: keyId, typ: 'JWT' },
  });
}

// GET /api/mapkit-token
// MapKit JS's authorizationCallback expects the raw token as plain text,
// not JSON.
router.get('/', (req, res) => {
  if (!process.env.MAPKIT_TEAM_ID || !process.env.MAPKIT_KEY_ID) {
    return res.status(500).json({ error: 'Server MapKit auth is not configured' });
  }
  try {
    const token = generateMapKitToken();
    res.type('text/plain').send(token);
  } catch (err) {
    console.error('MapKit token generation failed:', err);
    res.status(500).json({ error: 'Failed to generate MapKit token' });
  }
});

module.exports = router;
