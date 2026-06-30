// ===== EXPRESS APP CONFIG =====
console.log('[App] __dirname:', __dirname);
console.log('[App] cwd:', process.cwd());

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

// Carregar .env se existir (local dev)
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

const app = express();

// Inicialização lazy (executa uma vez, com lock anti-race)
let initialized = false;
let initPromise = null;
async function ensureInit() {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    initDb();
    await runMigrations();
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      push.init(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    }
    if (!process.env.VERCEL) {
      const scheduler = require('./scheduler');
      scheduler.start();
    }
    initialized = true;
  })();
  return initPromise;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (root project)
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// Init middleware (garante DB + VAPID antes de qualquer rota)
app.use(async (req, res, next) => {
  try {
    await ensureInit();
    next();
  } catch (err) {
    console.error('[FATAL] Erro na inicialização:', err.message);
    console.error('[FATAL] Stack:', err.stack);
    res.status(500).send('Erro: ' + err.message);
  }
});

// Routes
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
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

app.delete('/api/push/unsubscribe', require('./middleware/auth.middleware').apiAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await push.unsubscribe(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

// Fallback
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Rota não encontrada' });
  } else {
    res.status(404).send('<h1>404 — Página não encontrada</h1><a href="/">Voltar ao início</a>');
  }
});

module.exports = app;
