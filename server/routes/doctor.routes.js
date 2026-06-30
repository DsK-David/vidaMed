const { Router } = require('express');
const controller = require('../controllers/doctor.controller');
const { requireAuth, apiAuth } = require('../middleware/auth.middleware');
const { getDb } = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const push = require('../push');
const scheduler = require('../scheduler');

const router = Router();

// SSR pages (protected)
router.get('/doctor', requireAuth('doctor'), controller.getOverview);
router.get('/doctor/pacientes', requireAuth('doctor'), controller.getPatients);
router.get('/doctor/prescricoes', requireAuth('doctor'), controller.getPrescriptions);
router.get('/doctor/nova-prescricao', requireAuth('doctor'), controller.getNewPrescription);
router.get('/doctor/novo-paciente', requireAuth('doctor'), controller.getNewPatient);

// API: Patients
router.get('/api/patients', apiAuth, async (req, res) => {
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

router.post('/api/patients', apiAuth, async (req, res) => {
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

// API: Prescriptions
router.get('/api/prescriptions', apiAuth, async (req, res) => {
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

router.post('/api/prescriptions', apiAuth, async (req, res) => {
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

    const prescription = {
      id, doctorId: req.user.id, patientId, medication, dosage, times,
      startDate, endDate, instructions: instructions || '', active: true,
      createdAt: new Date().toISOString()
    };

    push.sendToUser(patientId, {
      title: '📋 Nova Prescrição',
      body: `${medication} - ${dosage}`,
      data: { type: 'new-prescription', prescriptionId: id }
    });

    // Trigger immediate dose check
    scheduler.checkDoses().catch(err => console.error('[Scheduler] Erro no check imediato:', err.message));

    res.status(201).json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/api/prescriptions/:id', apiAuth, async (req, res) => {
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

// API: Medications
router.get('/api/medications', apiAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db('prescriptions').where('doctor_id', req.user.id);
    const meds = [...new Set(rows.map(r => r.medication).filter(Boolean))].sort();
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
