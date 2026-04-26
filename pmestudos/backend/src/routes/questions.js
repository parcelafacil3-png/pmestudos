const express = require('express');
const { getDB } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// List questions with filters
router.get('/', authMiddleware, (req, res) => {
  const { discipline, difficulty, year, source, search, limit = 20, offset = 0, review, favorite } = req.query;
  const db = getDB();
  let where = ['q.active = 1'];
  const params = [];

  if (discipline) { where.push('q.discipline = ?'); params.push(discipline); }
  if (difficulty) { where.push('q.difficulty = ?'); params.push(difficulty); }
  if (year)       { where.push('q.year = ?'); params.push(year); }
  if (source)     { where.push('q.source = ?'); params.push(source); }
  if (search)     { where.push('q.text LIKE ?'); params.push(`%${search}%`); }

  let joinClause = '';
  if (review || favorite) {
    joinClause = `LEFT JOIN user_answers ua ON ua.question_id = q.id AND ua.user_id = ${req.user.id}`;
    if (review)   { where.push('ua.review = 1'); }
    if (favorite) { where.push('ua.favorite = 1'); }
  }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const questions = db.prepare(`
    SELECT q.*, ua.answer as user_answer, ua.correct as user_correct, ua.review, ua.favorite
    FROM questions q ${joinClause} ${whereStr}
    ORDER BY q.id DESC LIMIT ? OFFSET ?
  `).all([...params, parseInt(limit), parseInt(offset)]);

  const total = db.prepare(`SELECT COUNT(*) as c FROM questions q ${joinClause} ${whereStr}`).get(params).c;

  const parsed = questions.map(q => ({
    ...q,
    options: JSON.parse(q.options),
    tags: q.tags ? JSON.parse(q.tags) : []
  }));

  res.json({ questions: parsed, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// Get single question
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const q = db.prepare('SELECT * FROM questions WHERE id = ? AND active = 1').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Questão não encontrada' });
  res.json({ ...q, options: JSON.parse(q.options), tags: q.tags ? JSON.parse(q.tags) : [] });
});

// Submit answer
router.post('/:id/answer', authMiddleware, (req, res) => {
  const { answer, time_spent } = req.body;
  const db = getDB();
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Questão não encontrada' });
  const correct = answer === q.correct ? 1 : 0;
  const existing = db.prepare('SELECT id FROM user_answers WHERE user_id = ? AND question_id = ?').get(req.user.id, q.id);
  if (existing) {
    db.prepare("UPDATE user_answers SET answer = ?, correct = ?, time_spent = ?, answered_at = datetime('now') WHERE id = ?")
      .run(answer, correct, time_spent || 0, existing.id);
  } else {
    db.prepare("INSERT INTO user_answers (user_id, question_id, answer, correct, time_spent) VALUES (?,?,?,?,?)")
      .run(req.user.id, q.id, answer, correct, time_spent || 0);
  }
  res.json({ correct: correct === 1, correct_answer: q.correct, explanation: q.explanation });
});

// Toggle review / favorite
router.patch('/:id/mark', authMiddleware, (req, res) => {
  const { field } = req.body; // 'review' or 'favorite'
  if (!['review','favorite'].includes(field)) return res.status(400).json({ error: 'Campo inválido' });
  const db = getDB();
  const existing = db.prepare('SELECT id, review, favorite FROM user_answers WHERE user_id = ? AND question_id = ?').get(req.user.id, req.params.id);
  if (!existing) {
    db.prepare(`INSERT INTO user_answers (user_id, question_id, answer, correct, ${field}) VALUES (?,?,?,?,1)`).run(req.user.id, req.params.id, -1, 0);
  } else {
    const newVal = existing[field] ? 0 : 1;
    db.prepare(`UPDATE user_answers SET ${field} = ? WHERE id = ?`).run(newVal, existing.id);
  }
  res.json({ success: true });
});

// Stats for user
router.get('/stats/me', authMiddleware, (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_answered,
      SUM(correct) as total_correct,
      SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END) as total_wrong,
      ROUND(AVG(correct) * 100, 1) as accuracy,
      discipline
    FROM user_answers ua
    JOIN questions q ON q.id = ua.question_id
    WHERE ua.user_id = ?
    GROUP BY discipline
  `).all(req.user.id);
  res.json({ stats });
});

module.exports = router;
