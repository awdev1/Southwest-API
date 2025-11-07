const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const { runQuery, getQuery, getOneQuery } = require('../utils/dbUtils');
const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, DISCORD_SCOPE } = require('../config/config');
const linkingCodes = require('../utils/linkingCodes');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

const saveUser = async (userData) => {
  const start = Date.now();
  const existingUser = await getOneQuery('SELECT * FROM users WHERE id = ?', [userData.id]);

  if (!existingUser) {
    await runQuery(
      'INSERT INTO users (id, username, discriminator, avatar, points, linked, isAdmin, isBot, isStaff, rapidRwdStatus, flightsAttended) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, "Base", 0)',
      [userData.id, userData.username, userData.discriminator, userData.avatar || null]
    );

    const apiToken = crypto.randomBytes(16).toString('hex');
    await runQuery('UPDATE users SET linked = 1, apiToken = ? WHERE id = ?', [apiToken, userData.id]);
    console.log(`User ${userData.id} marked as linked with API token ${apiToken}`);

  } else {
    await runQuery(
      'UPDATE users SET username = ?, discriminator = ?, avatar = ? WHERE id = ?',
      [userData.username, userData.discriminator, userData.avatar || null, userData.id]
    );

    const apiToken = crypto.randomBytes(16).toString('hex');
    await runQuery('UPDATE users SET linked = 1, apiToken = ? WHERE id = ?', [apiToken, userData.id]);
    console.log(`User ${userData.id} marked as linked with API token ${apiToken}`);
  }
  console.log(`Users updated in ${Date.now() - start}ms`);
};

router.get('/discord', (req, res) => {
  const authUrl = `https://discord.com/oauth2/authorize?client_id=1359051325706342461&response_type=code&redirect_uri=https%3A%2F%2Fapi.southwestptfs.com%2Fauth%2Fdiscord%2Fcallback&scope=identify`;
  res.redirect(authUrl);
});

router.get('/discord/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
        scope: DISCORD_SCOPE,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );
    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 10000,
    });

    const userData = {
      id: userResponse.data.id,
      username: userResponse.data.username,
      discriminator: userResponse.data.discriminator,
      avatar: userResponse.data.avatar,
    };

    const bannedUser = await getOneQuery('SELECT userId FROM banned_users WHERE userId = ?', [userData.id]);
    if (bannedUser) {
      console.log(`Banned user ${userData.id} attempted to log in.`);
      return res.redirect("https://southwestptfs.com/banned");
    }

    await saveUser(userData);
    req.session.user = userData;

    const isStaffLogin = req.session.staffLogin || (state && linkingCodes.has(state) && linkingCodes.get(state).isStaff);
    const baseRedirect = isStaffLogin ? 'https://luvcrew.southwestptfs.com' : 'https://southwestptfs.com';

    if (state && linkingCodes.has(state)) {
      const linkData = linkingCodes.get(state);
      linkData.userId = userData.id;
      linkingCodes.set(state, linkData);

      await runQuery('UPDATE users SET linked = 1 WHERE id = ?', [userData.id]);
      res.redirect(`${baseRedirect}?linked=true`);
    } else {
      res.redirect(baseRedirect);
    }

    if (req.session.staffLogin) {
      delete req.session.staffLogin;
    }
  } catch (error) {
    console.error('OAuth error:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status) {
      res.status(500).json({ error: 'Failed to authenticate with Discord' });
    } else {
      res.status(500).json({ error: 'Server error during authentication' });
    }
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to log out' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

router.get('/user', isAuthenticated, async (req, res) => {
  try {
    const storedUser = await getOneQuery('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!storedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: storedUser.id,
        username: storedUser.username,
        discriminator: storedUser.discriminator,
        avatar: storedUser.avatar || null,
      },
    });
  } catch (error) {
    console.error('Error in /auth/user:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/details', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await getOneQuery('SELECT rapidRwdStatus FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ rapidRwdStatus: user.rapidRwdStatus || 'Base' });
  } catch (error) {
    console.error('Error in /auth/user/details:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;