// ===== DOSE SCHEDULER =====
const cron = require('node-cron');
const crypto = require('crypto');
const { getDb } = require('./db');
const push = require('./push');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function start() {
  // Verificar doses a cada minuto
  cron.schedule('* * * * *', () => {
    checkDoses().catch(err => console.error('[Scheduler] Erro:', err.message));
  });

  // Marcar doses perdidas a cada 5 minutos
  cron.schedule('*/5 * * * *', () => {
    markMissedDoses().catch(err => console.error('[Scheduler] Erro ao marcar perdidas:', err.message));
  });

  console.log('[Scheduler] Verificação de doses ativa (a cada 1 min)');
  console.log('[Scheduler] Marcação de doses perdidas ativa (a cada 5 min)');
}

async function markMissedDoses() {
  const db = getDb();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  const missed = await db('dose_logs')
    .where('status', 'pending')
    .where('scheduled_time', '<', cutoff);

  for (const dose of missed) {
    await db('dose_logs').where('id', dose.id).update({ status: 'missed' });
    console.log(`[Scheduler] Dose ${dose.id} marcada como perdida (vencida em ${dose.scheduled_time})`);
  }
}

async function checkDoses() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Buscar prescrições ativas dentro do período
  const prescriptions = await db('prescriptions')
    .where('active', 1)
    .where('start_date', '<=', today)
    .where('end_date', '>=', today);

  for (const presc of prescriptions) {
    const times = typeof presc.times === 'string' ? JSON.parse(presc.times) : presc.times;

    for (const time of times) {
      if (!isTimeMatch(currentTime, time)) continue;

      // Verificar se já existe log para esse horário hoje
      const existing = await db('dose_logs')
        .where('prescription_id', presc.id)
        .where('patient_id', presc.patient_id)
        .where('time', time)
        .where('scheduled_time', 'like', `${today}%`)
        .first();

      if (existing) continue;

      // Criar log pendente
      const logId = crypto.randomUUID();
      await db('dose_logs').insert({
        id: logId,
        prescription_id: presc.id,
        patient_id: presc.patient_id,
        scheduled_time: `${today} ${time}:00`,
        time: time,
        status: 'pending'
      });

      // Gerar assinatura para o SW confirmar a dose
      const signature = crypto.createHmac('sha256', JWT_SECRET).update(logId).digest('hex');

      // Enviar push notification
      push.sendToUser(presc.patient_id, {
        title: '💊 Hora do Medicamento!',
        body: `${presc.medication} - ${presc.dosage} (${time})`,
        data: {
          type: 'dose-reminder',
          prescriptionId: presc.id,
          doseLogId: logId,
          time: time,
          medication: presc.medication,
          dosage: presc.dosage,
          signature: signature
        }
      });
    }
  }
}

function isTimeMatch(current, target) {
  const [ch, cm] = current.split(':').map(Number);
  const [th, tm] = target.split(':').map(Number);
  const currentMin = ch * 60 + cm;
  const targetMin = th * 60 + tm;
  return currentMin >= targetMin - 1 && currentMin <= targetMin + 1;
}

module.exports = { start, checkDoses };
