import { useState, useEffect } from 'react';
import { plansAPI } from '../api';

export default function Landing({ onLogin, onRegister }) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    plansAPI.list().then(r => setPlans(r.data.plans)).catch(() => {});
  }, []);

  const FEATURES = [
    { icon:'📊', title:'Dashboard de Desempenho', desc:'Acompanhe seu progresso em tempo real com gráficos, estatísticas de acertos e metas semanais.' },
    { icon:'📅', title:'Calendário Inteligente', desc:'Monte seu cronograma com drag & drop. O sistema sugere a ordem ideal das matérias por edital.' },
    { icon:'❓', title:'Banco de 85 mil Questões', desc:'Filtre por disciplina, banca, dificuldade e ano. Gabarito comentado e estatísticas de acertos.' },
    { icon:'🤖', title:'Professor IA Integrado', desc:'Receba explicações personalizadas geradas por IA para cada questão. Aprenda mais rápido.' },
    { icon:'📄', title:'Extração de PDFs', desc:'Faça upload de PDFs de provas anteriores e a IA extrai e organiza as questões automaticamente.' },
    { icon:'🔔', title:'Notificações Diárias', desc:'Lembretes das matérias do dia, alertas de revisão e novos conteúdos disponíveis.' },
  ];

  const defaultPlans = [
    { id:1, name:'Grátis', slug:'free', price_cents:0, period:'forever', features:['500 questões','Dashboard básico','Calendário simples'], payment_link:'', highlighted:false },
    { id:2, name:'Pro',    slug:'pro',  price_cents:4700, period:'monthly', features:['Banco completo','Dashboard avançado','Simulados ilimitados','Ranking','IA integrada'], payment_link:'', highlighted:true },
    { id:3, name:'Elite',  slug:'elite',price_cents:9700, period:'monthly', features:['Tudo do Pro','Aulas em vídeo','PDFs premium','Trilha por edital','Suporte prioritário'], payment_link:'', highlighted:false },
  ];
  const displayPlans = plans.length ? plans : defaultPlans;

  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-eyebrow">🎖️ Plataforma Oficial de Estudos PM</div>
          <h1 className="hero-h1 bebas">APROVAÇÃO<br /><span>GARANTIDA</span></h1>
          <p className="hero-sub">Polícia Militar — Prepare-se com quem entende</p>
          <p className="hero-desc">
            A plataforma mais completa para candidatos da PM. Cronograma inteligente,
            banco de questões com IA, dashboard de desempenho e conteúdo premium — tudo em um só lugar.
          </p>
          <div className="hero-cta">
            <button className="btn btn-gold btn-lg" onClick={onRegister}>Começar Gratuitamente</button>
            <button style={{ padding:'13px 28px', borderRadius:10, background:'transparent', color:'#fff', border:'2px solid rgba(255,255,255,0.3)', fontWeight:700, fontSize:15, cursor:'pointer', transition:'all .2s' }}
              onMouseOver={e => { e.target.style.borderColor='var(--gold)'; e.target.style.color='var(--gold)'; }}
              onMouseOut={e => { e.target.style.borderColor='rgba(255,255,255,0.3)'; e.target.style.color='#fff'; }}
              onClick={onLogin}>
              Já tenho conta
            </button>
          </div>
          <div className="hero-stats">
            {[['12.400+','Alunos Ativos'],['85.000','Questões no Banco'],['94%','Taxa de Aprovação']].map(([n,l]) => (
              <div key={l}>
                <div className="hero-stat-num">{n}</div>
                <div className="hero-stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section-wrap section-light">
        <div className="section-header">
          <div className="section-eye">Por que a PMEstudos?</div>
          <h2 className="section-title">Tudo que você precisa para <span>passar</span></h2>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="section-wrap section-dark">
        <div className="section-header">
          <div className="section-eye">Planos e Preços</div>
          <h2 className="section-title section-title-light">Escolha o plano <span>ideal</span></h2>
        </div>
        <div className="plans-grid">
          {displayPlans.map(p => (
            <div key={p.id} className={`plan-card${p.highlighted ? ' featured' : ''}`}>
              {p.highlighted && <div className="plan-badge-top">⭐ MAIS POPULAR</div>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">
                {p.price_cents === 0 ? 'Grátis' : `R$ ${(p.price_cents / 100).toFixed(0)}`}
                {p.price_cents > 0 && <span style={{ fontSize:16, fontWeight:400, color:'rgba(255,255,255,.4)' }}>/mês</span>}
              </div>
              <div className="plan-period">{p.period === 'forever' ? 'Para sempre' : p.period === 'monthly' ? 'ou versão anual com desconto' : p.period}</div>
              {(p.features || []).map((f, j) => (
                <div key={j} className="plan-feature"><span className="chk">✓</span>{f}</div>
              ))}
              <div className="plan-btn-wrap">
                {p.payment_link ? (
                  <a href={p.payment_link} target="_blank" rel="noreferrer"
                    style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:10, fontWeight:700, fontSize:14, background: p.highlighted ? 'linear-gradient(135deg,#C9A84C,#E8C97A)' : 'transparent', color: p.highlighted ? '#0B1E3D' : '#fff', border: p.highlighted ? 'none' : '2px solid rgba(255,255,255,0.25)', transition:'all .2s' }}>
                    {p.price_cents === 0 ? 'Começar Grátis' : `Assinar ${p.name}`}
                  </a>
                ) : (
                  <button onClick={onRegister}
                    style={{ width:'100%', padding:'12px', borderRadius:10, fontWeight:700, fontSize:14, border:'none', cursor:'pointer', background: p.highlighted ? 'linear-gradient(135deg,#C9A84C,#E8C97A)' : 'rgba(255,255,255,0.1)', color: p.highlighted ? '#0B1E3D' : '#fff', transition:'all .2s' }}>
                    {p.price_cents === 0 ? 'Começar Grátis' : `Assinar ${p.name}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#060F1E', padding:'32px 80px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ color:'rgba(255,255,255,.4)', fontSize:13 }}>© 2025 PMEstudos · Todos os direitos reservados</div>
        <div style={{ display:'flex', gap:20 }}>
          {['Termos de Uso','Privacidade','Contato'].map(l => (
            <span key={l} style={{ color:'rgba(255,255,255,.35)', fontSize:13, cursor:'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
