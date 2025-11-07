const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { getOneQuery, runQuery, getAllQuery } = require('../utils/dbUtils');

const router = express.Router();

router.get('/earlybird', isAuthenticated, async (req, res) => {
  try {
    const user = await getOneQuery('SELECT hasEarlyBird FROM users WHERE id = ?', [req.session.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ hasEarlyBird: !!user.hasEarlyBird }); 
  } catch (err) {
    console.error('Error retrieving Early Bird status:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});
router.get('/earlybird/list', isAdmin, async (req, res) => {
  try {
    const users = await getAllQuery('SELECT id, username FROM users WHERE hasEarlyBird = ?', [1]);
    res.json(users.map(user => ({ id: user.id, username: user.username || 'Unknown' })));
  } catch (err) {
    console.error('Error retrieving Early Bird users list:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/purchase/earlybird', isAuthenticated, async (req, res) => {
  try {
    const user = await getOneQuery('SELECT points, hasEarlyBird FROM users WHERE id = ?', [req.session.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.hasEarlyBird) {
      return res.status(400).json({ error: 'Early Bird Check-In already purchased' });
    }
    if (user.points < 15000) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    await runQuery('BEGIN TRANSACTION');
    try {
      await runQuery('UPDATE users SET points = points - ?, hasEarlyBird = ? WHERE id = ?', [15000, 1, req.session.user.id]);
      await runQuery('COMMIT');
      res.json({ message: 'Early Bird Check-In purchased successfully' });
    } catch (err) {
      await runQuery('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error purchasing Early Bird Check-In:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;