const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { getOneQuery } = require('../utils/dbUtils');
const { isStaff } = require('../middleware/staff');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await getOneQuery('SELECT isStaff FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ isStaff: !!user.isStaff });
    } catch (err) {
        console.error('Error checking employee status:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/auth', isAuthenticated, async (req, res) => {
    const clientToken = req.headers['x-client-token'];
    if (!clientToken) {
        return res.status(400).json({ error: 'Client token missing' });
    }

    try {
        const userId = Buffer.from(clientToken, 'base64').toString('utf-8');
        console.log('EMPLOYEE: Decoded user ID from token:', userId);

        const user = await getOneQuery('SELECT isStaff FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ isStaff: !!user.isStaff });
    } catch (err) {
        console.error('Error checking employee status:', err.message);
        res.status(500).json({ error: 'Database error ' });
    }
});

module.exports = router;