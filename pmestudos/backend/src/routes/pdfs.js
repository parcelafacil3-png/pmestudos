const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { getDB } = require('../models/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads/pdfs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Apenas arquivos PDF são permitidos'));
}});

// Upload PDF (admin)
router.post('/upload', authMiddleware, adminMiddleware, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const { discipline, subject, week } = req.body;
  const db = getDB();
  const result = db.prepare(`INSERT INTO pdf_uploads (filename, original_name, discipline, subject, week, status, uploaded_by) VALUES (?,?,?,?,?,'processing',?)`)
    .run(req.file.filename, req.file.originalname, discipline, subject, week, req.user.id);
  const pdfId = result.lastInsertRowid;

  // Parse PDF asynchronously
  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(buffer);
    db.prepare("UPDATE pdf_uploads SET status='extracted' WHERE id=?").run(pdfId);
    res.json({ success: true, pdf_id: pdfId, text: data.text.slice(0, 8000), pages: data.numpages, filename: req.file.filename });
  } catch (e) {
    db.prepare("UPDATE pdf_uploads SET status='error', error_msg=? WHERE id=?").run(e.message, pdfId);
    res.status(500).json({ error: 'Falha ao processar PDF', pdf_id: pdfId });
  }
});

// List PDFs (admin)
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDB();
  const pdfs = db.prepare(`SELECT p.*, u.name as uploader FROM pdf_uploads p LEFT JOIN users u ON u.id = p.uploaded_by ORDER BY p.created_at DESC`).all();
  res.json({ pdfs });
});

// Delete PDF (admin)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDB();
  const pdf = db.prepare('SELECT filename FROM pdf_uploads WHERE id = ?').get(req.params.id);
  if (pdf) {
    const filePath = path.join(uploadsDir, pdf.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM pdf_uploads WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
