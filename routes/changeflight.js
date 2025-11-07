const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { isStaffOrBot } = require('../middleware/bot');
const { runQuery, getOneQuery } = require('../utils/dbUtils');

const router = express.Router();

router.put('/:flightId', isAuthenticated, isStaffOrBot, async (req, res) => {
  const { flightId } = req.params;
  const { from, to, aircraft, departure, seats, acftReg } = req.body;

  console.log(`Staff user ${req.user.id} attempting to edit flight ${flightId}`);

  if (!from || !to || !aircraft || !departure || !seats || !acftReg) {
    return res.status(400).json({ error: 'All fields (from, to, aircraft, departure, seats, acftReg) are required' });
  }

  try {
    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    if (seats < flight.booked) {
      return res.status(400).json({ error: `Cannot reduce seats below the number of booked seats (${flight.booked})` });
    }

    const now = new Date();
    const newDepartureTime = new Date(departure);
    if (newDepartureTime < now) {
      return res.status(400).json({ error: 'New departure time must be in the future' });
    }

    await runQuery(
      `UPDATE flights SET "from" = ?, "to" = ?, aircraft = ?, departure = ?, seats = ?, acftReg = ? WHERE id = ?`,
      [from, to, aircraft, departure, seats, acftReg, flightId]
    );

    console.log(`Updated flight ${flightId}:`, { from, to, aircraft, departure, seats, acftReg });
    res.json({ message: `Flight ${flightId} updated successfully` });
  } catch (err) {
    console.error('Error editing flight:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/:flightId', isAuthenticated, isStaffOrBot, async (req, res) => {
  const { flightId } = req.params;
  console.log(`Staff user ${req.user.id} attempting to cancel flight ${flightId}`);

  try {
    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    await runQuery('DELETE FROM bookings WHERE flightId = ?', [flightId]);
    console.log(`Deleted bookings for flight ${flightId}`);

    await runQuery('DELETE FROM flights WHERE id = ?', [flightId]);
    console.log(`Canceled flight ${flightId}`);

    res.json({ message: `Flight ${flightId} canceled successfully` });
  } catch (err) {
    console.error('Error canceling flight:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;