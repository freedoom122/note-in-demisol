const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'nid_jwt_secret_change_in_production_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, isAdmin: !!user.isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Neautorizat' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ ok: false, error: 'Token invalid sau expirat' });
  }
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, function() {
    if (!req.user.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Acces interzis. Trebuie sa fii administrator.' });
    }
    next();
  });
}

module.exports = { generateToken, verifyToken, requireAuth, requireAdmin, JWT_SECRET };
