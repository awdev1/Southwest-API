const express = require('express');
const { runQuery, getOneQuery } = require('../utils/dbUtils');

const router = express.Router();

router.patch('/:id', async (req, res) => {
  const { id: targetUserId } = req.params;
  const { isStaff, isAdmin } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. API token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const requestingUser = await getOneQuery(
      'SELECT * FROM users WHERE apiToken = ?',
      [token]
    );

    if (!requestingUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!requestingUser.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }

    const targetUser = await getOneQuery(
      'SELECT * FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    await runQuery(
      'UPDATE users SET isStaff = ?, isAdmin = ? WHERE id = ?',
      [isStaff ? 1 : 0, isAdmin ? 1 : 0, targetUserId]
    );

    const updatedUser = await getOneQuery(
      'SELECT * FROM users WHERE id = ?',
      [targetUserId]
    );

    console.log('Updated user:', updatedUser);
    res.json({ message: 'User updated successfully' });

  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
