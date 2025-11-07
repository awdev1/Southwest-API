const { getOneQuery } = require('../utils/dbUtils');

const isAdmin = async (req, res, next) => {
  try {
    const user = await getOneQuery('SELECT * FROM users WHERE id = ?', [req.session.user?.id]);
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (err) {
    console.error('Error checking admin status:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { isAdmin };