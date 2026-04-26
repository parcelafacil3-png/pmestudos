const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const notes = getDB().prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  const unread = getDB().prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ notifications: notes, unread });
});

router.patch('/:id/read', (req, res) => {
  getDB().prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.patch('/read-all', (req, res) => {
  getDB().prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
