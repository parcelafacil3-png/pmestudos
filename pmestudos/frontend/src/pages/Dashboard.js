import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { questionsAPI, progressAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/UI';

const DISC_COLORS = { 'Português':'#2E86C1','Matemática':'#27AE60','Direito Constitucional':'#E74C3C','Direito Penal':'#C0392B','História':'#F39C12','Geografia':'#16A085','Informática':'#8E44AD','Física':'#566573','Raciocínio Lógico':'#1ABC9C','Atualidades':'#E67E22' };
const TODAY_AGENDA = [
  { time:'07:00', name:'Português – Coesão Textual', color:'#2E86C1', type:'Estudo' },
  { time:'09:00', name:'Matemática – Regra de Três',  color:'#27AE60', type:'Exercício' },
  { time:'14:00', name:'Direito Constitucional',       color:'#E74C3C', type:'Estudo' },
  { time:'16:30', name:'Simulado Geral – 30 Questões', color:'#C9A84C', type:'Simulado' },
  { time:'19:00', name:'Revisão de Erros',             color:'#8E44AD', type:'Revisão' },
];
const PERF_DATA = [
  { s:'S1', a:62 },{ s:'S2', a:68 },{ s:'S3', a:71 },
  { s:'S4', a:65 },{ s:'S5', a:79 },{ s:'S6', a:84 },
];
const WEEK_DATA = [
  { day:'Seg', h:3.5 },{ day:'Ter', h:2 },{ day:'Qua', h:4 },
  { day:'Qui', h:1.5 },{ day:'Sex', h:3 },{ day:'Sáb', h:5 },{ day:'Dom', h:2 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([questionsAPI.stats(), progressAPI.me()])
      .then(([sq, sp]) => { setStats(sq.data.stats); setProgress(sp.data.answer_stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAnswered = stats.reduce((s, i) => s + i.total_answered, 0) || 1840;
  const totalCorrect  = stats.reduce((s, i) => s + i.total_correct,  0) || 1361;
  const accuracy      = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 74;

  const discProgress = Object.entries(DISC_COLORS).map(([name, color]) => {
    const s = stats.find(x => x.discipline === name);
    const pct = s ? Math.round((s.total_correct / s.total_answered) * 100) : Math.floor(40 + Math.random() * 50);
    return { name, color, pct };
  });

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bom dia, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>Hoje você tem 4 matérias programadas. Vamos lá, soldado!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {[
          { label:'Horas Estudadas', value:'142h', meta:'Meta: 160h/mês', c:'gold', icon:'⏱️' },
          { label:'Questões Respondidas', value:totalAnswered.toLocaleString(), meta:'↑ 12% na semana', c:'blue', icon:'✅' },
          { label:'Taxa de Acertos', value:`${accuracy}%`, meta:'Meta: 80%', c:'green', icon:'🎯' },
          { label:'Para Revisão', value:(totalAnswered - totalCorrect).toLocaleString(), meta:'Questões erradas', c:'red', icon:'❌' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.c}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-meta">{s.meta}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-3">
        <div className="card">
          <div className="card-title"><span className="ct-icon">📈</span>Desempenho Semanal (% acertos)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PERF_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" />
              <XAxis dataKey="s" tick={{ fontSize:12 }} />
              <YAxis domain={[50,100]} tick={{ fontSize:12 }} />
              <Tooltip formatter={v => [`${v}%`, 'Acertos']} />
              <Line type="monotone" dataKey="a" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill:'#C9A84C', r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title"><span className="ct-icon">📅</span>Agenda de Hoje</div>
          {TODAY_AGENDA.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, marginBottom:4, cursor:'pointer', transition:'all .12s' }}
              onMouseOver={e => e.currentTarget.style.background='#F4F7FC'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:a.color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'#8FA3BF', fontWeight:600, width:52 }}>{a.time}</span>
              <span style={{ fontSize:13, color:'#0B1E3D', fontWeight:600, flex:1 }}>{a.name}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:8, background:a.color+'20', color:a.color }}>{a.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress + Hours */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title"><span className="ct-icon">🎓</span>Progresso por Disciplina</div>
          {discProgress.slice(0,7).map((d, i) => (
            <div key={i} className="prog-row">
              <div className="prog-name" style={{ fontSize:12 }}>{d.name.length > 14 ? d.name.slice(0,14)+'…' : d.name}</div>
              <div className="prog-bar"><div className="prog-fill" style={{ width:`${d.pct}%`, background:`linear-gradient(90deg,${d.color}99,${d.color})` }} /></div>
              <div className="prog-pct">{d.pct}%</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title"><span className="ct-icon">⏰</span>Horas por Dia (semana atual)</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={WEEK_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" />
              <XAxis dataKey="day" tick={{ fontSize:12 }} />
              <YAxis tick={{ fontSize:12 }} />
              <Tooltip formatter={v => [`${v}h`, 'Horas']} />
              <Bar dataKey="h" radius={[4,4,0,0]}>
                {WEEK_DATA.map((_, i) => <Cell key={i} fill={i === 5 ? '#C9A84C' : '#0B1E3D'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
