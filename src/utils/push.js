// Real device push notifications (lock-screen alerts, not just the in-app
// bell) via Apple's HTTP/2 APNs API using token-based provider auth — no
// vulnerable/legacy dependency needed, just Node's built-in http2 and the
// jsonwebtoken package this app already uses for its own auth.
//
// Inactive until three env vars are set (APNS_KEY_ID, APNS_TEAM_ID,
// APNS_AUTH_KEY) plus APNS_BUNDLE_ID — until then every call just logs what
// it would have sent and returns { ok: false, skipped: true }, the same
// dev-mode fallback pattern src/utils/mailer.js uses for email. See
// DEPLOYMENT.md for exactly what those values are and where to get them.
const http2 = require('http2');
const jwt = require('jsonwebtoken');

let cachedProviderToken = null;
let cachedProviderTokenIssuedAt = 0;

function getProviderToken() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKey = process.env.APNS_AUTH_KEY;
  if (!keyId || !teamId || !authKey) return null;

  const now = Date.now();
  // APNs provider tokens are valid up to 1 hour — refresh a bit early.
  if (cachedProviderToken && now - cachedProviderTokenIssuedAt < 50 * 60 * 1000) {
    return cachedProviderToken;
  }
  // Render (and most dashboards) can't store a literal multi-line env var
  // cleanly, so APNS_AUTH_KEY is expected with \n escapes — unescape them
  // back into real newlines for a valid PEM.
  const pem = authKey.includes('\\n') ? authKey.replace(/\\n/g, '\n') : authKey;
  cachedProviderToken = jwt.sign({}, pem, { algorithm: 'ES256', issuer: teamId, keyid: keyId });
  cachedProviderTokenIssuedAt = now;
  return cachedProviderToken;
}

// Use api.sandbox.push.apple.com for a debug/TestFlight-adjacent build if
// APNS_ENV=sandbox is set; production APNs otherwise.
function apnsHost() {
  return process.env.APNS_ENV === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
}

function sendPushToToken(deviceToken, { title, body, data } = {}) {
  const providerToken = getProviderToken();
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!providerToken || !bundleId) {
    console.log(`[push] APNs not configured — would have sent to ${deviceToken}: "${title}" — "${body}"`);
    return Promise.resolve({ ok: false, skipped: true });
  }

  return new Promise((resolve) => {
    const client = http2.connect(`https://${apnsHost()}`);
    client.on('error', (err) => {
      console.error('[push] APNs connection error:', err.message);
      resolve({ ok: false, error: err.message });
    });

    const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, ...(data || {}) });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });

    let status = null;
    let responseBody = '';
    req.on('response', (headers) => { status = headers[':status']; });
    req.setEncoding('utf8');
    req.on('data', (chunk) => { responseBody += chunk; });
    req.on('end', () => {
      client.close();
      if (status === 200) resolve({ ok: true });
      else resolve({ ok: false, status, error: responseBody });
    });
    req.on('error', (err) => {
      client.close();
      resolve({ ok: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

// Sends to every device token registered on a user's account (a person can
// have more than one — old phone + new phone, etc.) — failures on one
// token don't block the others.
async function sendPushToUser(User, userId, notif) {
  const user = await User.findById(userId);
  if (!user || !user.deviceTokens || user.deviceTokens.length === 0) return;
  await Promise.all(user.deviceTokens.map((t) => sendPushToToken(t, notif)));
}

module.exports = { sendPushToToken, sendPushToUser };
