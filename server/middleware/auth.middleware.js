const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

function requireAuth(role) {
  return (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/');

    try {
      req.user = jwt.verify(token, JWT_SECRET);
      if (role && req.user.role !== role) return res.redirect('/');
      next();
    } catch {
      res.clearCookie('token');
      res.redirect('/');
    }
  };
}

function apiAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { requireAuth, apiAuth };
