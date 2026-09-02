const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();

function serialize(p) {
  const obj = p.toObject();
  return { ...obj, id: obj._id };
}

// GET /api/posts — the shared feed
router.get('/', async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts.map(serialize));
});

// POST /api/posts  { id, venueId?, caption, photo, kind, mediaType?, taggedUserIds? }
router.post('/', requireAuth, async (req, res) => {
  const { id, venueId, caption, photo, createdAgo, kind, mediaType, taggedUserIds } = req.body || {};
  if (!id || !photo) return res.status(400).json({ error: 'id and photo are required' });
  try {
    const post = await Post.create({
      _id: id, userId: req.userId, venueId, caption, photo, createdAgo, kind: kind || 'post',
      mediaType: mediaType || 'image', taggedUserIds: taggedUserIds || [],
    });
    res.status(201).json(serialize(post));
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'Post already exists' });
    console.error('Create post failed:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PATCH /api/posts/:id  { caption?, photo?, venueId?, highlighted? } — owner only
router.patch('/:id', requireAuth, async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== req.userId) return res.status(403).json({ error: 'Not your post' });
  const { caption, photo, venueId, highlighted } = req.body || {};
  if (caption !== undefined) post.caption = caption;
  if (photo !== undefined) post.photo = photo;
  if (venueId !== undefined) post.venueId = venueId;
  if (highlighted !== undefined) post.highlighted = !!highlighted;
  await post.save();
  res.json(serialize(post));
});

// POST /api/posts/:id/like — toggle. Notifies the owner only when a new like
// is added (not on unlike), and never for liking your own post.
router.post('/:id/like', requireAuth, async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const alreadyLiked = post.likedBy.includes(req.userId);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter((id) => id !== req.userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(req.userId);
    post.likes += 1;
    createNotification({ userId: post.userId, type: 'like_post', actorId: req.userId, targetId: post._id });
    const liker = await User.findById(req.userId);
    sendPushToUser(User, post.userId, {
      title: 'FOMO',
      body: `${liker ? liker.name : 'Someone'} liked your post`,
      data: { type: 'like_post', actorId: req.userId, targetId: String(post._id) },
    });
  }
  await post.save();
  res.json(serialize(post));
});

// DELETE /api/posts/:id — owner only
router.delete('/:id', requireAuth, async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== req.userId) return res.status(403).json({ error: 'Not your post' });
  await Post.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
