const { getOneQuery } = require('../utils/dbUtils');

const isStaff = async (req, res, next) => {
  try {
    const user = await getOneQuery('SELECT * FROM users WHERE id = ?', [req.session.user?.id]);
    if (user && user.isStaff) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Staff access required' });
    }
  } catch (err) {
    console.error('Error checking staff status:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { isStaff };