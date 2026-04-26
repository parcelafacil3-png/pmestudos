# 🎖️ PMEstudos — Guia Completo de Implantação

---

## 📦 Estrutura do Projeto

```
pmestudos/
├── backend/                  ← API Node.js/Express
│   ├── src/
│   │   ├── server.js         ← Entry point
│   │   ├── models/
│   │   │   └── database.js   ← SQLite + seed de dados
│   │   ├── middleware/
│   │   │   └── auth.js       ← JWT auth
│   │   └── routes/
│   │       ├── auth.js       ← Login/Registro
│   │       ├── questions.js  ← Banco de questões
│   │       ├── ai.js         ← IA (explicações, geração, extração PDF)
│   │       ├── pdfs.js       ← Upload de PDFs
│   │       ├── admin.js      ← Painel admin
│   │       ├── plans.js      ← Planos/preços
│   │       ├── progress.js   ← Progresso do aluno
│   │       ├── calendar.js   ← Calendário
│   │       └── notifications.js
│   ├── Dockerfile
│   └── package.json
├── frontend/                 ← React 18
│   ├── src/
│   │   ├── App.js            ← Roteamento principal
│   │   ├── api.js            ← Axios + interceptors
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── components/
│   │   │   ├── Nav.js        ← Navbar + Sidebar
│   │   │   └── UI.js         ← Toast, Modal, Badge...
│   │   └── pages/
│   │       ├── Landing.js    ← Home pública
│   │       ├── Dashboard.js  ← Dashboard do aluno
│   │       ├── Questions.js  ← Banco de questões + IA
│   │       └── Admin.js      ← Painel admin completo
│   ├── public/index.html
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   ├── nginx.conf
│   └── conf.d/default.conf
├── docker-compose.yml
├── .env.example
└── DEPLOY.md                 ← Este arquivo
```

---

## 🐳 Opção 1 — Docker (Recomendado)

### Pré-requisitos
- Docker Engine 24+ instalado
- Docker Compose v2+ (`docker compose` sem hífen)
- Porta 80 disponível no servidor

### Passo a passo

#### 1. Clone ou copie o projeto para o servidor
```bash
# Se tiver git:
git clone https://github.com/seu-usuario/pmestudos.git
cd pmestudos

# Ou faça upload via SCP/FTP dos arquivos gerados
```

#### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
nano .env
```
Edite o arquivo `.env` com seus valores:
```env
ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE_AQUI
JWT_SECRET=uma-string-aleatoria-longa-e-segura-aqui
FRONTEND_URL=http://SEU_DOMINIO_OU_IP
```
> 🔑 Pegue sua chave Anthropic em: https://console.anthropic.com/settings/keys

#### 3. Suba os containers
```bash
docker compose up -d --build
```
Aguarde ~3 minutos na primeira vez (build do frontend).

#### 4. Verifique se está funcionando
```bash
# Status dos containers
docker compose ps

# Logs em tempo real
docker compose logs -f

# Health check da API
curl http://localhost/api/health
```

#### 5. Acesse a plataforma
```
http://SEU_IP_OU_DOMINIO
```

**Login admin padrão:**
- Email: `admin@pmestudos.com`
- Senha: `Admin@123`

> ⚠️ Troque a senha do admin após o primeiro acesso!

---

## 🖥️ Opção 2 — Sem Docker (VPS/Servidor manual)

### Pré-requisitos
- Node.js 20+
- npm 10+
- Nginx

### 1. Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Edite .env com suas variáveis
node src/server.js
```

Para rodar em produção com PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name pmestudos-api
pm2 save
pm2 startup
```

### 2. Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=/api npm run build
# A pasta build/ deve ser servida pelo Nginx
```

### 3. Nginx (exemplo)
```nginx
server {
    listen 80;
    server_name pmestudos.com www.pmestudos.com;

    root /var/www/pmestudos/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 25M;
    }
}
```

---

## 🌐 Colocar em Produção com Domínio + HTTPS

### 1. Aponte o DNS
No seu provedor de domínio, crie um registro A:
```
@ → IP_DO_SEU_SERVIDOR
www → IP_DO_SEU_SERVIDOR
```

### 2. HTTPS com Let's Encrypt (Certbot)
```bash
# Instale Certbot
sudo apt install certbot python3-certbot-nginx

# Emita o certificado
sudo certbot --nginx -d pmestudos.com -d www.pmestudos.com

# Renova automaticamente
sudo systemctl enable certbot.timer
```

### 3. Atualize o .env
```env
FRONTEND_URL=https://pmestudos.com
```
```bash
docker compose down
docker compose up -d --build
```

---

## 🚀 Provedores de Hospedagem Recomendados

| Provedor           | Preço/mês | Facilidade | Ideal para |
|--------------------|-----------|------------|------------|
| **DigitalOcean**   | ~R$30     | ⭐⭐⭐⭐⭐  | Melhor custo-benefício |
| **Hostinger VPS**  | ~R$25     | ⭐⭐⭐⭐   | Mais barato com bom suporte PT |
| **Vultr**          | ~R$28     | ⭐⭐⭐⭐   | Alta performance |
| **Railway**        | ~R$20     | ⭐⭐⭐⭐⭐  | Mais simples (sem Docker manual) |
| **Render**         | Grátis*   | ⭐⭐⭐⭐⭐  | Ideal para MVP/testes |

### Deploy no Railway (mais fácil)
1. Crie conta em https://railway.app
2. Conecte seu repositório GitHub
3. Adicione as variáveis de ambiente no painel
4. O Railway faz build e deploy automaticamente

### Deploy no Render (gratuito para começar)
1. Crie conta em https://render.com
2. "New Web Service" → conecte o repo
3. Backend: `npm start` (pasta backend/)
4. Frontend: `npm run build` → serve a pasta build/

---

## 💳 Configurar Links de Pagamento

No Painel Admin → aba **"Planos & Pagamentos"**:

1. Clique **✏️ Editar** no plano desejado
2. Cole o link de pagamento no campo **"Link de Pagamento"**
3. Salve

O link pode ser de qualquer plataforma:
- **Hotmart**: `https://pay.hotmart.com/PRODUTO?checkoutMode=2`
- **Kiwify**: `https://kiwify.app/PRODUTO`
- **Eduzz**: `https://eduzz.com/produto/CODIGO`
- **PagSeguro**: seu link de cobrança
- **Stripe**: `https://buy.stripe.com/LINK`
- **Mercado Pago**: link de cobrança gerado no painel

O botão na Landing Page abrirá automaticamente esse link.

---

## 🤖 Funcionalidades de IA

### Configurar a chave Anthropic
1. Crie conta em https://console.anthropic.com
2. Gere uma API Key em Settings → API Keys
3. Adicione ao `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
4. Reinicie os containers: `docker compose restart backend`

### O que a IA faz na plataforma:

| Função | Onde usar |
|--------|-----------|
| **Explicar questão** | Banco de Questões → botão "🤖 Explicar com IA" |
| **Gerar questões** | Admin → Questões → "🤖 Gerar com IA" |
| **Extrair de PDF** | Admin → PDFs → Upload → "🤖 Extrair com IA" |

---

## 🔧 Comandos Docker Úteis

```bash
# Ver logs do backend
docker compose logs backend -f

# Ver logs do frontend
docker compose logs frontend -f

# Reiniciar apenas o backend
docker compose restart backend

# Parar tudo
docker compose down

# Parar e apagar volumes (CUIDADO: apaga o banco de dados!)
docker compose down -v

# Rebuild após mudanças no código
docker compose up -d --build

# Acessar shell do container backend
docker compose exec backend sh

# Fazer backup do banco de dados
docker compose exec backend cat /app/data/pmestudos.db > backup-$(date +%Y%m%d).db

# Ver uso de recursos
docker stats
```

---

## 🔒 Segurança em Produção

- [ ] Troque `JWT_SECRET` por uma string aleatória (mín. 32 chars)
- [ ] Use HTTPS (Certbot/Let's Encrypt)
- [ ] Troque a senha do admin após o primeiro login
- [ ] Configure backups automáticos do volume `backend_data`
- [ ] Configure um firewall (ex: `ufw allow 80,443/tcp`)
- [ ] Remova a dica de login admin da tela de auth em produção

---

## 📊 Arquitetura Final

```
Internet
    │
    ▼
[Nginx :80/:443]          ← Reverse proxy + SSL termination
    │
    ├──/api/──────────────► [Backend Node.js :3001]
    │                            │
    │                            ├── SQLite (dados)
    │                            ├── Anthropic AI API
    │                            └── /uploads (PDFs)
    │
    └──/────────────────► [Frontend React :3000]
                              └── Build estático
```

---

## 🆘 Suporte e Problemas Comuns

### "Cannot connect to backend"
```bash
docker compose logs backend
# Verifique se a porta 3001 está respondendo dentro da rede docker
docker compose exec nginx curl http://backend:3001/api/health
```

### "Build failed no frontend"
```bash
docker compose build frontend --no-cache
```

### "IA não funciona"
- Verifique se `ANTHROPIC_API_KEY` está no `.env`
- Teste a chave: `curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/models`

### Resetar banco de dados
```bash
docker compose down
docker volume rm pmestudos_backend_data
docker compose up -d
```
