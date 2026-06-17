/** JWT-based admin authentication middleware. */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function signToken(admin) {
  return jwt.sign({ id: admin.id, username: admin.username }, SECRET, {
    expiresIn: '7d',
  });
}

function requireAdmin(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { signToken, requireAdmin, SECRET };
