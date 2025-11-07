const isBot = require('../middleware/bot');
const express = require('express');
const crypto = require('crypto');
const { getOneQuery, runQuery } = require('../utils/dbUtils');

const router = express.Router();

router.get('/:discordId', isBot, async (req, res) => {
  const discordId = req.params.discordId;
  console.log(`Checking if Discord ID ${discordId} is linked`);

  try {
    const user = await getOneQuery('SELECT * FROM users WHERE id = ?', [discordId]);
    if (user && user.linked) {
      if (!user.apiToken) {
        const apiToken = crypto.randomBytes(16).toString('hex');
        await runQuery('UPDATE users SET apiToken = ? WHERE id = ?', [apiToken, discordId]);
        user.apiToken = apiToken;
        console.log(`Generated new API token for user ${discordId}: ${apiToken}`);
      }
      console.log(`User found for Discord ID ${discordId} and is linked:`, user);
      res.json({ linked: true, user: { ...user, apiToken: user.apiToken } });
    } else {
      console.log(`User not found or not linked for Discord ID ${discordId}`);
      res.json({ linked: false });
    }
  } catch (err) {
    console.error('Error checking linked status:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;