const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../models/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha mínima 6 caracteres' });
  const db = getDB();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hash);
  const user = db.prepare('SELECT id, name, email, role, plan FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Update profile
router.put('/me', authMiddleware, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const db = getDB();
  if (newPassword) {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user.id);
  }
  if (name) db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, req.user.id);
  const updated = db.prepare('SELECT id, name, email, role, plan FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updated });
});

module.exports = router;
