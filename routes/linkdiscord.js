const express = require('express');
const crypto = require('crypto');
const { runQuery, getOneQuery } = require('../utils/dbUtils');
const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI, DISCORD_SCOPE } = require('../config/config');
const linkingCodes = require('../utils/linkingCodes');

const router = express.Router();

router.get('/', (req, res) => {
  const linkingCode = crypto.randomBytes(8).toString('hex');
  const isStaff = req.query.isStaff === 'true'; 
  linkingCodes.set(linkingCode, { userId: null, createdAt: Date.now(), isStaff });
  console.log(`Generated linking code: ${linkingCode} for ${isStaff ? 'staff' : 'public'}`);
  req.session.staffLogin = isStaff; 
  res.json({ linkingCode });
});

router.post('/verify', async (req, res) => {
  const { linkingCode } = req.body;
  const linkData = linkingCodes.get(linkingCode);

  if (!linkData || (Date.now() - linkData.createdAt) > 10 * 60 * 1000) {
    console.log(`Invalid or expired linking code: ${linkingCode}`);
    return res.status(400).json({ error: 'Invalid or expired linking code' });
  }

  if (!req.session.user) {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      DISCORD_REDIRECT_URI
    )}&response_type=code&scope=${DISCORD_SCOPE}&state=${linkingCode}`;
    console.log(`User not logged in, redirecting to OAuth with state: ${linkingCode}`);
    return res.json({ redirect: authUrl });
  }

  try {
    linkData.userId = req.session.user.id;
    linkingCodes.set(linkingCode, linkData);
    console.log(`Linking Discord ID ${req.session.user.id} with code ${linkingCode}`);

    const user = await getOneQuery('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (user) {
      const apiToken = crypto.randomBytes(16).toString('hex');
      await runQuery('UPDATE users SET linked = 1, apiToken = ? WHERE id = ?', [apiToken, req.session.user.id]);
      console.log(`User ${req.session.user.id} marked as linked with API token ${apiToken}`);

      const baseRedirect = linkData.isStaff ? 'https://luvcrew.southwestptfs.com' : 'https://southwestptfs.com';
      res.json({ message: 'Discord account linked successfully', redirect: `${baseRedirect}?linked=true` });
    } else {
      console.error(`User ${req.session.user.id} not found in database during linking`);
      return res.status(500).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error linking Discord account:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;