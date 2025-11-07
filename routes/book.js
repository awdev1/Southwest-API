const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { runQuery, getOneQuery } = require('../utils/dbUtils');
const { generateConfirmationNumber } = require('../utils/bookingUtils');

const router = express.Router();

router.post('/', isAuthenticated, async (req, res) => {
  const { flightId } = req.body;

  if (!flightId) {
    return res.status(400).json({ error: 'Flight ID is required' });
  }

  try {
    const existingBooking = await getOneQuery(
      'SELECT * FROM bookings WHERE userId = ? AND flightId = ?',
      [req.session.user.id, req.body.flightId]
    );
    if (existingBooking) {
      return res.status(400).json({ error: 'User already has a booking for this flight. You may not book the same flight multiple times.' });
    }
    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    if (flight.booked >= flight.seats) {
      return res.status(400).json({ error: 'No seats available' });
    }

    await runQuery('UPDATE flights SET booked = booked + 1 WHERE id = ?', [flightId]);

    const confirmationNumber = generateConfirmationNumber();
    const booking = {
      id: `${flightId}-${Date.now()}`,
      userId: req.session.user.id,
      flightId,
      confirmationNumber,
      bookedAt: new Date().toISOString(),
    };

    await runQuery(
      'INSERT INTO bookings (id, userId, flightId, confirmationNumber, bookedAt) VALUES (?, ?, ?, ?, ?)',
      [booking.id, booking.userId, booking.flightId, booking.confirmationNumber, booking.bookedAt]
    );

    console.log(`Created booking for user ${req.session.user.id}:`, booking);
    res.json({ message: 'Flight booked successfully', booking });
  } catch (err) {
    console.error('Error booking flight:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;