// ===== SEED CLI =====
// Run: node server/seed.js
// Insere usuários demo se não existirem

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { init, getDb, runMigrations } = require('./db');

async function seed() {
  init();
  await runMigrations();
  const db = getDb();

  const demoEmail = { doctor: 'sofia@clinica.com', patient: 'david@email.com' };
  const existingDoctor = await db('users').where('email', demoEmail.doctor).first();
  const existingPatient = await db('users').where('email', demoEmail.patient).first();

  const hash = await bcrypt.hash('123456', 10);

  if (!existingDoctor) {
    const doctorId = crypto.randomUUID();
    await db('users').insert({
      id: doctorId,
      name: 'Drª. Sofia Mendes',
      email: demoEmail.doctor,
      password: hash,
      role: 'doctor',
      doctor_id: null
    });
    console.log('[Seed] Médico criado: sofia@clinica.com / 123456');
  } else {
    console.log('[Seed] Médico já existe: sofia@clinica.com');
  }

  if (!existingPatient) {
    if (!existingDoctor) {
      // Need to fetch the doctor we just inserted
      const doc = await db('users').where('email', demoEmail.doctor).first();
      await db('users').insert({
        id: crypto.randomUUID(),
        name: 'David Almeida',
        email: demoEmail.patient,
        password: hash,
        role: 'patient',
        doctor_id: doc.id
      });
    } else {
      await db('users').insert({
        id: crypto.randomUUID(),
        name: 'David Almeida',
        email: demoEmail.patient,
        password: hash,
        role: 'patient',
        doctor_id: existingDoctor.id
      });
    }
    console.log('[Seed] Paciente criado: david@email.com / 123456');
  } else {
    console.log('[Seed] Paciente já existe: david@email.com');
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Erro:', err.message);
  process.exit(1);
});
