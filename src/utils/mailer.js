// Sends transactional email through Resend's HTTP API (https://resend.com)
// instead of SMTP. This used to go through Gmail via SMTP, but that requires
// an outbound connection on port 465/587 — Render's free tier (and many
// other PaaS hosts) blocks that outright, so the request just hung forever
// with no error instead of failing cleanly. Resend's API is a normal HTTPS
// POST, so it isn't affected by that kind of port blocking.
async function sendResetCodeEmail(toEmail, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[dev] Password reset code for ${toEmail}: ${code}`);
    console.log('[dev] (Set RESEND_API_KEY in .env to send this as a real email instead.)');
    return;
  }

  // Resend's shared onboarding@resend.dev sender works out of the box, no
  // domain verification needed, and can send to any recipient — good enough
  // until a real domain is verified. Override with RESEND_FROM_EMAIL once
  // one is (e.g. 'FOMO <noreply@yourdomain.com>').
  const from = process.env.RESEND_FROM_EMAIL || 'FOMO <onboarding@resend.dev>';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: toEmail,
        subject: 'Your FOMO password reset code',
        text: `Your FOMO password reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
        html: `<p>Your FOMO password reset code is:</p>` +
          `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>` +
          `<p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

module.exports = { sendResetCodeEmail };
