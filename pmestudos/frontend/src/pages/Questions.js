import { useState, useEffect, useCallback } from 'react';
import { questionsAPI, aiAPI } from '../api';
import { Loader, Empty } from '../components/UI';

const DIFFICULTIES = ['Fácil','Médio','Difícil'];
const DISCIPLINES   = ['Português','Matemática','Direito Constitucional','Direito Penal','História','Geografia','Informática','Física','Raciocínio Lógico','Atualidades'];

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset]       = useState(0);
  const LIMIT = 5;

  const [filter, setFilter] = useState({ discipline:'', difficulty:'', search:'' });
  const [answers, setAnswers]   = useState({});   // qId -> optIdx
  const [revealed, setRevealed] = useState({});   // qId -> {correct, explanation}
  const [aiExp, setAiExp]       = useState({});   // qId -> text
  const [aiLoad, setAiLoad]     = useState({});   // qId -> bool
  const [marks, setMarks]       = useState({});   // qId -> {review, favorite}

  const fetchQ = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const r = await questionsAPI.list({ ...filter, limit: LIMIT, offset: off });
      if (reset) { setQuestions(r.data.questions); setOffset(LIMIT); }
      else        { setQuestions(q => [...q, ...r.data.questions]); setOffset(o => o + LIMIT); }
      setTotal(r.data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [filter, offset]);

  useEffect(() => { fetchQ(true); }, [filter]); // eslint-disable-line

  const selectAnswer = (qId, idx) => {
    if (revealed[qId]) return;
    setAnswers(a => ({ ...a, [qId]: idx }));
  };

  const confirmAnswer = async (q) => {
    const chosen = answers[q.id];
    if (chosen === undefined) return;
    try {
      const r = await questionsAPI.answer(q.id, { answer: chosen });
      setRevealed(rv => ({ ...rv, [q.id]: { correct: r.data.correct, explanation: r.data.explanation, correct_answer: r.data.correct_answer } }));
    } catch {
      setRevealed(rv => ({ ...rv, [q.id]: { correct: chosen === q.correct, explanation: q.explanation, correct_answer: q.correct } }));
    }
  };

  const fetchAI = async (q) => {
    if (aiExp[q.id] || aiLoad[q.id]) return;
    setAiLoad(l => ({ ...l, [q.id]: true }));
    try {
      const r = await aiAPI.explain(q.id);
      setAiExp(e => ({ ...e, [q.id]: r.data.explanation }));
    } catch {
      setAiExp(e => ({ ...e, [q.id]: '❌ Erro ao carregar explicação. Verifique a chave da API.' }));
    }
    setAiLoad(l => ({ ...l, [q.id]: false }));
  };

  const toggleMark = async (q, field) => {
    try {
      await questionsAPI.mark(q.id, field);
      setMarks(m => ({ ...m, [q.id]: { ...m[q.id], [field]: !m[q.id]?.[field] } }));
    } catch (e) { console.error(e); }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Banco de Questões ❓</h1>
          <p>{total} questões disponíveis • Filtre por disciplina, dificuldade e ano</p>
        </div>
      </div>

      {/* Filters */}
      <div className="q-filters">
        <select className="form-select" style={{ width:'auto' }} value={filter.discipline} onChange={e => setFilter(f => ({ ...f, discipline: e.target.value }))}>
          <option value="">Todas as Disciplinas</option>
          {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="form-select" style={{ width:'auto' }} value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}>
          <option value="">Qualquer Dificuldade</option>
          {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
        </select>
        <input className="form-input" style={{ width:220 }} placeholder="🔍 Buscar questão..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <button className="btn btn-outline btn-sm" onClick={() => setFilter({ discipline:'', difficulty:'', search:'' })}>Limpar</button>
      </div>

      {questions.length === 0 && <Empty icon="🔍" title="Nenhuma questão encontrada" desc="Tente outros filtros." />}

      {questions.map(q => {
        const chosen   = answers[q.id];
        const rev      = revealed[q.id];
        const mark     = marks[q.id] || {};
        const diffColor = { 'Fácil':'#27AE60','Médio':'#F39C12','Difícil':'#E74C3C' }[q.difficulty] || '#0B1E3D';

        return (
          <div key={q.id} className="q-card">
            <div className="q-meta">
              <span className="badge badge-blue">{q.discipline}</span>
              <span className="badge" style={{ background: diffColor+'20', color: diffColor }}>{q.difficulty}</span>
              {q.year   && <span className="badge badge-gray">{q.year}</span>}
              {q.source && <span className="badge badge-gray">{q.source}</span>}
              {q.ai_generated ? <span className="badge badge-gold">🤖 IA</span> : null}
            </div>
            <p className="q-text">{q.text}</p>
            <div className="q-options">
              {q.options.map((opt, i) => {
                let cls = 'q-opt';
                if (rev) {
                  if (i === rev.correct_answer) cls += ' correct';
                  else if (i === chosen && i !== rev.correct_answer) cls += ' wrong';
                } else if (chosen === i) cls += ' selected';
                return (
                  <div key={i} className={cls} onClick={() => selectAnswer(q.id, i)}>
                    <div className="q-opt-letter">{String.fromCharCode(65+i)}</div>
                    {opt}
                  </div>
                );
              })}
            </div>

            {!rev && chosen !== undefined && (
              <div className="q-actions">
                <button className="btn btn-primary btn-sm" onClick={() => confirmAnswer(q)}>Confirmar Resposta</button>
                <button className="btn btn-outline btn-sm" onClick={() => setAnswers(a => ({ ...a, [q.id]: undefined }))}>Limpar</button>
              </div>
            )}

            {rev && (
              <>
                {/* Result banner */}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background: rev.correct ? '#E9F7EF' : '#FDEDEC', marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{rev.correct ? '✅' : '❌'}</span>
                  <span style={{ fontWeight:700, color: rev.correct ? '#27AE60' : '#E53E3E', fontSize:14 }}>
                    {rev.correct ? 'Resposta correta! Parabéns!' : `Resposta incorreta. A correta é ${String.fromCharCode(65 + (rev.correct_answer ?? q.correct))}`}
                  </span>
                </div>
                {/* Explanation */}
                {rev.explanation && (
                  <div className="q-explain">
                    <strong>💡 Explicação:</strong> {rev.explanation}
                  </div>
                )}
                {/* AI explanation */}
                {aiExp[q.id] && (
                  <div className="q-explain q-ai-explain">
                    <strong>🤖 Professor IA:</strong> {aiExp[q.id]}
                  </div>
                )}
                <div className="q-actions" style={{ marginTop:12 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => fetchAI(q)} disabled={aiLoad[q.id]}>
                    {aiLoad[q.id] ? '⏳ Gerando...' : aiExp[q.id] ? '🔄 Nova explicação IA' : '🤖 Explicar com IA'}
                  </button>
                  <button className={`btn btn-sm ${mark.review ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleMark(q,'review')}>
                    {mark.review ? '🔖 Em Revisão' : '🔖 Marcar Revisão'}
                  </button>
                  <button className={`btn btn-sm ${mark.favorite ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleMark(q,'favorite')}>
                    {mark.favorite ? '⭐ Favoritado' : '⭐ Favoritar'}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {questions.length < total && (
        <div style={{ textAlign:'center', marginTop:20 }}>
          <button className="btn btn-outline" onClick={() => fetchQ(false)} disabled={loadingMore}>
            {loadingMore ? '⏳ Carregando...' : `Carregar mais questões (${total - questions.length} restantes)`}
          </button>
        </div>
      )}
    </div>
  );
}
