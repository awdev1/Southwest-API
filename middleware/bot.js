const { getOneQuery } = require('../utils/dbUtils');

const isStaffOrBot = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. API token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const user = await getOneQuery('SELECT * FROM users WHERE apiToken = ?', [token]);
    console.log('Middleware - Token:', token, 'User:', user);
    if (user && (user.isBot || user.isStaff)) {
      req.user = user;
      return next();
    }
    res.status(403).json({ error: 'Forbidden: Staff or Bot access required.' });
  } catch (err) {
    console.error('Error validating token:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { isStaffOrBot };