const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { apiAuth } = require('../middleware/auth.middleware');
const { getDb } = require('../db');

const router = Router();

// SSR pages
router.get('/', controller.renderLogin);
router.get('/register', controller.renderRegister);
router.get('/logout', controller.logout);

// API auth
router.post('/api/auth/login', controller.login);
router.post('/api/auth/register', controller.register);

// API me
router.get('/api/auth/me', apiAuth, async (req, res) => {
  try {
    const db = getDb();
    const user = await db('users')
      .select('id', 'name', 'email', 'role', 'doctor_id')
      .where('id', req.user.id)
      .first();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, doctorId: user.doctor_id });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
