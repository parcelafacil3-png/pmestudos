import { useState, useEffect } from 'react';
import { adminAPI, aiAPI, pdfsAPI } from '../api';
import { Loader, Modal, ConfirmModal, Empty, Badge } from '../components/UI';

const TABS = ['Dashboard','Usuários','Questões','PDFs & IA','Planos & Pagamentos','Configurações'];
const DISCIPLINES = ['Português','Matemática','Direito Constitucional','Direito Penal','História','Geografia','Informática','Física','Raciocínio Lógico','Atualidades'];

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  const [toast, setToast] = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>🛡️ Painel Administrativo</h1>
          <p>Gerencie usuários, questões, planos e configurações da plataforma</p>
        </div>
      </div>
      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Dashboard'            && <AdminDash />}
      {tab === 'Usuários'             && <AdminUsers notify={notify} />}
      {tab === 'Questões'             && <AdminQuestions notify={notify} />}
      {tab === 'PDFs & IA'            && <AdminPDFs notify={notify} />}
      {tab === 'Planos & Pagamentos'  && <AdminPlans notify={notify} />}
      {tab === 'Configurações'        && <AdminSettings notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ── Admin Dashboard ─────────────────────────────────────────────── */
function AdminDash() {
  const [data, setData] = useState(null);
  useEffect(() => { adminAPI.dashboard().then(r => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loader />;
  return (
    <div>
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { label:'Total de Alunos', value:data.users,     icon:'👥', c:'blue' },
          { label:'Questões Ativas', value:data.questions, icon:'❓', c:'gold' },
          { label:'Respostas Dadas', value:data.answers,   icon:'✅', c:'green' },
          { label:'PDFs Enviados',   value:data.pdfs,      icon:'📄', c:'red' },
        ].map((s,i) => (
          <div key={i} className={`stat-card ${s.c}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">👥 Distribuição de Planos</div>
          {[['free','Grátis','gray'],['pro','Pro','gold'],['elite','Elite','blue']].map(([k,label,c]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <Badge color={c}>{label}</Badge>
              <div style={{ flex:1, height:8, background:'#E8EFF8', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', background: c==='gold'?'#C9A84C': c==='blue'?'#2E5088':'#8FA3BF', borderRadius:4, width:`${Math.max(4,(data.plans[k] / (data.users||1)) * 100)}%` }} />
              </div>
              <span style={{ fontWeight:700, fontSize:14, color:'#0B1E3D', width:30, textAlign:'right' }}>{data.plans[k]}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">📚 Questões por Disciplina</div>
          <div style={{ maxHeight:240, overflowY:'auto' }}>
            {data.by_discipline.map(d => (
              <div key={d.discipline} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #E8EFF8', fontSize:13 }}>
                <span style={{ color:'#0B1E3D', fontWeight:600 }}>{d.discipline}</span>
                <span style={{ color:'#C9A84C', fontWeight:700 }}>{d.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">👥 Alunos Recentes</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Plano</th><th>Cadastro</th></tr></thead>
            <tbody>
              {data.recent_users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight:600 }}>{u.name}</td>
                  <td style={{ color:'#4A6080' }}>{u.email}</td>
                  <td><Badge color={u.plan==='pro'?'gold':u.plan==='elite'?'blue':'gray'}>{u.plan}</Badge></td>
                  <td style={{ color:'#8FA3BF', fontSize:12 }}>{u.created_at?.slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Users ───────────────────────────────────────────────────────── */
function AdminUsers({ notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { adminAPI.users().then(r => setUsers(r.data.users)).finally(() => setLoading(false)); }, []);

  const savePlan = async (id, plan) => {
    await adminAPI.updateUser(id, { plan });
    setUsers(u => u.map(x => x.id === id ? { ...x, plan } : x));
    notify('✅ Plano atualizado!');
    setEditing(null);
  };
  const deleteUser = async (id) => {
    await adminAPI.deleteUser(id);
    setUsers(u => u.filter(x => x.id !== id));
    notify('🗑️ Usuário removido');
  };

  if (loading) return <Loader />;
  return (
    <div className="card">
      <div className="card-title">👥 Gerenciar Usuários ({users.length})</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Nome</th><th>E-mail</th><th>Plano</th><th>Cadastro</th><th>Ações</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ color:'#8FA3BF', fontSize:12 }}>{u.id}</td>
                <td style={{ fontWeight:600 }}>{u.name}</td>
                <td style={{ color:'#4A6080' }}>{u.email}</td>
                <td>
                  {editing === u.id ? (
                    <select className="form-select" style={{ width:110, padding:'4px 8px', fontSize:13 }} defaultValue={u.plan}
                      onChange={e => savePlan(u.id, e.target.value)}>
                      {['free','pro','elite'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <Badge color={u.plan==='pro'?'gold':u.plan==='elite'?'blue':'gray'}>{u.plan}</Badge>
                  )}
                </td>
                <td style={{ fontSize:12, color:'#8FA3BF' }}>{u.created_at?.slice(0,10)}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(editing === u.id ? null : u.id)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(u.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal open={!!confirm} msg="Remover este usuário permanentemente?" onConfirm={() => deleteUser(confirm)} onClose={() => setConfirm(null)} />
    </div>
  );
}

/* ── Questions ───────────────────────────────────────────────────── */
function AdminQuestions({ notify }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ discipline:'Português', difficulty:'Médio', count:5, topic:'' });
  const [showGen, setShowGen] = useState(false);

  const load = () => adminAPI.questions().then(r => setQuestions(r.data.questions)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const deleteQ = async (id) => {
    await adminAPI.deleteQuestion(id);
    setQuestions(q => q.filter(x => x.id !== id));
    notify('🗑️ Questão removida');
  };

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const r = await aiAPI.generateQuestions(genForm);
      notify(`✅ ${r.data.generated} questões geradas com IA!`);
      setShowGen(false);
      load();
    } catch (e) {
      notify('❌ Erro ao gerar: ' + (e.response?.data?.error || e.message));
    }
    setGenerating(false);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ Nova Questão</button>
        <button className="btn btn-gold" onClick={() => setShowGen(true)}>🤖 Gerar com IA</button>
      </div>

      {/* AI Generation Modal */}
      <Modal open={showGen} onClose={() => setShowGen(false)} title="🤖 Gerar Questões com IA"
        footer={<>
          <button className="btn btn-outline btn-sm" onClick={() => setShowGen(false)}>Cancelar</button>
          <button className="btn btn-gold btn-sm" onClick={generateWithAI} disabled={generating}>
            {generating ? '⏳ Gerando...' : `Gerar ${genForm.count} Questões`}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Disciplina</label>
          <select className="form-select" value={genForm.discipline} onChange={e => setGenForm(f => ({ ...f, discipline: e.target.value }))}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Dificuldade</label>
          <select className="form-select" value={genForm.difficulty} onChange={e => setGenForm(f => ({ ...f, difficulty: e.target.value }))}>
            {['Fácil','Médio','Difícil'].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tópico específico (opcional)</label>
          <input className="form-input" placeholder="Ex: Regra de três, Crase, Art. 5º CF..." value={genForm.topic} onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Quantidade (1–10)</label>
          <input className="form-input" type="number" min={1} max={10} value={genForm.count} onChange={e => setGenForm(f => ({ ...f, count: parseInt(e.target.value) }))} />
        </div>
        <div style={{ background:'#EBF5FB', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1A5276' }}>
          💡 A IA vai gerar questões originais no estilo dos concursos PM e adicioná-las automaticamente ao banco.
        </div>
      </Modal>

      {/* Add Question Modal */}
      <AddQuestionModal open={showAdd} onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); load(); notify('✅ Questão criada!'); }} />

      <div className="card">
        <div className="card-title">❓ Questões ({questions.length})</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Disciplina</th><th>Dificuldade</th><th>Enunciado</th><th>Origem</th><th>Ações</th></tr></thead>
            <tbody>
              {questions.slice(0,50).map(q => (
                <tr key={q.id}>
                  <td style={{ color:'#8FA3BF', fontSize:12 }}>{q.id}</td>
                  <td><span style={{ fontSize:12, fontWeight:700 }}>{q.discipline}</span></td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6,
                      background: q.difficulty==='Fácil'?'#E9F7EF':q.difficulty==='Médio'?'#FEF9E7':'#FDEDEC',
                      color: q.difficulty==='Fácil'?'#27AE60':q.difficulty==='Médio'?'#F39C12':'#E53E3E' }}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td style={{ maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>{q.text}</td>
                  <td>{q.ai_generated ? <Badge color="gold">🤖 IA</Badge> : <Badge color="gray">{q.source || 'Manual'}</Badge>}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteQ(q.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddQuestionModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ discipline:'Português', difficulty:'Médio', year:'', source:'', text:'', options:['','','','',''], correct:0, explanation:'' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setOpt = (i, v) => setForm(f => { const o = [...f.options]; o[i] = v; return { ...f, options: o }; });
  const save = async () => {
    if (!form.text || form.options.filter(Boolean).length < 2) return alert('Preencha enunciado e ao menos 2 alternativas');
    await adminAPI.createQuestion({ ...form, options: form.options.filter(Boolean) });
    onSave();
  };
  return (
    <Modal open={open} onClose={onClose} title="➕ Nova Questão Manual"
      footer={<><button className="btn btn-outline btn-sm" onClick={onClose}>Cancelar</button><button className="btn btn-primary btn-sm" onClick={save}>Salvar Questão</button></>}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="form-group"><label className="form-label">Disciplina</label>
          <select className="form-select" value={form.discipline} onChange={e => set('discipline',e.target.value)}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select></div>
        <div className="form-group"><label className="form-label">Dificuldade</label>
          <select className="form-select" value={form.difficulty} onChange={e => set('difficulty',e.target.value)}>
            {['Fácil','Médio','Difícil'].map(d => <option key={d}>{d}</option>)}
          </select></div>
        <div className="form-group"><label className="form-label">Ano</label><input className="form-input" value={form.year} onChange={e => set('year',e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Banca</label><input className="form-input" value={form.source} onChange={e => set('source',e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Enunciado *</label>
        <textarea className="form-textarea" value={form.text} onChange={e => set('text',e.target.value)} placeholder="Digite o enunciado da questão..." /></div>
      <div className="form-group"><label className="form-label">Alternativas (marque a correta)</label>
        {form.options.map((o, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <input type="radio" name="correct" checked={form.correct===i} onChange={() => set('correct',i)} />
            <span style={{ fontWeight:700, color:'#0B1E3D', width:20 }}>{String.fromCharCode(65+i)})</span>
            <input className="form-input" style={{ flex:1 }} placeholder={`Alternativa ${String.fromCharCode(65+i)}`} value={o} onChange={e => setOpt(i,e.target.value)} />
          </div>
        ))}
      </div>
      <div className="form-group"><label className="form-label">Explicação / Gabarito Comentado</label>
        <textarea className="form-textarea" style={{ minHeight:70 }} value={form.explanation} onChange={e => set('explanation',e.target.value)} /></div>
    </Modal>
  );
}

/* ── PDFs & AI ───────────────────────────────────────────────────── */
function AdminPDFs({ notify }) {
  const [pdfs, setPdfs]       = useState([]);
  const [file, setFile]       = useState(null);
  const [disc, setDisc]       = useState('Português');
  const [subj, setSubj]       = useState('');
  const [uploading, setUpl]   = useState(false);
  const [extracting, setExt]  = useState({});
  const [pdfText, setPdfText] = useState({});

  const load = () => pdfsAPI.list().then(r => setPdfs(r.data.pdfs)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('pdf', file); fd.append('discipline', disc); fd.append('subject', subj);
    setUpl(true);
    try {
      const r = await pdfsAPI.upload(fd);
      notify('✅ PDF processado!');
      setPdfText(t => ({ ...t, [r.data.pdf_id]: r.data.text }));
      setFile(null);
      load();
    } catch (e) { notify('❌ Erro: ' + (e.response?.data?.error || e.message)); }
    setUpl(false);
  };

  const extractQuestions = async (pdf) => {
    const text = pdfText[pdf.id];
    if (!text) { notify('⚠️ Texto do PDF não disponível'); return; }
    setExt(e => ({ ...e, [pdf.id]: true }));
    try {
      const r = await aiAPI.extractFromPdf({ text, discipline: pdf.discipline, pdf_id: pdf.id });
      notify(`✅ ${r.data.extracted} questões extraídas!`);
      load();
    } catch (e) { notify('❌ Erro: ' + (e.response?.data?.error || e.message)); }
    setExt(e => ({ ...e, [pdf.id]: false }));
  };

  return (
    <div>
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title">📤 Upload de PDF</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div className="form-group">
            <label className="form-label">Disciplina</label>
            <select className="form-select" value={disc} onChange={e => setDisc(e.target.value)}>
              {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assunto / Tópico</label>
            <input className="form-input" placeholder="Ex: Questões semanais – Semana 1" value={subj} onChange={e => setSubj(e.target.value)} />
          </div>
        </div>
        <div style={{ border:'2px dashed #D0DCE8', borderRadius:12, padding:'28px', textAlign:'center', marginBottom:12, cursor:'pointer', background:'#F4F7FC' }}
          onClick={() => document.getElementById('pdf-input').click()}>
          <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
          <div style={{ fontWeight:700, color:'#0B1E3D', marginBottom:4 }}>{file ? file.name : 'Clique para selecionar o PDF'}</div>
          <div style={{ fontSize:12, color:'#8FA3BF' }}>Máximo 20MB</div>
          <input id="pdf-input" type="file" accept=".pdf" hidden onChange={e => setFile(e.target.files[0])} />
        </div>
        <button className="btn btn-primary" onClick={upload} disabled={!file || uploading}>
          {uploading ? '⏳ Processando...' : '📤 Fazer Upload e Processar'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">📚 PDFs Enviados</div>
        {pdfs.length === 0 ? <Empty icon="📄" title="Nenhum PDF enviado ainda" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Arquivo</th><th>Disciplina</th><th>Assunto</th><th>Status</th><th>Questões</th><th>Ações</th></tr></thead>
              <tbody>
                {pdfs.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize:13 }}>{p.original_name}</td>
                    <td><Badge color="blue">{p.discipline}</Badge></td>
                    <td style={{ fontSize:13, color:'#4A6080' }}>{p.subject || '—'}</td>
                    <td>
                      <Badge color={p.status==='done'?'green':p.status==='error'?'red':'gray'}>
                        {p.status==='done'?'✅ Concluído':p.status==='error'?'❌ Erro':p.status==='extracted'?'📝 Extraído':'⏳ Processando'}
                      </Badge>
                    </td>
                    <td style={{ fontWeight:700, color:'#C9A84C' }}>{p.questions_extracted || 0}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {p.status === 'extracted' && (
                          <button className="btn btn-gold btn-sm" onClick={() => extractQuestions(p)} disabled={extracting[p.id]}>
                            {extracting[p.id] ? '⏳' : '🤖 Extrair com IA'}
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={async () => { await pdfsAPI.remove(p.id); load(); notify('🗑️ PDF removido'); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Plans & Payment ─────────────────────────────────────────────── */
function AdminPlans({ notify }) {
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = () => adminAPI.plans().then(r => setPlans(r.data.plans));
  useEffect(() => { load(); }, []);

  const save = async (id, data) => {
    setSaving(true);
    await adminAPI.updatePlan(id, data);
    notify('✅ Plano salvo!');
    setEditing(null);
    load();
    setSaving(false);
  };

  return (
    <div>
      <div style={{ background:'#EBF5FB', borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:14, color:'#1A5276', fontWeight:500 }}>
        💳 <strong>Como funciona:</strong> Cole o link de pagamento do Hotmart, Kiwify, Eduzz ou qualquer plataforma. O botão de compra na landing page usará automaticamente esse link.
      </div>
      {plans.map(p => (
        <div key={p.id} className="card" style={{ marginBottom:14 }}>
          {editing === p.id ? (
            <EditPlanForm plan={p} onSave={(d) => save(p.id, d)} onCancel={() => setEditing(null)} saving={saving} />
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <h3 style={{ fontSize:18, fontWeight:800, color:'#0B1E3D' }}>{p.name}</h3>
                  <Badge color={p.highlighted?'gold':'gray'}>{p.highlighted?'⭐ Destaque':'Normal'}</Badge>
                  <Badge color={p.active?'green':'red'}>{p.active?'Ativo':'Inativo'}</Badge>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:'#0B1E3D', marginBottom:4 }}>
                  {p.price_cents === 0 ? 'Grátis' : `R$ ${(p.price_cents/100).toFixed(2)}/mês`}
                </div>
                <div style={{ fontSize:13, color:'#4A6080', marginBottom:8 }}>
                  🔗 Link: {p.payment_link ? <a href={p.payment_link} target="_blank" rel="noreferrer" style={{ color:'#2E5088' }}>{p.payment_link.slice(0,60)}…</a> : <span style={{ color:'#8FA3BF' }}>Não configurado</span>}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(p.features||[]).map((f,i) => <Badge key={i} color="gray">{f}</Badge>)}
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setEditing(p.id)}>✏️ Editar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditPlanForm({ plan, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: plan.name, price_cents: plan.price_cents, period: plan.period,
    payment_link: plan.payment_link || '', active: plan.active, highlighted: plan.highlighted,
    features: (plan.features || []).join('\n'),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => onSave({ ...form, features: form.features.split('\n').filter(Boolean), price_cents: parseInt(form.price_cents) });

  return (
    <div>
      <div className="card-title" style={{ marginBottom:14 }}>✏️ Editando: {plan.name}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={form.name} onChange={e => set('name',e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Preço (centavos)</label><input className="form-input" type="number" value={form.price_cents} onChange={e => set('price_cents',e.target.value)} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">🔗 Link de Pagamento (Hotmart, Kiwify, Eduzz…)</label>
        <input className="form-input" placeholder="https://pay.hotmart.com/seu-produto" value={form.payment_link} onChange={e => set('payment_link',e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Benefícios (um por linha)</label>
        <textarea className="form-textarea" value={form.features} onChange={e => set('features',e.target.value)} />
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:14 }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600, fontSize:14 }}>
          <input type="checkbox" checked={!!form.active} onChange={e => set('active', e.target.checked ? 1 : 0)} /> Ativo
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600, fontSize:14 }}>
          <input type="checkbox" checked={!!form.highlighted} onChange={e => set('highlighted', e.target.checked ? 1 : 0)} /> ⭐ Plano em Destaque
        </label>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-gold btn-sm" onClick={submit} disabled={saving}>{saving?'Salvando…':'💾 Salvar'}</button>
      </div>
    </div>
  );
}

/* ── Settings ────────────────────────────────────────────────────── */
function AdminSettings({ notify }) {
  const [form, setForm] = useState({ site_name:'PMEstudos', site_desc:'Plataforma de estudos para PM', admin_email:'', anthropic_key_configured:'false' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.settings().then(r => setForm(f => ({ ...f, ...r.data.settings }))).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    await adminAPI.saveSettings(form);
    notify('✅ Configurações salvas!');
    setSaving(false);
  };

  return (
    <div className="card">
      <div className="card-title">⚙️ Configurações da Plataforma</div>
      {[
        ['site_name','Nome da Plataforma','text','PMEstudos'],
        ['site_desc','Descrição/Tagline','text','Plataforma de estudos para PM'],
        ['admin_email','E-mail do Admin','email','admin@pmestudos.com'],
      ].map(([k, label, type, ph]) => (
        <div key={k} className="form-group">
          <label className="form-label">{label}</label>
          <input className="form-input" type={type} placeholder={ph} value={form[k]||''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
        </div>
      ))}
      <div style={{ background:'#FEF9E7', borderRadius:10, padding:'14px', marginBottom:16, border:'1px solid #F39C12' }}>
        <div style={{ fontWeight:700, color:'#784212', marginBottom:6 }}>🔑 Chave da API Anthropic (IA)</div>
        <div style={{ fontSize:13, color:'#784212' }}>A chave da API deve ser configurada via variável de ambiente <code style={{ background:'rgba(0,0,0,0.08)', padding:'2px 6px', borderRadius:4 }}>ANTHROPIC_API_KEY</code> no arquivo <code>.env</code> do backend. Não a exponha nesta tela.</div>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Salvando…':'💾 Salvar Configurações'}</button>
    </div>
  );
}
