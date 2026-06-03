// ===== MEDCONTROL SERVER =====
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');

// Carregar .env manualmente (sem dotenv)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  });
}

const { init: initDb, runMigrations, getDb } = require('./db');
const push = require('./push');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..')));

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, password, role' });
    }

    const db = getDb();
    const user = await db('users').where({ email, role }).first();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, doctorId: user.doctor_id }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const db = getDb();
    const existing = await db('users').where('email', email).first();
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    await db('users').insert({ id, name, email, password: hash, role });

    const token = jwt.sign({ id, name, email, role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: { id, name, email, role, doctorId: null }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const db = getDb();
    const user = await db('users').select('id', 'name', 'email', 'role', 'doctor_id').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, doctorId: user.doctor_id });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== PATIENTS ROUTES =====
app.get('/api/patients', auth, async (req, res) => {
  try {
    const db = getDb();
    const patients = await db('users')
      .select('id', 'name', 'email', 'role', 'doctor_id', 'created_at')
      .where({ role: 'patient', doctor_id: req.user.id });

    res.json(patients.map(p => ({
      id: p.id, name: p.name, email: p.email, role: p.role,
      doctorId: p.doctor_id, createdAt: p.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/patients', auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password' });
    }

    const db = getDb();
    const existing = await db('users').where('email', email).first();
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    await db('users').insert({ id, name, email, password: hash, role: 'patient', doctor_id: req.user.id });

    res.status(201).json({ id, name, email, role: 'patient', doctorId: req.user.id, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== PRESCRIPTIONS ROUTES =====
app.get('/api/prescriptions', auth, async (req, res) => {
  try {
    const db = getDb();
    let query;

    if (req.query.patientId) {
      query = db('prescriptions').where({ patient_id: req.query.patientId, active: 1 });
    } else {
      query = db('prescriptions').where('doctor_id', req.user.id);
    }

    const rows = await query;

    res.json(rows.map(r => ({
      id: r.id, doctorId: r.doctor_id, patientId: r.patient_id,
      medication: r.medication, dosage: r.dosage,
      times: typeof r.times === 'string' ? JSON.parse(r.times) : r.times,
      startDate: r.start_date, endDate: r.end_date, instructions: r.instructions,
      active: !!r.active, createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/prescriptions', auth, async (req, res) => {
  try {
    const { patientId, medication, dosage, times, startDate, endDate, instructions } = req.body;
    if (!patientId || !medication || !dosage || !times || !startDate || !endDate) {
      return res.status(400).json({ error: 'Campos obrigatórios incompletos' });
    }

    const db = getDb();
    const id = crypto.randomUUID();

    await db('prescriptions').insert({
      id, doctor_id: req.user.id, patient_id: patientId,
      medication, dosage, times: JSON.stringify(times),
      start_date: startDate, end_date: endDate, instructions: instructions || ''
    });

    const prescription = { id, doctorId: req.user.id, patientId, medication, dosage, times, startDate, endDate, instructions: instructions || '', active: true, createdAt: new Date().toISOString() };

    // Enviar push ao paciente avisando da nova prescrição
    push.sendToUser(patientId, {
      title: '📋 Nova Prescrição',
      body: `${medication} - ${dosage}`,
      data: { type: 'new-prescription', prescriptionId: id }
    });

    res.status(201).json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/api/prescriptions/:id', auth, async (req, res) => {
  try {
    const db = getDb();
    const { active } = req.body;

    await db('prescriptions')
      .where({ id: req.params.id, doctor_id: req.user.id })
      .update({ active: active ? 1 : 0 });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== DOSE LOGS ROUTES =====
app.get('/api/doses', auth, async (req, res) => {
  try {
    const db = getDb();
    const { patientId, date } = req.query;
    const pid = patientId || req.user.id;

    let query = db('dose_logs').where('patient_id', pid);
    if (date) {
      query = query.where('scheduled_time', 'like', `${date}%`);
    }

    const rows = await query;

    res.json(rows.map(r => ({
      id: r.id, prescriptionId: r.prescription_id, patientId: r.patient_id,
      scheduledTime: r.scheduled_time, time: r.time, takenAt: r.taken_at,
      status: r.status, createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/doses', auth, async (req, res) => {
  try {
    const { prescriptionId, patientId, scheduledTime, time } = req.body;
    const db = getDb();
    const id = crypto.randomUUID();

    await db('dose_logs').insert({
      id, prescription_id: prescriptionId, patient_id: patientId,
      scheduled_time: scheduledTime, time, status: 'pending'
    });

    res.status(201).json({ id, prescriptionId, patientId, scheduledTime, time, takenAt: null, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/api/doses/:id', auth, async (req, res) => {
  try {
    const db = getDb();
    const { status, takenAt } = req.body;
    const update = { status };
    if (takenAt) update.taken_at = takenAt;

    await db('dose_logs').where('id', req.params.id).update(update);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== PUSH ROUTES =====
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push/subscribe', auth, async (req, res) => {
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

app.delete('/api/push/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await push.unsubscribe(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
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
