const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const blocks = getDB().prepare('SELECT * FROM calendar_blocks WHERE user_id = ? ORDER BY day_of_week, time_slot').all(req.user.id);
  res.json({ blocks });
});

router.post('/', (req, res) => {
  const { discipline, day_of_week, time_slot, duration_min, block_type, color_class } = req.body;
  const r = getDB().prepare('INSERT INTO calendar_blocks (user_id,discipline,day_of_week,time_slot,duration_min,block_type,color_class) VALUES (?,?,?,?,?,?,?)')
    .run(req.user.id, discipline, day_of_week, time_slot, duration_min || 60, block_type || 'study', color_class || 'mat-port');
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { day_of_week, time_slot, discipline, duration_min } = req.body;
  getDB().prepare('UPDATE calendar_blocks SET day_of_week=COALESCE(?,day_of_week), time_slot=COALESCE(?,time_slot), discipline=COALESCE(?,discipline), duration_min=COALESCE(?,duration_min) WHERE id=? AND user_id=?')
    .run(day_of_week, time_slot, discipline, duration_min, req.params.id, req.user.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  getDB().prepare('DELETE FROM calendar_blocks WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
