const nodemailer = require('nodemailer');

function getTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

// Sends a password-reset code by email. If Gmail SMTP isn't configured yet
// (EMAIL_USER / EMAIL_APP_PASSWORD unset), falls back to logging the code to
// this terminal so the reset flow still works end-to-end during local dev.
async function sendResetCodeEmail(toEmail, code) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[dev] Password reset code for ${toEmail}: ${code}`);
    console.log('[dev] (Set EMAIL_USER / EMAIL_APP_PASSWORD in .env to send this as a real email instead.)');
    return;
  }
  await transport.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your FOMO password reset code',
    text: `Your FOMO password reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your FOMO password reset code is:</p>` +
      `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>` +
      `<p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendResetCodeEmail };
