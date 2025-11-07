const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { getOneQuery } = require('../utils/dbUtils');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await getOneQuery('SELECT points FROM users WHERE id = ?', [req.session.user.id]);
    const points = user ? user.points : 0;
    res.json({ points });
  } catch (err) {
    console.error('Error retrieving points:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;