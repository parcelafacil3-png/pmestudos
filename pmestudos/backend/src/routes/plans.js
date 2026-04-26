// plans.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/', (req, res) => {
  const plans = getDB().prepare('SELECT * FROM plans WHERE active = 1 ORDER BY price_cents ASC').all();
  res.json({ plans: plans.map(p => ({ ...p, features: JSON.parse(p.features || '[]') })) });
});

module.exports = router;
