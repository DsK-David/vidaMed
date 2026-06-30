# MedControl — Gestão Inteligente de Medicamentos

Plataforma web para gerenciamento de prescrições médicas e acompanhamento de medicamentos, com notificações push em tempo real. Médicos criam prescrições, pacientes recebem lembretes e confirmam doses.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Fluxo da Plataforma](#fluxo-da-plataforma)
  - [1. Login e Autenticação](#1-login-e-autenticação)
  - [2. Visão do Médico](#2-visão-do-médico)
  - [3. Visão do Paciente](#3-visão-do-paciente)
- [Sistema de Notificações](#sistema-de-notificações)
  - [Ciclo completo do Push](#ciclo-completo-do-push)
  - [Service Worker](#service-worker)
  - [Actions dos botões da notificação](#actions-dos-botões-da-notificação)
- [Agendador de Doses (Scheduler)](#agendador-de-doses-scheduler)
- [Banco de Dados](#banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API REST](#api-rest)
- [Deploy](#deploy)
- [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Arquitetura

```
┌──────────────┐      ┌──────────────────┐      ┌──────────┐
│  Navegador   │◄────►│  Express (EJS)   │◄────►│  MySQL   │
│  (VanillaJS) │      │  Serverless      │      │ (Always) │
│  + SW        │      │  (Vercel)        │      │          │
└──────────────┘      └──────────────────┘      └──────────┘
       │                                                      
       │  Push Notification (Web-Push)                        
       └──────────────────────────────────────────────────────►
                          │                                   
                    ┌─────┴──────┐                            
                    │ Push Service│                            
                    │  (Browser)  │                            
                    └────────────┘                            
```

**Backend**: Servidor Express com renderização SSR via EJS, hospedado como serverless no Vercel.

**Frontend**: JavaScript puro (ES Modules), sem frameworks. Service Worker para push notifications.

**Banco**: MySQL rodando no AlwaysData, acessado via Knex.js.

---

## Tecnologias

### Backend (Node.js)
| Pacote | Função |
|--------|--------|
| `express` | Servidor web + roteamento |
| `ejs` | Template engine (SSR) |
| `knex` | Query builder para MySQL |
| `mysql2` | Driver MySQL |
| `bcryptjs` | Hash de senhas |
| `jsonwebtoken` | JWT para autenticação |
| `cookie-parser` | Parse de cookies httpOnly |
| `web-push` | Envio de notificações push |
| `node-cron` | Agendador de tarefas (local dev) |
| `cors` | Liberação de CORS |

### Frontend
| Arquivo | Função |
|---------|--------|
| `store.js` | Cliente API REST + estado (token/user localStorage) |
| `modules/auth.js` | Login, registro, registro push |
| `modules/doctor.js` | Sidebar, combobox, prescrição, paciente |
| `modules/patient.js` | Dashboard, botões de dose, notificações |
| `notifications.js` | Polling de doses pendentes + alarme sonoro + toast |
| `utils.js` | Formatação, sanitização, validação |
| `sw.js` | Service Worker (push, notificação clicks, mark-taken) |

---

## Fluxo da Plataforma

### 1. Login e Autenticação

```
Usuário acessa "/"
       │
       ▼
  Página de Login
  ┌──────────────────────────────┐
  │  Métricas do banco (tempo    │
  │  real: médicos, pacientes,   │
  │  prescrições)                │
  │                              │
  │  Formulário: E-mail + Senha  │
  │  Botão: "Entrar"             │
  │                              │
  │  Credenciais de demonstração │
  │  (Médico e Paciente)         │
  └──────────────────────────────┘
       │
       ▼
  POST /api/auth/login
  - Valida e-mail + senha no banco
  - Compara hash bcrypt
  - Gera JWT (24h de expiração)
  - Retorna token + user + seta cookie httpOnly
       │
       ▼
  Redireciona conforme role:
  - doctor → /doctor
  - patient → /paciente
```

**Registro**: Apenas médicos podem se registrar (`POST /api/auth/register`). Pacientes são criados por médicos.

**Proteção de rotas**:
- SSR: `requireAuth(role)` — verifica cookie JWT e role
- API: `apiAuth` — verifica header `Authorization: Bearer <token>`

---

### 2. Visão do Médico

Após login, o médico tem um painel com sidebar e as seguintes páginas:

#### 2.1 Visão Geral (`/doctor`)

```
┌────────────────────────────────────────────────┐
│  Header: "Visão Geral" | [Busca] [🔔]         │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Nova     │ │ Novo     │ │  Agendar     │   │
│  │ Prescrição│ │ Paciente  │ │  (placeholder)│   │
│  └──────────┘ └──────────┘ └──────────────┘   │
│                                                │
│  Stats: Pacientes | Ativas | Finalizadas |    │
│         Total Prescrições                      │
│                                                │
│  Tabela: Últimas 5 Prescrições Ativas          │
│  [Paciente] [Medicamento] [Dosagem] [Período]  │
│                                                │
└────────────────────────────────────────────────┘
```

**Dados**: O controller `doctor.controller.js:getOverview` busca:
- Total de pacientes do médico
- Prescrições ativas e inativas
- Últimas 5 prescrições com nome do paciente (join via `patientMap`)

#### 2.2 Meus Pacientes (`/doctor/pacientes`)

- Lista todos os pacientes do médico
- Botão "+ Novo Paciente" → formulário com nome, e-mail, senha
- `POST /api/patients` → insere na tabela `users` com `role: 'patient'` e `doctor_id` do médico logado

#### 2.3 Prescrições (`/doctor/prescricoes`)

- Lista todas as prescrições do médico
- Cada linha mostra: medicamento, paciente, dosagem, horários, período, status (Ativa/Inativa)
- Botão para desativar prescrição (`PATCH /api/prescriptions/:id`, `active: false`)

#### 2.4 Nova Prescrição (`/doctor/nova-prescricao`)

```
Formulário completo:
┌──────────────────────────────────────┐
│  PACIENTE                            │
│  [Combobox: buscar/selecionar]       │
│                                      │
│  MEDICAÇÃO                           │
│  [Combobox: medicamento] [Dosagem]   │
│                                      │
│  AGENDAMENTO                         │
│  [Data Início] [Data Fim]            │
│  [Horários: HH:MM] [+ Adicionar]     │
│  Chips: 08:00 ✕  12:00 ✕  18:00 ✕  │
│                                      │
│  INSTRUÇÕES                          │
│  [textarea opcional]                 │
│                                      │
│  [Criar Prescrição]                  │
└──────────────────────────────────────┘
```

**Combobox customizado**: Implementado em `doctor.js` com:
- Input com floating label
- Dropdown com filtro por digitação
- Suporte a teclado (setas, Enter, Escape)
- Opção "creatable" para medicamentos novos
- Fechamento ao clicar fora

**Time Chips**: Sistema de chips para horários com:
- Validação de formato HH:MM
- Prevenção de duplicatas
- Ordenação automática
- Remoção individual
- Campo hidden com JSON dos horários

**POST /api/prescriptions** cria a prescrição e dispara:
1. Push notification para o paciente (`push.sendToUser`)
2. Verificação imediata de doses (`scheduler.checkDoses()`)

---

### 3. Visão do Paciente

#### 3.1 Meu Painel (`/paciente`)

```
┌──────────────────────────────────────┐
│  Stats: Medicamentos | Doses Hoje   │
│         Tomadas      | Pendentes     │
├──────────────────────────────────────┤
│                                      │
│  ⚠️ Banner: X dose(s) pendente(s)   │
│                                      │
│  ┌─── Prescrição ──────────────────┐ │
│  │  Medicamento X        [Ativa]   │ │
│  │  Dosagem: 500mg                 │ │
│  │  📅 01/01 – 15/01               │ │
│  │  🕐 08:00, 12:00, 18:00        │ │
│  │  [✓ 08:00] [✓ 12:00]           │ │
│  │  [✓ 18:00 pulsando]            │ │
│  └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

Ao carregar o dashboard:
1. `initPatientDashboard()` é chamado
2. Registra push notification (se não registrado ainda)
3. Busca `GET /api/doses?patientId=X&date=hoje`
4. Renderiza botões de dose para cada log pendente
5. Inicia `NotificationSystem` (polling a cada 15s)

**Fluxo de confirmação de dose**:
```
Botão "✓ 08:00" clicado
       │
       ▼
  PATCH /api/doses/:id { status: "taken", takenAt: ISO }
       │
       ▼
  Botão → "✓ Tomado" (disabled)
  Stats atualizados (pendentes -1, tomadas +1)
  Toast: "Dose confirmada! ✓"
```

#### 3.2 Minhas Prescrições (`/paciente/prescricoes`)

- Lista todas as prescrições do paciente (ativas e inativas)
- Tabela com medicamento, dosagem, horários, período, status

#### 3.3 Histórico (`/paciente/historico`)

- Últimos 100 registros de dose
- Tabela com medicamento, horário programado, quando tomou, status
- Status: badge verde (Tomada), vermelho (Perdida), info (Pendente)

---

## Sistema de Notificações

O MedControl tem **três camadas** de notificação que funcionam em conjunto:

### Ciclo completo do Push

```
  ┌────────────────────────────────────────────────────────────┐
  │                     SERVICE WORKER                         │
  │                                                            │
  │  Recebe push → mostra notificação com actions              │
  │  "✓ Já Tomei" → fetch /api/doses/mark-taken (com HMAC)    │
  │  "Abrir" → foca janela do paciente                        │
  │                                                            │
  │  notificationclick:                                       │
  │    - Se action === "taken": POST mark-taken + postMessage  │
  │    - Se action === "open": focusOrOpenPatient()            │
  └────────────────────────────────────────────────────────────┘
           ▲                                        │
           │ push event                             │ postMessage
           │                                        ▼
  ┌────────┴───────────────────────────────────────────────┐
  │              SERVIDOR (scheduler.js)                    │
  │                                                         │
  │  A cada 1 minuto (local) ou sob demanda (Vercel):      │
  │    - Busca prescrições ativas do dia                    │
  │    - Para cada horário que "bate" com o minuto atual    │
  │    - Cria dose_log pendente                             │
  │    - Gera HMAC signature (SHA256)                       │
  │    - Envia push via web-push                            │
  │                                                         │
  │  A cada 5 min: marca doses vencidas como "missed"      │
  └─────────────────────────────────────────────────────────┘
           ▲
           │
  ┌────────┴───────────────────────────────────────────────┐
  │          FRONTEND (notifications.js)                    │
  │                                                         │
  │  Polling a cada 15s: GET /api/doses?date=hoje           │
  │    - Verifica doses pendentes                           │
  │    - Se horário atual está no range (±60min)            │
  │    - Toca alarme sonoro (Web Audio API)                 │
  │    - Dispara Notification do browser                    │
  │    - Mostra toast no dashboard                          │
  └─────────────────────────────────────────────────────────┘
```

### Service Worker

Arquivo: `sw.js`

**Eventos tratados**:

| Evento | Ação |
|--------|------|
| `install` | `skipWaiting()` — ativa imediatamente |
| `activate` | `clients.claim()` — assume controle |
| `push` | Parse dados, mostra notificação com actions |
| `notificationclick` | Action "taken" → mark-taken; action "open" → foca app |
| `message` | Log de subscription |

**Notificação Push (dose-reminder)**:
```
Título: "💊 Hora do Medicamento!"
Corpo: "Medicamento X - 500mg (08:00)"
Actions: ["✓ Já Tomei", "Abrir"]
Dados: { prescriptionId, doseLogId, time, medication, dosage, signature }
```

**mark-taken via SW**: O Service Worker pode marcar a dose como tomada **sem o usuário estar logado** usando uma assinatura HMAC:
```js
const expected = crypto.createHmac('sha256', JWT_SECRET).update(doseLogId).digest('hex');
```
O SW envia `POST /api/doses/mark-taken` com `{ doseLogId, signature }`. Se a assinatura confere, o servidor atualiza o status.

### Actions dos botões da notificação

**"✓ Já Tomei"** → `event.action === 'taken'`:
1. `POST /api/doses/mark-taken` (autenticado via HMAC)
2. Se sucesso: `postMessage({ type: 'dose-taken', doseLogId })` para todas as janelas
3. Redireciona para `/paciente?confirmado=<id>`
4. O frontend escuta o `message` e atualiza o botão + stats

**"Abrir"** → `event.action === 'open'`:
1. Foca janela `/paciente` existente ou abre nova
2. `postMessage({ type: 'notification-open' })`
3. Frontend faz scroll até o primeiro botão pulsante

---

## Agendador de Doses (Scheduler)

Arquivo: `server/scheduler.js`

**Funcionamento local (não-Vercel)**:
- `cron.schedule('* * * * *')` — verifica a cada 1 minuto
- `cron.schedule('*/5 * * * *')` — marca perdidas a cada 5 min

**Na Vercel**: O scheduler NÃO roda (check `!process.env.VERCEL`). As doses são verificadas sob demanda:
- Quando o médico cria uma prescrição → `scheduler.checkDoses()` é chamado imediatamente
- Quando o paciente acessa o dashboard → o frontend faz polling

**`checkDoses()`**:
1. Busca prescrições ativas (`active = 1`) com `start_date <= hoje <= end_date`
2. Para cada horário da prescrição, verifica se o minuto atual coincide (±1 minuto)
3. Se sim, verifica se já existe `dose_log` para aquele horário hoje
4. Se não existe, cria `dose_log` com `status: 'pending'`
5. Gera HMAC signature
6. Envia push notification via `web-push`

**`markMissedDoses()`**:
1. Busca `dose_logs` com `status = 'pending'` e `scheduled_time` anterior a 1 hora atrás
2. Atualiza cada uma para `status = 'missed'`

---

## Banco de Dados

MySQL com 4 tabelas:

### `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `name` | VARCHAR(255) | Nome completo |
| `email` | VARCHAR(255) UNIQUE | E-mail de login |
| `password` | VARCHAR(255) | Hash bcrypt |
| `role` | ENUM('doctor','patient') | Tipo de usuário |
| `doctor_id` | VARCHAR(36) FK → users | Médico responsável (pacientes) |
| `created_at` | TIMESTAMP | Data de cadastro |

### `prescriptions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `doctor_id` | VARCHAR(36) FK | Médico que prescreveu |
| `patient_id` | VARCHAR(36) FK | Paciente |
| `medication` | VARCHAR(255) | Nome do medicamento |
| `dosage` | VARCHAR(255) | Dosagem (ex: "500mg") |
| `times` | JSON | Array de horários (ex: ["08:00","12:00","18:00"]) |
| `start_date` | DATE | Início do tratamento |
| `end_date` | DATE | Fim do tratamento |
| `instructions` | TEXT | Instruções de uso |
| `active` | BOOLEAN | Se está ativa |
| `created_at` | TIMESTAMP | Data de criação |

### `dose_logs`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `prescription_id` | VARCHAR(36) FK | Prescrição relacionada |
| `patient_id` | VARCHAR(36) FK | Paciente |
| `scheduled_time` | DATETIME | Data+hora agendada |
| `time` | VARCHAR(5) | Apenas HH:MM |
| `taken_at` | DATETIME NULL | Quando tomou |
| `status` | ENUM('pending','taken','missed') | Estado da dose |
| `created_at` | TIMESTAMP | Data de criação |

### `push_subscriptions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INT PK AUTO_INCREMENT | ID |
| `user_id` | VARCHAR(36) FK | Usuário |
| `endpoint` | VARCHAR(500) UNIQUE | Endpoint push |
| `p256dh` | VARCHAR(255) | Chave pública |
| `auth` | VARCHAR(255) | Chave de autenticação |
| `created_at` | TIMESTAMP | Data |

### Seed automático

Quando o banco está vazio, a migration cria automaticamente:
- **Médico**: `sofia@clinica.com` / `123456`
- **Pacientes**: `david@email.com`, `joao@email.com` / `123456`

---

## Estrutura do Projeto

```
vidaMed/
├── server/                    # Backend Node.js
│   ├── app.js                 # Express app (entry point Vercel)
│   ├── index.js               # Server local (app.listen)
│   ├── db.js                  # Knex init + migrations + seed
│   ├── push.js                # Web-Push service
│   ├── scheduler.js           # Cron de verificação de doses
│   ├── seed.js                # Script CLI para seed manual
│   ├── generate-vapid.js      # Geração de chaves VAPID
│   ├── .env                   # Variáveis de ambiente (local)
│   ├── package.json
│   ├── controllers/
│   │   ├── auth.controller.js     # Login, register, logout
│   │   ├── doctor.controller.js   # Overview, patients, prescriptions
│   │   └── patient.controller.js  # Dashboard, prescriptions, history
│   ├── routes/
│   │   ├── auth.routes.js         # /, /register, /logout, /api/auth/*
│   │   ├── doctor.routes.js       # /doctor*, /api/patients, /api/prescriptions
│   │   └── patient.routes.js      # /paciente*, /api/doses
│   ├── middleware/
│   │   └── auth.middleware.js     # requireAuth, apiAuth (JWT)
│   └── views/
│       ├── layouts/
│       │   ├── head.ejs           # <head> + CSS + fonts
│       │   └── foot.ejs           # Toast + SW registration + app.js
│       ├── includes/
│       │   ├── header.ejs         # App header + search + hamburger
│       │   ├── sidebar.ejs        # Sidebar médico
│       │   └── sidebar-patient.ejs# Sidebar paciente
│       └── pages/
│           ├── login.ejs
│           ├── register.ejs
│           ├── doctor/
│           │   ├── overview.ejs
│           │   ├── patients.ejs
│           │   ├── prescriptions.ejs
│           │   ├── new-prescription.ejs
│           │   └── new-patient.ejs
│           └── patient/
│               ├── dashboard.ejs
│               ├── prescriptions.ejs
│               └── history.ejs
├── css/
│   ├── global.css         # Reset, variáveis, tipografia
│   ├── components.css     # Botões, forms, cards, modais, badges, toasts
│   ├── motion.css         # Keyframes: fadeUp, float, pulse
│   ├── pages.css          # Login/Register (animações mesh, layout)
│   ├── doctor.css         # Painel médico (sidebar, tabelas, combobox)
│   └── patient.css        # Painel paciente (stats, cards, doses)
├── js/
│   ├── app.js             # Inicialização global + sidebar drawer
│   ├── store.js           # API Store (fetch + localStorage)
│   ├── notifications.js   # NotificationSystem + alarme + toast
│   ├── utils.js           # Formatação, sanitização, validação
│   └── modules/
│       ├── auth.js        # Login, register, push registration
│       ├── doctor.js      # Sidebar, combobox, prescrição, paciente
│       └── patient.js     # Dashboard, botões de dose, notificações
├── sw.js                  # Service Worker
├── vercel.json            # Config de deploy Vercel
├── package.json           # Dependências do projeto
├── database/
│   └── schema.sql         # Schema MySQL para referência
├── icons/                 # Ícones do PWA
├── DESING_SYSTEM.md       # Design tokens
└── README.md              # Este arquivo
```

---

## API REST

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (email + password) → JWT + cookie |
| POST | `/api/auth/register` | Registro médico → JWT + cookie |
| GET | `/api/auth/me` | Dados do usuário logado (requer Bearer token) |

### Médico
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/patients` | Lista pacientes do médico |
| POST | `/api/patients` | Cadastra paciente |
| GET | `/api/prescriptions` | Lista prescrições (query: `?patientId=X`) |
| POST | `/api/prescriptions` | Cria prescrição |
| PATCH | `/api/prescriptions/:id` | Desativa prescrição (`{ active: false }`) |
| GET | `/api/medications` | Lista medicamentos únicos |

### Paciente
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/doses` | Logs de dose (query: `?patientId=X&date=YYYY-MM-DD`) |
| POST | `/api/doses` | Cria log de dose |
| PATCH | `/api/doses/:id` | Atualiza log (status, takenAt) |
| POST | `/api/doses/mark-taken` | Marca como tomada via HMAC (público, usado pelo SW) |

### Push
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/push/vapid-key` | Chave pública VAPID |
| POST | `/api/push/subscribe` | Registra subscription |
| DELETE | `/api/push/unsubscribe` | Remove subscription |

### SSR
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Login |
| GET | `/register` | Registro |
| GET | `/logout` | Logout |
| GET | `/doctor*` | Painel médico (protegido) |
| GET | `/paciente*` | Painel paciente (protegido) |

---

## Deploy

### Vercel

O projeto está configurado para deploy serverless no Vercel via `vercel.json`:

```json
{
  "version": 2,
  "builds": [{
    "src": "server/app.js",
    "use": "@vercel/node",
    "config": {
      "includeFiles": [
        "server/views/**",
        "css/**",
        "js/**",
        "sw.js",
        "icons/**"
      ]
    }
  }],
  "routes": [
    { "src": "/(.*)", "dest": "/server/app.js" }
  ]
}
```

**Importante**: O `includeFiles` é necessário porque o `@vercel/node` só inclui o entry point por padrão. Views, CSS, JS e o Service Worker precisam ser explicitamente incluídos.

**Limitações serverless**:
- O `node-cron` NÃO roda na Vercel (verificado via `!process.env.VERCEL`)
- As doses são verificadas sob demanda (quando médico cria prescrição ou paciente acessa dashboard)

### Variáveis de Ambiente

Configurar no painel da Vercel (Project Settings → Environment Variables):

| Variável | Descrição |
|----------|-----------|
| `DB_HOST` | Host do MySQL |
| `DB_PORT` | Porta (3306) |
| `DB_USER` | Usuário MySQL |
| `DB_PASSWORD` | Senha MySQL |
| `DB_NAME` | Nome do banco |
| `JWT_SECRET` | Chave secreta JWT |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID (push) |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID (push) |
| `VAPID_EMAIL` | Contato para o push service |

### Local

```bash
npm install
node server/index.js
# Acessar http://localhost:3000
```

---

## Design System

O design segue um sistema de tokens CSS declarados em `global.css`:

- **Tipografia**: Syne (display) + Work Sans (corpo)
- **Cores**: Fundo escuro (`#0a0f0e`), acento teal (`#2dd4a8`), sidebar (`#062e3a`)
- **Espaçamento**: Escala de 4px (`--ds-space-1` a `--ds-space-32`)
- **Glassmorphism**: Cards e painéis com `backdrop-filter: blur(16-20px)` e bordas translúcidas
- **Animações**: Mesh drift, orb float, stagger-in, chip-in, pulse glow
- **Responsivo**: Sidebar vira drawer, tabelas viram cards em < 768px
