// ===== DATABASE (Knex + MySQL) =====
const knex = require('knex');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let db;

function init() {
  db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'medcontrol',
      connectTimeout: 10000
    },
    pool: { min: 0, max: 5 },
    acquireConnectionTimeout: 10000
  });

  return db;
}

async function runMigrations() {
  // Testar conexão antes das migrations
  try {
    await db.raw('SELECT 1');
    console.log('[DB] Conexão OK');
  } catch (err) {
    console.error('[DB] Falha na conexão:', err.message);
    throw new Error('Falha ao conectar ao banco de dados: ' + err.message);
  }
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', t => {
      t.string('id', 36).primary();
      t.string('name', 255).notNullable();
      t.string('email', 255).notNullable().unique();
      t.string('password', 255).notNullable();
      t.enum('role', ['doctor', 'patient']).notNullable();
      t.string('doctor_id', 36).nullable().references('id').inTable('users');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  if (!(await db.schema.hasTable('prescriptions'))) {
    await db.schema.createTable('prescriptions', t => {
      t.string('id', 36).primary();
      t.string('doctor_id', 36).notNullable().references('id').inTable('users');
      t.string('patient_id', 36).notNullable().references('id').inTable('users');
      t.string('medication', 255).notNullable();
      t.string('dosage', 255).notNullable();
      t.json('times').notNullable();
      t.date('start_date').notNullable();
      t.date('end_date').notNullable();
      t.text('instructions');
      t.boolean('active').defaultTo(true);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  if (!(await db.schema.hasTable('dose_logs'))) {
    await db.schema.createTable('dose_logs', t => {
      t.string('id', 36).primary();
      t.string('prescription_id', 36).notNullable().references('id').inTable('prescriptions');
      t.string('patient_id', 36).notNullable().references('id').inTable('users');
      t.datetime('scheduled_time').notNullable();
      t.string('time', 5).notNullable();
      t.datetime('taken_at').nullable();
      t.enum('status', ['pending', 'taken', 'missed']).defaultTo('pending');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  if (!(await db.schema.hasTable('push_subscriptions'))) {
    await db.schema.createTable('push_subscriptions', t => {
      t.increments('id').primary();
      t.string('user_id', 36).notNullable().references('id').inTable('users');
      t.string('endpoint', 500).notNullable().unique();
      t.string('p256dh', 255).notNullable();
      t.string('auth', 255).notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  await _seedDefaults();
}

async function _seedDefaults() {
  const result = await db('users').count('* as count').first();
  if (result.count > 0) return;

  const doctorId = crypto.randomUUID();
  const patient1Id = crypto.randomUUID();
  const patient2Id = crypto.randomUUID();

  const hash = await bcrypt.hash('123456', 10);

  await db('users').insert([
    { id: doctorId, name: 'Drª. Sofia Mendes', email: 'sofia@clinica.com', password: hash, role: 'doctor', doctor_id: null },
    { id: patient1Id, name: 'David Almeida', email: 'david@email.com', password: hash, role: 'patient', doctor_id: doctorId },
    { id: patient2Id, name: 'João Oliveira', email: 'joao@email.com', password: hash, role: 'patient', doctor_id: doctorId }
  ]);
}

function getDb() {
  return db;
}

module.exports = { init, runMigrations, getDb };
