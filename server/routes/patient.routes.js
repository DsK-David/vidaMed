const { Router } = require('express');
const controller = require('../controllers/patient.controller');
const { requireAuth, apiAuth } = require('../middleware/auth.middleware');
const { getDb } = require('../db');
const crypto = require('crypto');

const router = Router();

// SSR pages
router.get('/paciente', requireAuth('patient'), controller.getDashboard);
router.get('/paciente/prescricoes', requireAuth('patient'), controller.getPrescriptions);
router.get('/paciente/historico', requireAuth('patient'), controller.getHistory);

// API: Doses
router.get('/api/doses', apiAuth, async (req, res) => {
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
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

router.post('/api/doses', apiAuth, async (req, res) => {
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
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

router.patch('/api/doses/:id', apiAuth, async (req, res) => {
  try {
    const db = getDb();
    const { status, takenAt } = req.body;
    const update = { status };
    if (takenAt) update.taken_at = takenAt;
    await db('dose_logs').where('id', req.params.id).update(update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

// Rota pública para SW marcar dose como tomada via HMAC
router.post('/api/doses/mark-taken', async (req, res) => {
  try {
    const { doseLogId, signature } = req.body;
    if (!doseLogId || !signature) {
      return res.status(400).json({ error: 'Campos obrigatórios: doseLogId, signature' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(doseLogId).digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const db = getDb();
    const dose = await db('dose_logs').where('id', doseLogId).first();
    if (!dose) {
      return res.status(404).json({ error: 'Dose não encontrada' });
    }
    if (dose.status !== 'pending') {
      return res.json({ success: true, alreadyMarked: true, status: dose.status });
    }

    await db('dose_logs').where('id', doseLogId).update({
      status: 'taken',
      taken_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
