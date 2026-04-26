import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, Sidebar } from './components/Nav';
import { Toast, Loader } from './components/UI';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import Admin from './pages/Admin';

// Lazy pages
function Calendar()    { return <PlaceholderPage icon="📅" title="Calendário de Estudos" desc="Arraste blocos para reorganizar seu cronograma semanal." badge="Em breve" />; }
function Library()     { return <PlaceholderPage icon="📚" title="Biblioteca de Conteúdos" desc="PDFs, vídeos e resumos organizados por disciplina." badge="Em breve" />; }
function Stats()       { return <PlaceholderPage icon="📊" title="Estatísticas" desc="Análise completa do seu desempenho." badge="Em breve" />; }
function Simulados()   { return <PlaceholderPage icon="📝" title="Simulados" desc="Realize simulados completos com questões das principais bancas." badge="Em breve" />; }
function Goals()       { return <PlaceholderPage icon="🎯" title="Metas Semanais" desc="Defina e acompanhe suas metas de estudo." badge="Em breve" />; }
function Settings()    { return <PlaceholderPage icon="⚙️" title="Configurações" desc="Personalize notificações e preferências." badge="Em breve" />; }
function Notifications(){ return <PlaceholderPage icon="🔔" title="Notificações" desc="Seus alertas e lembretes de estudo." badge="Em breve" />; }

function PlaceholderPage({ icon, title, desc, badge }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:20 }}>{icon}</div>
      <h2 style={{ fontSize:24, fontWeight:800, color:'#0B1E3D', marginBottom:8 }}>{title}</h2>
      <p style={{ color:'#4A6080', fontSize:15, marginBottom:20 }}>{desc}</p>
      {badge && <span style={{ background:'#0B1E3D', color:'#fff', padding:'8px 20px', borderRadius:8, fontWeight:700, fontSize:14 }}>{badge}</span>}
    </div>
  );
}

const PAGE_MAP = { dashboard: Dashboard, questions: Questions, calendar: Calendar, library: Library, stats: Stats, simulados: Simulados, goals: Goals, settings: Settings, admin: Admin, notifications: Notifications };

function AuthPage({ mode, setMode, onSuccess }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (mode === 'login') { await login(form.email, form.password); }
      else { await register(form.name, form.email, form.password); }
      onSuccess();
    } catch (e) { setError(e.response?.data?.error || 'Erro ao processar. Tente novamente.'); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⭐</div>
        <h2 className="auth-title">{mode === 'login' ? 'Entrar na plataforma' : 'Criar sua conta'}</h2>
        <p className="auth-sub">{mode === 'login' ? 'Bem-vindo de volta, soldado!' : 'Comece sua jornada rumo à aprovação'}</p>
        {error && <div className="auth-error">{error}</div>}
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" placeholder="Seu nome" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input className="form-input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <button className="auth-submit" onClick={submit} disabled={loading}>
          {loading ? '⏳ Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta grátis'}
        </button>
        {mode === 'login' && (
          <div style={{ textAlign:'center', marginTop:10, fontSize:13, color:'#8FA3BF' }}>
            Conta teste: <strong>admin@pmestudos.com</strong> / <strong>Admin@123</strong>
          </div>
        )}
        <div className="auth-switch">
          {mode === 'login'
            ? <>Não tem conta? <a onClick={() => setMode('register')}>Cadastre-se grátis</a></>
            : <>Já tem conta? <a onClick={() => setMode('login')}>Entrar</a></>}
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const [scene, setScene]     = useState('landing'); // landing | auth | app
  const [authMode, setAuthMode] = useState('login');
  const [page, setPage]       = useState('dashboard');
  const [toast, setToast]     = useState('');
  const [notifCount] = useState(2);

  useEffect(() => { if (user) setScene('app'); }, [user]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  useEffect(() => {
    if (scene === 'app') { setTimeout(() => showToast('📅 Lembrete: Matemática às 09:00 hoje!'), 2000); }
  }, [scene]);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><Loader /></div>;

  const goLogin    = () => { setAuthMode('login');    setScene('auth'); };
  const goRegister = () => { setAuthMode('register'); setScene('auth'); };
  const onAuthSuccess = () => { setScene('app'); setPage('dashboard'); };

  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <>
      <Navbar
        onLogoClick={() => scene === 'app' ? setPage('dashboard') : setScene('landing')}
        onNav={(dest) => {
          if (dest === 'login')    return goLogin();
          if (dest === 'register') return goRegister();
          setPage(dest);
        }}
        isApp={scene === 'app'}
        notifCount={notifCount}
      />

      {scene === 'landing' && <Landing onLogin={goLogin} onRegister={goRegister} />}
      {scene === 'auth'    && <AuthPage mode={authMode} setMode={setAuthMode} onSuccess={onAuthSuccess} />}
      {scene === 'app'     && (
        <div className="app-layout">
          <Sidebar current={page} onNav={setPage} unread={3} />
          <main className="main-content">
            <PageComponent />
          </main>
        </div>
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
