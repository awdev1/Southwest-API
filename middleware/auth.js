const { getOneQuery } = require('../utils/dbUtils');
const path = require('path');

const isAuthenticated = async (req, res, next) => {
  let user;

  if (req.session.user) {
    user = req.session.user;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const dbUser = await getOneQuery('SELECT * FROM users WHERE apiToken = ?', [token]);
        if (dbUser) {
          user = {
            id: dbUser.id,
            username: dbUser.username,
            discriminator: dbUser.discriminator,
            avatar: dbUser.avatar,
          };
          req.session.user = user; 
        }
      } catch (err) {
        console.error('Error validating API token:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in via Discord or provide a valid API token.' });
  }

  try {
    const bannedUser = await getOneQuery('SELECT userId FROM banned_users WHERE userId = ?', [user.id]);
    if (bannedUser) {
      console.log(`Banned user ${user.id} attempted to access protected endpoint: ${req.method} ${req.originalUrl}`);
      return res.redirect("https://southwestptfs.com/banned.html");
    }
  } catch (err) {
    console.error('Error checking banned users:', err.message);
    return res.status(500).json({ error: 'Database error while checking ban status' });
  }

  next();
};

module.exports = { isAuthenticated };