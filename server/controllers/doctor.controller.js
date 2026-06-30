const { getDb } = require('../db');

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
}

async function getOverview(req, res) {
  try {
    const db = getDb();
    const patients = await db('users')
      .select('id', 'name', 'email', 'created_at')
      .where({ role: 'patient', doctor_id: req.user.id });
    
    const rows = await db('prescriptions').where('doctor_id', req.user.id);
    const prescriptions = rows.map(r => ({
      ...r,
      times: typeof r.times === 'string' ? JSON.parse(r.times) : r.times
    }));

    const active = prescriptions.filter(p => p.active);

    // Get patient names for active prescriptions
    const patientMap = {};
    patients.forEach(p => { patientMap[p.id] = p.name; });

    const recentPrescriptions = active.slice(0, 5).map(p => ({
      id: p.id,
      medication: p.medication,
      dosage: p.dosage,
      startDate: formatDate(p.start_date),
      endDate: formatDate(p.end_date),
      patientName: patientMap[p.patient_id] || '—'
    }));

    res.render('pages/doctor/overview', {
      title: 'Visão Geral',
      user: req.user,
      patientsCount: patients.length,
      activeCount: active.length,
      inactiveCount: prescriptions.length - active.length,
      totalPrescriptions: prescriptions.length,
      recentPrescriptions
    });
  } catch (err) {
    console.error('[Doctor] Erro ao carregar overview:', err.message);
    res.status(500).send('Erro: ' + err.message);
  }
}

async function getPatients(req, res) {
  try {
    const db = getDb();
    const patients = await db('users')
      .select('id', 'name', 'email', 'created_at')
      .where({ role: 'patient', doctor_id: req.user.id })
      .orderBy('created_at', 'desc');

    const list = patients.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      createdAt: formatDate(p.created_at)
    }));

    res.render('pages/doctor/patients', {
      title: 'Meus Pacientes',
      user: req.user,
      patients: list
    });
  } catch (err) {
    console.error('[Doctor] Erro ao carregar pacientes:', err.message);
    res.status(500).send('Erro: ' + err.message);
  }
}

async function getPrescriptions(req, res) {
  try {
    const db = getDb();
    const rows = await db('prescriptions').where('doctor_id', req.user.id).orderBy('created_at', 'desc');
    
    const patients = await db('users')
      .select('id', 'name')
      .where({ role: 'patient', doctor_id: req.user.id });

    const patientMap = {};
    patients.forEach(p => { patientMap[p.id] = p.name; });

    const prescriptions = rows.map(r => ({
      id: r.id,
      medication: r.medication,
      dosage: r.dosage,
      times: typeof r.times === 'string' ? JSON.parse(r.times) : r.times,
      startDate: formatDate(r.start_date),
      endDate: formatDate(r.end_date),
      active: !!r.active,
      patientName: patientMap[r.patient_id] || '—'
    }));

    res.render('pages/doctor/prescriptions', {
      title: 'Prescrições',
      user: req.user,
      prescriptions
    });
  } catch (err) {
    console.error('[Doctor] Erro ao carregar prescrições:', err.message);
    res.status(500).send('Erro: ' + err.message);
  }
}

async function getNewPrescription(req, res) {
  try {
    const db = getDb();
    const patients = await db('users')
      .select('id', 'name')
      .where({ role: 'patient', doctor_id: req.user.id })
      .orderBy('name');

    // Get unique medications from existing prescriptions
    const rows = await db('prescriptions').where('doctor_id', req.user.id);
    const medications = [...new Set(rows.map(r => r.medication).filter(Boolean))].sort();

    const today = new Date().toISOString().split('T')[0];

    res.render('pages/doctor/new-prescription', {
      title: 'Nova Prescrição',
      user: req.user,
      patients: patients.map(p => ({ id: p.id, name: p.name })),
      medications,
      getToday: today
    });
  } catch (err) {
    console.error('[Doctor] Erro ao carregar nova prescrição:', err.message);
    res.status(500).send('Erro: ' + err.message);
  }
}

async function getNewPatient(req, res) {
  res.render('pages/doctor/new-patient', {
    title: 'Novo Paciente',
    user: req.user
  });
}

module.exports = { getOverview, getPatients, getPrescriptions, getNewPrescription, getNewPatient };
