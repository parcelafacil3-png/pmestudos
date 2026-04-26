const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getDB } = require('../models/database');
const router = express.Router();

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(messages, system, max_tokens = 2000) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY não configurada');
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens, system, messages })
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content.map(c => c.text || '').join('');
}

// Explain a question using AI
router.post('/explain/:questionId', authMiddleware, async (req, res) => {
  const db = getDB();
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.questionId);
  if (!q) return res.status(404).json({ error: 'Questão não encontrada' });
  const options = JSON.parse(q.options);
  const system = 'Você é um professor especialista em concursos para Polícia Militar, didático e objetivo.';
  const userMsg = `Explique detalhadamente esta questão de concurso PM:\n\nDisciplina: ${q.discipline}\nDificuldade: ${q.difficulty}\nAno: ${q.year || 'N/A'}\n\nQuestão: ${q.text}\n\nAlternativas:\n${options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`).join('\n')}\n\nGabarito: Alternativa ${String.fromCharCode(65+q.correct)} - ${options[q.correct]}\n\nDê uma explicação completa, didática e clara em português. Cite a lei ou artigo quando aplicável. Máximo 300 palavras.`;
  try {
    const explanation = await callClaude([{ role: 'user', content: userMsg }], system, 600);
    res.json({ explanation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate new questions for a discipline (admin)
router.post('/generate-questions', authMiddleware, adminMiddleware, async (req, res) => {
  const { discipline, difficulty = 'Médio', count = 5, topic } = req.body;
  if (!discipline) return res.status(400).json({ error: 'Disciplina obrigatória' });
  const system = 'Você é um especialista em elaboração de questões de concurso para Polícia Militar. Gere questões originais, realistas e didáticas. Responda APENAS em JSON válido, sem markdown.';
  const userMsg = `Gere ${count} questões de múltipla escolha sobre ${discipline}${topic ? ` - tópico: ${topic}` : ''} com dificuldade ${difficulty} para concurso de PM.\n\nResponda APENAS com um array JSON no formato:\n[\n  {\n    "text": "Enunciado da questão",\n    "options": ["A", "B", "C", "D", "E"],\n    "correct": 0,\n    "explanation": "Explicação detalhada"\n  }\n]\n\nCorrect é o índice (0-4) da alternativa correta. Gere exatamente ${count} questões.`;
  try {
    const raw = await callClaude([{ role: 'user', content: userMsg }], system, 3000);
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    const db = getDB();
    const stmt = db.prepare(`INSERT INTO questions (discipline, difficulty, text, options, correct, explanation, ai_generated) VALUES (?,?,?,?,?,?,1)`);
    const inserted = [];
    for (const q of questions) {
      const r = stmt.run(discipline, difficulty, q.text, JSON.stringify(q.options), q.correct, q.explanation);
      inserted.push(r.lastInsertRowid);
    }
    res.json({ success: true, generated: questions.length, ids: inserted });
  } catch (e) {
    res.status(500).json({ error: `Falha ao gerar questões: ${e.message}` });
  }
});

// Extract questions from PDF text (admin)
router.post('/extract-from-pdf', authMiddleware, adminMiddleware, async (req, res) => {
  const { text, discipline, pdf_id } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto do PDF obrigatório' });
  const system = 'Você é um especialista em extração de questões de concurso. Extraia questões do texto e responda APENAS em JSON válido.';
  const userMsg = `Extraia todas as questões de múltipla escolha do texto abaixo e retorne em formato JSON.\n\nTexto do PDF:\n${text.slice(0, 6000)}\n\nRetorne APENAS um array JSON:\n[\n  {\n    "text": "Enunciado",\n    "options": ["A","B","C","D","E"],\n    "correct": 0,\n    "explanation": "Breve explicação"\n  }\n]\n\nSe não houver questões claras, retorne [].`;
  try {
    const raw = await callClaude([{ role: 'user', content: userMsg }], system, 4000);
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    const db = getDB();
    const stmt = db.prepare(`INSERT INTO questions (discipline, difficulty, text, options, correct, explanation, pdf_id, ai_generated) VALUES (?,?,?,?,?,?,?,1)`);
    let inserted = 0;
    for (const q of questions) {
      if (q.text && q.options?.length >= 2) {
        stmt.run(discipline || 'Geral', 'Médio', q.text, JSON.stringify(q.options), q.correct || 0, q.explanation || '', pdf_id || null);
        inserted++;
      }
    }
    if (pdf_id) {
      db.prepare("UPDATE pdf_uploads SET status='done', questions_extracted=? WHERE id=?").run(inserted, pdf_id);
    }
    res.json({ success: true, extracted: inserted, total_found: questions.length });
  } catch (e) {
    if (pdf_id) getDB().prepare("UPDATE pdf_uploads SET status='error', error_msg=? WHERE id=?").run(e.message, pdf_id);
    res.status(500).json({ error: `Falha na extração: ${e.message}` });
  }
});

// AI Study Chat
router.post('/chat', authMiddleware, async (req, res) => {
  const { message, discipline, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });
  const system = `Você é um professor assistente da plataforma PMEstudos, especializado em concursos para Polícia Militar. ${discipline ? `O aluno está estudando ${discipline}.` : ''} Seja objetivo, didático e encorajador. Responda em português.`;
  const messages = [...history.slice(-6), { role: 'user', content: message }];
  try {
    const reply = await callClaude(messages, system, 800);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
