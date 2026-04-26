const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/me', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT discipline, SUM(hours_studied) as total_hours, date
    FROM study_progress WHERE user_id = ?
    GROUP BY discipline ORDER BY date DESC
  `).all(req.user.id);
  const weekly = db.prepare(`
    SELECT date, SUM(hours_studied) as hours
    FROM study_progress WHERE user_id = ? AND date >= date('now','-7 days')
    GROUP BY date ORDER BY date ASC
  `).all(req.user.id);
  const answer_stats = db.prepare(`
    SELECT q.discipline, COUNT(*) as answered, SUM(ua.correct) as correct
    FROM user_answers ua JOIN questions q ON q.id = ua.question_id
    WHERE ua.user_id = ? GROUP BY q.discipline
  `).all(req.user.id);
  res.json({ stats, weekly, answer_stats });
});

router.post('/log', (req, res) => {
  const { discipline, hours, date } = req.body;
  if (!discipline || !hours) return res.status(400).json({ error: 'Campos obrigatórios' });
  const db = getDB();
  const today = date || new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT id FROM study_progress WHERE user_id=? AND discipline=? AND date=?').get(req.user.id, discipline, today);
  if (existing) {
    db.prepare('UPDATE study_progress SET hours_studied = hours_studied + ? WHERE id = ?').run(hours, existing.id);
  } else {
    db.prepare('INSERT INTO study_progress (user_id, discipline, hours_studied, date) VALUES (?,?,?,?)').run(req.user.id, discipline, hours, today);
  }
  res.json({ success: true });
});

module.exports = router;
