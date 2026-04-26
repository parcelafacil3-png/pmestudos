const express = require('express');
const { getDB } = require('../models/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// ── Dashboard Stats ──
router.get('/dashboard', (req, res) => {
  const db = getDB();
  const stats = {
    users:     db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get().c,
    questions: db.prepare("SELECT COUNT(*) as c FROM questions WHERE active = 1").get().c,
    answers:   db.prepare("SELECT COUNT(*) as c FROM user_answers").get().c,
    pdfs:      db.prepare("SELECT COUNT(*) as c FROM pdf_uploads").get().c,
    plans: {
      free:  db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'free'").get().c,
      pro:   db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'").get().c,
      elite: db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'elite'").get().c,
    },
    recent_users: db.prepare("SELECT id, name, email, plan, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 8").all(),
    by_discipline: db.prepare("SELECT discipline, COUNT(*) as c FROM questions WHERE active=1 GROUP BY discipline ORDER BY c DESC").all(),
  };
  res.json(stats);
});

// ── Users ──
router.get('/users', (req, res) => {
  const db = getDB();
  const users = db.prepare("SELECT id, name, email, role, plan, plan_expires_at, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ users });
});

router.put('/users/:id', (req, res) => {
  const { plan, role, plan_expires_at } = req.body;
  const db = getDB();
  db.prepare("UPDATE users SET plan=COALESCE(?,plan), role=COALESCE(?,role), plan_expires_at=COALESCE(?,plan_expires_at), updated_at=datetime('now') WHERE id=?")
    .run(plan, role, plan_expires_at, req.params.id);
  res.json({ success: true });
});

router.delete('/users/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM users WHERE id = ? AND role != ?').run(req.params.id, 'admin');
  res.json({ success: true });
});

// ── Questions ──
router.get('/questions', (req, res) => {
  const { discipline, ai_generated } = req.query;
  const db = getDB();
  let where = [];
  const params = [];
  if (discipline)    { where.push('discipline = ?'); params.push(discipline); }
  if (ai_generated !== undefined) { where.push('ai_generated = ?'); params.push(ai_generated === 'true' ? 1 : 0); }
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const questions = db.prepare(`SELECT * FROM questions ${whereStr} ORDER BY created_at DESC LIMIT 100`).all(params);
  res.json({ questions: questions.map(q => ({ ...q, options: JSON.parse(q.options) })) });
});

router.post('/questions', (req, res) => {
  const { discipline, difficulty, year, source, text, options, correct, explanation } = req.body;
  if (!text || !options || correct === undefined) return res.status(400).json({ error: 'Campos obrigatórios: text, options, correct' });
  const db = getDB();
  const result = db.prepare(`INSERT INTO questions (discipline, difficulty, year, source, text, options, correct, explanation) VALUES (?,?,?,?,?,?,?,?)`)
    .run(discipline, difficulty || 'Médio', year, source, text, JSON.stringify(options), correct, explanation);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/questions/:id', (req, res) => {
  const { text, options, correct, explanation, difficulty, active } = req.body;
  const db = getDB();
  db.prepare(`UPDATE questions SET text=COALESCE(?,text), options=COALESCE(?,options), correct=COALESCE(?,correct), explanation=COALESCE(?,explanation), difficulty=COALESCE(?,difficulty), active=COALESCE(?,active) WHERE id=?`)
    .run(text, options ? JSON.stringify(options) : null, correct, explanation, difficulty, active, req.params.id);
  res.json({ success: true });
});

router.delete('/questions/:id', (req, res) => {
  getDB().prepare('UPDATE questions SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Plans ──
router.get('/plans', (req, res) => {
  const plans = getDB().prepare('SELECT * FROM plans ORDER BY price_cents ASC').all();
  res.json({ plans: plans.map(p => ({ ...p, features: JSON.parse(p.features || '[]') })) });
});

router.put('/plans/:id', (req, res) => {
  const { name, price_cents, period, features, payment_link, active, highlighted } = req.body;
  const db = getDB();
  db.prepare(`UPDATE plans SET name=COALESCE(?,name), price_cents=COALESCE(?,price_cents), period=COALESCE(?,period), features=COALESCE(?,features), payment_link=COALESCE(?,payment_link), active=COALESCE(?,active), highlighted=COALESCE(?,highlighted) WHERE id=?`)
    .run(name, price_cents, period, features ? JSON.stringify(features) : null, payment_link, active, highlighted, req.params.id);
  res.json({ success: true });
});

// ── Settings ──
router.get('/settings', (req, res) => {
  const rows = getDB().prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({ settings });
});

router.put('/settings', (req, res) => {
  const db = getDB();
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  for (const [key, value] of Object.entries(req.body)) stmt.run(key, String(value));
  res.json({ success: true });
});

module.exports = router;
