const express = require('express');
const { isStaffOrBot } = require('../middleware/bot');
const { runQuery, getOneQuery, getQuery } = require('../utils/dbUtils');

const router = express.Router();

router.post('/flights', isStaffOrBot, async (req, res) => {
  const { id, from, to, aircraft, departure, seats, acftReg } = req.body;

  if (!id || !from || !to || !aircraft || !departure || !seats || !acftReg) {
    return res.status(400).json({ error: 'Missing required fields: id, from, to, aircraft, departure, seats, acftReg' });
  }

  try {
    const existingFlight = await getOneQuery('SELECT id FROM flights WHERE id = ?', [id]);
    if (existingFlight) {
      return res.status(409).json({ error: 'Flight ID already exists' });
    }

    await runQuery(
      'INSERT INTO flights (id, "from", "to", aircraft, departure, seats, booked, acftReg) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [id, from, to, aircraft, departure, seats, acftReg]
    );

    console.log(`${req.user.isBot ? 'Bot' : 'Staff'} ${req.user.id} added flight ${id} with acftReg ${acftReg}`);
    res.status(201).json({ message: 'Flight added successfully', flight: { id, from, to, aircraft, departure, seats, acftReg } });
  } catch (err) {
    console.error('Error adding flight:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/flights/:id', isStaffOrBot, async (req, res) => {
  const flightId = req.params.id;

  try {
    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const bookings = await getQuery('SELECT id FROM bookings WHERE flightId = ?', [flightId]);
    if (bookings.length > 0) {
      return res.status(400).json({ error: 'Cannot delete flight with existing bookings' });
    }

    await runQuery('DELETE FROM flights WHERE id = ?', [flightId]);

    console.log(`${req.user.isBot ? 'Bot' : 'Staff'} ${req.user.id} deleted flight ${flightId}`);
    res.status(200).json({ message: `Flight ${flightId} deleted successfully` });
  } catch (err) {
    console.error('Error deleting flight:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/banned-users', isStaffOrBot, async (req, res) => {
  try {
    if (req.get('Content-Type') !== 'application/json') {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }

    const bannedUsers = req.body;

    if (!Array.isArray(bannedUsers) || !bannedUsers.every(id => typeof id === 'string')) {
      return res.status(400).json({ error: 'Request body must be a JSON array of user ID strings.' });
    }

    await runQuery(`
      CREATE TABLE IF NOT EXISTS banned_users (
        userId TEXT PRIMARY KEY
      )
    `);

    await runQuery('DELETE FROM banned_users');

    let insertedCount = 0;
    for (const userId of bannedUsers) {
      try {
        await runQuery('INSERT INTO banned_users (userId) VALUES (?)', [userId]);
        insertedCount++;
      } catch (err) {
        console.warn(`Failed to insert user ${userId}: ${err.message}`);
      }
    }

    console.log(`${req.user.isBot ? 'Bot' : 'Staff'} ${req.user.id} updated banned users list with ${insertedCount} users.`);
    res.status(200).json({ message: `Successfully updated banned users list with ${insertedCount} users.` });
  } catch (err) {
    console.error('Error updating banned users:', err.message);
    res.status(500).json({ error: 'Server error while updating banned users.' });
  }
});


module.exports = router;