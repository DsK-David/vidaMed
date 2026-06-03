// ===== DOSE SCHEDULER =====
const cron = require('node-cron');
const crypto = require('crypto');
const { getDb } = require('./db');
const push = require('./push');

function start() {
  // Verificar doses a cada minuto
  cron.schedule('* * * * *', () => {
    checkDoses().catch(err => console.error('[Scheduler] Erro:', err.message));
  });
  console.log('[Scheduler] Verificação de doses ativa (a cada 1 min)');
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

      // Enviar push notification
      push.sendToUser(presc.patient_id, {
        title: '💊 Hora do Medicamento!',
        body: `${presc.medication} - ${presc.dosage} (${time})`,
        data: {
          prescriptionId: presc.id,
          doseLogId: logId,
          time: time
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
  return currentMin >= targetMin - 2 && currentMin <= targetMin;
}

module.exports = { start };
