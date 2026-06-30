const { getDb } = require('../db');

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

async function getDashboard(req, res) {
  try {
    const db = getDb();
    const prescriptions = await db('prescriptions')
      .where({ patient_id: req.user.id, active: 1 });

    const list = prescriptions.map(r => ({
      id: r.id,
      medication: r.medication,
      dosage: r.dosage,
      times: typeof r.times === 'string' ? JSON.parse(r.times) : r.times,
      startDate: formatDate(r.start_date),
      endDate: formatDate(r.end_date),
      instructions: r.instructions
    }));

    const today = new Date().toISOString().split('T')[0];
    const doseLogs = await db('dose_logs')
      .where('patient_id', req.user.id)
      .andWhere('scheduled_time', 'like', `${today}%`);

    const dosesTaken = doseLogs.filter(d => d.status === 'taken').length;
    const dosesPending = doseLogs.filter(d => d.status === 'pending').length;

    res.render('pages/patient/dashboard', {
      title: 'Meu Painel',
      user: req.user,
      prescriptions: list,
      dosesToday: doseLogs.length,
      dosesTaken,
      dosesPending
    });
  } catch (err) {
    console.error('[Patient] Erro ao carregar dashboard:', err.message);
    res.status(500).send('Erro interno');
  }
}

async function getPrescriptions(req, res) {
  try {
    const db = getDb();
    const rows = await db('prescriptions')
      .where('patient_id', req.user.id)
      .orderBy('created_at', 'desc');

    const prescriptions = rows.map(r => ({
      id: r.id,
      medication: r.medication,
      dosage: r.dosage,
      times: typeof r.times === 'string' ? JSON.parse(r.times) : r.times,
      startDate: formatDate(r.start_date),
      endDate: formatDate(r.end_date),
      active: !!r.active
    }));

    res.render('pages/patient/prescriptions', {
      title: 'Minhas Prescrições',
      user: req.user,
      prescriptions
    });
  } catch (err) {
    console.error('[Patient] Erro ao carregar prescrições:', err.message);
    res.status(500).send('Erro interno');
  }
}

async function getHistory(req, res) {
  try {
    const db = getDb();
    const doseLogs = await db('dose_logs')
      .where('patient_id', req.user.id)
      .orderBy('scheduled_time', 'desc')
      .limit(100);

    const prescriptionIds = [...new Set(doseLogs.map(l => l.prescription_id))];
    const prescriptions = await db('prescriptions')
      .select('id', 'medication')
      .whereIn('id', prescriptionIds);

    const medMap = {};
    prescriptions.forEach(p => { medMap[p.id] = p.medication; });

    const logs = doseLogs.map(l => ({
      id: l.id,
      medication: medMap[l.prescription_id] || '—',
      scheduledTime: formatDateTime(l.scheduled_time),
      takenAt: l.taken_at ? formatDateTime(l.taken_at) : null,
      status: l.status
    }));

    res.render('pages/patient/history', {
      title: 'Histórico',
      user: req.user,
      logs
    });
  } catch (err) {
    console.error('[Patient] Erro ao carregar histórico:', err.message);
    res.status(500).send('Erro interno');
  }
}

module.exports = { getDashboard, getPrescriptions, getHistory };
