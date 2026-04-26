const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/pmestudos.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

async function initDB() {
  const db = getDB();
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- USERS
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT DEFAULT 'student',
      plan        TEXT DEFAULT 'free',
      plan_expires_at TEXT,
      avatar      TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- DISCIPLINES
    CREATE TABLE IF NOT EXISTS disciplines (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#2E86C1',
      icon  TEXT DEFAULT '📚',
      order_index INTEGER DEFAULT 0
    );

    -- QUESTIONS
    CREATE TABLE IF NOT EXISTS questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      discipline_id INTEGER REFERENCES disciplines(id),
      discipline    TEXT NOT NULL,
      difficulty    TEXT CHECK(difficulty IN ('Fácil','Médio','Difícil')) DEFAULT 'Médio',
      year          TEXT,
      source        TEXT,
      text          TEXT NOT NULL,
      options       TEXT NOT NULL,
      correct       INTEGER NOT NULL,
      explanation   TEXT,
      tags          TEXT,
      pdf_id        INTEGER,
      ai_generated  INTEGER DEFAULT 0,
      active        INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- PDF UPLOADS
    CREATE TABLE IF NOT EXISTS pdf_uploads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      filename     TEXT NOT NULL,
      original_name TEXT NOT NULL,
      discipline   TEXT,
      subject      TEXT,
      week         TEXT,
      status       TEXT DEFAULT 'pending',
      questions_extracted INTEGER DEFAULT 0,
      error_msg    TEXT,
      uploaded_by  INTEGER REFERENCES users(id),
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- USER ANSWERS
    CREATE TABLE IF NOT EXISTS user_answers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id),
      question_id INTEGER REFERENCES questions(id),
      answer      INTEGER NOT NULL,
      correct     INTEGER NOT NULL,
      time_spent  INTEGER,
      review      INTEGER DEFAULT 0,
      favorite    INTEGER DEFAULT 0,
      answered_at TEXT DEFAULT (datetime('now'))
    );

    -- CALENDAR BLOCKS
    CREATE TABLE IF NOT EXISTS calendar_blocks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id),
      discipline  TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      time_slot   TEXT NOT NULL,
      duration_min INTEGER DEFAULT 60,
      block_type  TEXT DEFAULT 'study',
      color_class TEXT DEFAULT 'mat-port',
      week_offset INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- PLANS / PAYMENT LINKS
    CREATE TABLE IF NOT EXISTS plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      price_cents INTEGER NOT NULL,
      period      TEXT DEFAULT 'monthly',
      features    TEXT,
      payment_link TEXT,
      active      INTEGER DEFAULT 1,
      highlighted INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- NOTIFICATIONS
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      type       TEXT DEFAULT 'info',
      read       INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- STUDY PROGRESS
    CREATE TABLE IF NOT EXISTS study_progress (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER REFERENCES users(id),
      discipline   TEXT NOT NULL,
      hours_studied REAL DEFAULT 0,
      date         TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- SETTINGS
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data
  seedData(db);
  console.log('✅ Database initialized');
}

function seedData(db) {
  // Default admin
  const adminExists = db.prepare("SELECT id FROM users WHERE email = 'admin@pmestudos.com'").get();
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`INSERT INTO users (name, email, password, role, plan) VALUES (?, ?, ?, 'admin', 'elite')`)
      .run('Administrador', 'admin@pmestudos.com', hash);
    console.log('👤 Admin criado: admin@pmestudos.com / Admin@123');
  }

  // Default plans
  const planExists = db.prepare("SELECT id FROM plans LIMIT 1").get();
  if (!planExists) {
    const plans = [
      { name: 'Grátis', slug: 'free', price_cents: 0, period: 'forever', features: JSON.stringify(['500 questões','Dashboard básico','Calendário simples']), payment_link: '', active: 1, highlighted: 0 },
      { name: 'Pro', slug: 'pro', price_cents: 4700, period: 'monthly', features: JSON.stringify(['Banco completo','Dashboard avançado','Simulados ilimitados','Ranking','Notificações']), payment_link: '', active: 1, highlighted: 1 },
      { name: 'Elite', slug: 'elite', price_cents: 9700, period: 'monthly', features: JSON.stringify(['Tudo do Pro','Aulas em vídeo','PDFs premium','Trilha por edital','Suporte prioritário']), payment_link: '', active: 1, highlighted: 0 },
    ];
    const stmt = db.prepare("INSERT INTO plans (name,slug,price_cents,period,features,payment_link,active,highlighted) VALUES (?,?,?,?,?,?,?,?)");
    plans.forEach(p => stmt.run(p.name, p.slug, p.price_cents, p.period, p.features, p.payment_link, p.active, p.highlighted));
  }

  // Default disciplines
  const discExists = db.prepare("SELECT id FROM disciplines LIMIT 1").get();
  if (!discExists) {
    const discs = [
      { name: 'Português', color: '#2E86C1', icon: '📖', order_index: 1 },
      { name: 'Matemática', color: '#27AE60', icon: '🔢', order_index: 2 },
      { name: 'Direito Constitucional', color: '#E74C3C', icon: '⚖️', order_index: 3 },
      { name: 'Direito Penal', color: '#C0392B', icon: '🔏', order_index: 4 },
      { name: 'História', color: '#F39C12', icon: '🏛️', order_index: 5 },
      { name: 'Geografia', color: '#16A085', icon: '🗺️', order_index: 6 },
      { name: 'Informática', color: '#8E44AD', icon: '💻', order_index: 7 },
      { name: 'Física', color: '#566573', icon: '⚗️', order_index: 8 },
      { name: 'Raciocínio Lógico', color: '#1ABC9C', icon: '🧠', order_index: 9 },
      { name: 'Atualidades', color: '#E67E22', icon: '📰', order_index: 10 },
    ];
    const stmt = db.prepare("INSERT INTO disciplines (name,color,icon,order_index) VALUES (?,?,?,?)");
    discs.forEach(d => stmt.run(d.name, d.color, d.icon, d.order_index));
  }

  // Seed questions
  const qCount = db.prepare("SELECT COUNT(*) as c FROM questions").get();
  if (qCount.c < 5) {
    seedQuestions(db);
  }
}

function seedQuestions(db) {
  const questions = [
    // PORTUGUÊS
    { discipline: 'Português', difficulty: 'Médio', year: '2023', source: 'VUNESP', text: 'Assinale a alternativa em que a concordância verbal está correta, de acordo com a norma culta:', options: JSON.stringify(['Os candidatos foi aprovado na prova.','Faz dois anos que não estudo português.','Haviam muitas pessoas na sala de espera.','Os alunos chegou cedo ao quartel.','Nós foi ao batalhão ontem pela manhã.']), correct: 1, explanation: 'O verbo "fazer" indicando tempo decorrido é impessoal, ficando sempre na 3ª pessoa do singular. "Faz dois anos" está correto.' },
    { discipline: 'Português', difficulty: 'Fácil', year: '2022', source: 'FUVEST', text: 'Qual das alternativas apresenta uso correto da crase?', options: JSON.stringify(['Ele foi à pé até o quartel.','Refiro-me à documentos importantes.','Ela se dirigiu à diretora do batalhão.','Vou à São Paulo amanhã cedo.','Ela gosta à tarde de estudar.']), correct: 2, explanation: 'Crase ocorre antes de substantivos femininos precedidos de artigo "a". "Dirigiu-se à diretora" = dirigiu-se + a + a diretora. Correto.' },
    { discipline: 'Português', difficulty: 'Difícil', year: '2023', source: 'CESPE', text: 'Sobre o uso do ponto-e-vírgula, assinale a afirmativa correta:', options: JSON.stringify(['Substitui sempre o ponto final.','Separa orações coordenadas com sentido completo, especialmente quando já há vírgulas.','É obrigatório antes de conjunções adversativas.','Separa vocativos em início de oração.','Indica pausa menor que a vírgula.']), correct: 1, explanation: 'O ponto-e-vírgula separa orações coordenadas com certa independência de sentido, especialmente quando as orações já contêm vírgulas internamente.' },
    { discipline: 'Português', difficulty: 'Médio', year: '2022', source: 'FGV', text: 'Identifique o período que apresenta oração subordinada adverbial causal:', options: JSON.stringify(['Quando chegou, o quartel estava fechado.','Estudou muito para passar no concurso.','Porque se dedicou bastante, foi aprovado.','Embora cansado, continuou estudando.','Se treinar todos os dias, passará na PM.']), correct: 2, explanation: '"Porque se dedicou bastante" é oração subordinada adverbial causal, pois indica a causa do fato expresso na oração principal.' },
    // MATEMÁTICA
    { discipline: 'Matemática', difficulty: 'Fácil', year: '2023', source: 'VUNESP', text: 'Uma guarnição policial de 15 soldados tem provisões para 20 dias. Quantos dias as mesmas provisões durarão para 25 soldados?', options: JSON.stringify(['8 dias','10 dias','12 dias','16 dias','18 dias']), correct: 2, explanation: 'Grandezas inversamente proporcionais: 15×20 = 25×x → x = 300/25 = 12 dias.' },
    { discipline: 'Matemática', difficulty: 'Médio', year: '2023', source: 'CESPE', text: 'Um policial percorre 120 km em 2 horas. Se aumentar sua velocidade em 20%, quanto tempo levará para percorrer 180 km?', options: JSON.stringify(['2h 00min','2h 15min','2h 30min','2h 45min','3h 00min']), correct: 2, explanation: 'Velocidade inicial: 60 km/h. Com +20%: 72 km/h. Tempo = 180/72 = 2,5 horas = 2h 30min.' },
    { discipline: 'Matemática', difficulty: 'Difícil', year: '2022', source: 'FCC', text: 'Em um concurso PM, 40% dos candidatos passaram na prova escrita. Desses, 25% foram reprovados no teste físico. Qual o percentual de candidatos aprovados em ambas as etapas?', options: JSON.stringify(['10%','15%','20%','25%','30%']), correct: 3, explanation: '40% passaram na escrita. Desses, 75% aprovados no físico (100%-25%). 40% × 75% = 30% do total.' },
    { discipline: 'Matemática', difficulty: 'Fácil', year: '2022', source: 'VUNESP', text: 'Um quadrado tem perímetro de 32 cm. Qual é a área desse quadrado?', options: JSON.stringify(['16 cm²','32 cm²','48 cm²','64 cm²','128 cm²']), correct: 3, explanation: 'Perímetro = 4×lado → lado = 32/4 = 8 cm. Área = lado² = 8² = 64 cm².' },
    { discipline: 'Matemática', difficulty: 'Médio', year: '2021', source: 'CESPE', text: 'Se a soma de três números consecutivos é 147, qual é o maior deles?', options: JSON.stringify(['47','48','49','50','51']), correct: 2, explanation: 'Sejam n, n+1, n+2. Soma: 3n+3 = 147 → n = 48. O maior é n+2 = 50.' },
    // DIREITO CONSTITUCIONAL
    { discipline: 'Direito Constitucional', difficulty: 'Difícil', year: '2022', source: 'CESPE', text: 'De acordo com a Constituição Federal de 1988, é característica da Polícia Militar:', options: JSON.stringify(['Órgão federal de segurança pública','Força auxiliar e reserva do Exército Brasileiro','Responsável exclusivamente pela investigação criminal','Subordinada diretamente ao Ministério da Justiça','Competente para a polícia judiciária estadual']), correct: 1, explanation: 'O art. 144, §6º da CF/88: as PMs são forças auxiliares e reserva do Exército, cabendo a polícia ostensiva e preservação da ordem pública.' },
    { discipline: 'Direito Constitucional', difficulty: 'Médio', year: '2023', source: 'FGV', text: 'Segundo a CF/88, os direitos e garantias fundamentais NÃO incluem:', options: JSON.stringify(['Direito à vida e à liberdade','Direito à propriedade privada','Direito à pena de morte em qualquer caso','Direito à igualdade perante a lei','Direito à segurança']), correct: 2, explanation: 'A CF/88 proíbe a pena de morte, salvo em caso de guerra declarada (art. 5º, XLVII, "a"). Portanto, pena de morte em qualquer caso NÃO é um direito.' },
    { discipline: 'Direito Constitucional', difficulty: 'Fácil', year: '2022', source: 'VUNESP', text: 'Quantos anos é o mandato do Presidente da República segundo a CF/88?', options: JSON.stringify(['3 anos','4 anos','5 anos','6 anos','7 anos']), correct: 1, explanation: 'Conforme art. 82 da CF/88, o mandato do Presidente da República é de 4 anos, vedada reeleição para o período subsequente (após EC 111/2023).' },
    // DIREITO PENAL
    { discipline: 'Direito Penal', difficulty: 'Médio', year: '2023', source: 'CESPE', text: 'No Código Penal Brasileiro, a legítima defesa é caracterizada quando o agente usa moderadamente os meios necessários para repelir:', options: JSON.stringify(['Qualquer ameaça, mesmo remota','Injusta agressão atual ou iminente a direito seu ou de outrem','Agressão justa provocada pelo próprio agente','Apenas agressões contra sua integridade física','Agressões de terceiros somente']), correct: 1, explanation: 'Art. 25 do CP: age em legítima defesa quem usa moderadamente os meios necessários para repelir injusta agressão, atual ou iminente, a direito seu ou de outrem.' },
    { discipline: 'Direito Penal', difficulty: 'Difícil', year: '2022', source: 'FCC', text: 'Sobre o crime continuado no CP, assinale a alternativa correta:', options: JSON.stringify(['O agente responde por todos os crimes somados','Aplica-se a pena de um dos crimes, se idênticas, ou a mais grave, aumentada de 1/6 a 2/3','A pena é sempre a mínima do crime','Não é possível reconhecimento pelo juiz','Aplica-se apenas a crimes dolosos contra a vida']), correct: 1, explanation: 'Art. 71 do CP: crime continuado = aplica-se a pena de um só dos crimes, se idênticas, ou a mais grave, aumentada de 1/6 a 2/3.' },
    // RACIOCÍNIO LÓGICO
    { discipline: 'Raciocínio Lógico', difficulty: 'Médio', year: '2023', source: 'CESPE', text: 'Se "Todo policial é corajoso" e "João é policial", podemos concluir que:', options: JSON.stringify(['João pode ser covarde','João é corajoso','João é o policial mais corajoso','Nem todo corajoso é policial - nada se conclui','João não é corajoso']), correct: 1, explanation: 'Silogismo válido: Todo A é B; João é A; logo João é B. Premissas verdadeiras levam à conclusão necessária: João é corajoso.' },
    { discipline: 'Raciocínio Lógico', difficulty: 'Fácil', year: '2022', source: 'VUNESP', text: 'A negação da proposição "Todos os candidatos estudam muito" é:', options: JSON.stringify(['Nenhum candidato estuda muito','Alguns candidatos não estudam muito','Todos os candidatos não estudam','Os candidatos estudam pouco','Algum candidato estuda muito']), correct: 1, explanation: 'Negação de "Todo A é B" é "Algum A não é B". Logo: "Alguns candidatos não estudam muito".' },
    // HISTÓRIA
    { discipline: 'História', difficulty: 'Médio', year: '2022', source: 'FUVEST', text: 'A Proclamação da República no Brasil ocorreu em:', options: JSON.stringify(['15 de novembro de 1889','7 de setembro de 1822','13 de maio de 1888','15 de novembro de 1891','7 de abril de 1831']), correct: 0, explanation: 'A Proclamação da República ocorreu em 15 de novembro de 1889, liderada pelo Marechal Deodoro da Fonseca, encerrando o período imperial.' },
    { discipline: 'História', difficulty: 'Fácil', year: '2023', source: 'VUNESP', text: 'O período da história brasileira conhecido como "Ditadura Militar" compreendeu:', options: JSON.stringify(['1930-1945','1950-1960','1964-1985','1985-1995','1945-1964']), correct: 2, explanation: 'A Ditadura Militar brasileira iniciou com o golpe de 1964 e encerrou-se em 1985 com a eleição indireta de Tancredo Neves.' },
    // INFORMÁTICA
    { discipline: 'Informática', difficulty: 'Fácil', year: '2023', source: 'CESPE', text: 'Qual das opções representa corretamente um navegador de internet?', options: JSON.stringify(['Microsoft Word','Google Chrome','Adobe Photoshop','WinRAR','VLC Media Player']), correct: 1, explanation: 'Google Chrome é um navegador de internet (browser). Os demais são aplicativos para edição de texto, imagens, compactação e reprodução de mídia.' },
    { discipline: 'Informática', difficulty: 'Médio', year: '2022', source: 'FGV', text: 'No Excel, a fórmula =SOMA(A1:A5) realiza:', options: JSON.stringify(['Multiplica os valores de A1 a A5','Soma apenas A1 e A5','Soma todos os valores de A1 até A5','Conta quantos valores há em A1:A5','Calcula a média de A1 a A5']), correct: 2, explanation: 'A função =SOMA(A1:A5) soma todos os valores no intervalo de células de A1 até A5, incluindo A2, A3 e A4.' },
    // FÍSICA
    { discipline: 'Física', difficulty: 'Médio', year: '2022', source: 'FUVEST', text: 'Um objeto em movimento retilíneo uniforme (MRU) apresenta:', options: JSON.stringify(['Aceleração constante não nula','Velocidade variável','Velocidade constante e aceleração nula','Força resultante não nula','Trajetória curva']), correct: 2, explanation: 'No MRU, o objeto percorre espaços iguais em tempos iguais: velocidade constante e aceleração = 0. A força resultante também é nula (1ª Lei de Newton).' },
  ];

  const stmt = db.prepare(`INSERT INTO questions (discipline, difficulty, year, source, text, options, correct, explanation) VALUES (?,?,?,?,?,?,?,?)`);
  questions.forEach(q => stmt.run(q.discipline, q.difficulty, q.year, q.source, q.text, q.options, q.correct, q.explanation));
  console.log(`✅ ${questions.length} questões inseridas`);
}

module.exports = { getDB, initDB };
