// ===== MEDCONTROL SERVER =====
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');

// Carregar .env manualmente
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  });
}

const { init: initDb, runMigrations } = require('./db');
const push = require('./push');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (root project) — não servir index.html para não conflitar com rota /
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ===== ROUTES =====
app.use(require('./routes/auth.routes'));
app.use(require('./routes/doctor.routes'));
app.use(require('./routes/patient.routes'));

// API: Push
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push/subscribe', require('./middleware/auth.middleware').apiAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    await push.subscribe(req.user.id, subscription);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/push/unsubscribe', require('./middleware/auth.middleware').apiAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await push.unsubscribe(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== FALLBACK =====
// Catch-all: send 404 HTML for unknown routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Rota não encontrada' });
  } else {
    res.status(404).send('<h1>404 — Página não encontrada</h1><a href="/">Voltar ao início</a>');
  }
});

// ===== INIT =====
async function startServer() {
  initDb();
  await runMigrations();
  console.log('[DB] Conectado ao MySQL e migrations executadas');

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    push.init(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    scheduler.start();
  } else {
    console.log('[Push] VAPID keys não configuradas. Execute: npm run generate-vapid');
  }

  app.listen(PORT, () => {
    console.log(`[MedControl] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Erro ao iniciar servidor:', err.message);
  process.exit(1);
});
