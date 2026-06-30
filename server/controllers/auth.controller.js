const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function renderLogin(req, res) {
  if (req.cookies?.token) {
    try {
      const payload = jwt.verify(req.cookies.token, JWT_SECRET);
      if (payload.role === 'doctor') return res.redirect('/doctor');
      if (payload.role === 'patient') return res.redirect('/paciente');
    } catch {}
  }
  res.render('pages/login');
}

function renderRegister(req, res) {
  if (req.cookies?.token) {
    try {
      const payload = jwt.verify(req.cookies.token, JWT_SECRET);
      if (payload.role === 'doctor') return res.redirect('/doctor');
      if (payload.role === 'patient') return res.redirect('/paciente');
    } catch {}
  }
  res.render('pages/register');
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, password' });
    }

    const db = getDb();
    const user = await db('users').where({ email }).first();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, doctorId: user.doctor_id }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });
    }

    if (role !== 'doctor') {
      return res.status(400).json({ error: 'Apenas médicos podem se registrar. Pacientes são cadastrados por um médico.' });
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

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      token,
      user: { id, name, email, role, doctorId: null }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
}

function logout(req, res) {
  res.clearCookie('token');
  res.redirect('/');
}

module.exports = { renderLogin, renderRegister, login, register, logout };
