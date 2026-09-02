const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NightRecap = require('../models/NightRecap');
const Post = require('../models/Post');
const Party = require('../models/Party');
const Review = require('../models/Review');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { sendResetCodeEmail } = require('../utils/mailer');

const router = express.Router();

function serializeUser(u) {
  const obj = u.toObject();
  delete obj.passwordHash;
  delete obj.resetCodeHash;
  delete obj.resetCodeExpires;
  return { ...obj, id: obj._id };
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/signup  { email, password, name, handle? }
router.post('/signup', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server auth is not configured (missing JWT_SECRET)' });
  }
  const { email, password, name, handle } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) return res.status(409).json({ error: 'An account with that email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanHandle = handle && handle.trim()
      ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
      : `@${name.replace(/\s+/g, '')}`;

    // 'u-' + a random id, matching the frontend's existing 'u-*' user id
    // convention (your own account, created earlier, is 'u-ole').
    const id = `u-${crypto.randomBytes(6).toString('hex')}`;

    const user = await User.create({
      _id: id,
      email: normalizedEmail,
      passwordHash,
      name,
      handle: cleanHandle,
      avatar: name.trim().charAt(0).toUpperCase() || 'U',
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server auth is not configured (missing JWT_SECRET)' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user._id);
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(serializeUser(user));
});

// PATCH /api/auth/me  { name?, handle?, bio?, city?, genres?, avatarImage?, goingOut?, goingOutDate? }
router.patch('/me', requireAuth, async (req, res) => {
  const allowed = ['name', 'handle', 'bio', 'city', 'genres', 'avatarImage', 'onboardingComplete', 'goingOut', 'goingOutDate'];
  const updates = {};
  for (const key of allowed) {
    if (req.body && req.body[key] !== undefined) updates[key] = req.body[key];
  }
  try {
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(serializeUser(user));
  } catch (err) {
    console.error('Profile update failed:', err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/auth/request-reset  { email }
// Emails a 6-digit reset code. Doesn't require (or accept) the current
// password — this IS the "I don't have it" path. Always responds the same
// way whether or not the email has an account, so this can't be used to
// probe which emails are registered.
router.post('/request-reset', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      user.resetCodeHash = await bcrypt.hash(code, 10);
      user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      await sendResetCodeEmail(user.email, code);
    }
    res.json({ ok: true, message: 'If that email has an account, a reset code has been sent.' });
  } catch (err) {
    console.error('Request reset failed:', err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// POST /api/auth/reset-password  { email, code, newPassword }
// Verifies the emailed code and sets a new password in one step. On success
// also logs the user in (returns a fresh token) so they don't have to log in
// again right after resetting.
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const ok = await bcrypt.compare(String(code), user.resetCodeHash);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetCodeHash = null;
    user.resetCodeExpires = null;
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Reset password failed:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/auth/me — permanently deletes the account, its own content
// (recaps, posts, parties, reviews), and scrubs it out of other people's
// data too (follows, blocks, likes, comments). Required by App Store
// guideline 5.1.1(v): any app that supports account creation must also
// offer account deletion in the app itself, not just via a support email.
router.delete('/me', requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    await Promise.all([
      NightRecap.deleteMany({ userId }),
      Post.deleteMany({ userId }),
      Party.deleteMany({ hostId: userId }),
      Review.deleteMany({ userId }),
      Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }),
      Block.deleteMany({ $or: [{ blockerId: userId }, { blockedId: userId }] }),
      Notification.deleteMany({ $or: [{ userId }, { actorId: userId }] }),
    ]);
    // Scrub this account's likes and comments off of other people's content.
    await NightRecap.updateMany({}, { $pull: { likedBy: userId, comments: { userId } } });
    await Post.updateMany({}, { $pull: { likedBy: userId } });
    await User.findByIdAndDelete(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Account deletion failed:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
