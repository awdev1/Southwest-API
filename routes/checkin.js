const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { runQuery, getQuery, getOneQuery } = require('../utils/dbUtils');
const { assignBoardingPosition } = require('../utils/bookingUtils');
const { generateBoardingPassImage } = require('../utils/canvasUtils');

const router = express.Router();

router.post('/image', isAuthenticated, async (req, res) => {
  const { confirmationNumber } = req.body;

  try {
    const booking = await getOneQuery('SELECT * FROM bookings WHERE confirmationNumber = ?', [confirmationNumber]);
    if (!booking) return res.status(404).json({ error: 'Confirmation number not found' });

    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [booking.flightId]);
    if (!flight) return res.status(500).json({ error: 'Flight data not found' });

    const user = await getOneQuery('SELECT hasEarlyBird FROM users WHERE id = ?', [req.session.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isEarlyBird = user.hasEarlyBird === 1;
    if (user.hasEarlyBird === null) {
      console.warn(`hasEarlyBird is NULL for user ${req.session.user.id}, treating as non-Early Bird`);
    }
    const checkInWindowHours = isEarlyBird ? 36 : 24;

    const now = new Date();
    const departureTime = new Date(flight.departure);
    const timeDifference = (departureTime - now) / (1000 * 60 * 60);
    if (timeDifference > checkInWindowHours) {
      return res.status(400).json({ 
        error: `Check-in is only allowed within ${checkInWindowHours} hours before departure` 
      });
    }

    if (!booking.boardingPosition) {
      const bookings = await getQuery('SELECT * FROM bookings WHERE flightId = ?', [flight.id]);
      const position = assignBoardingPosition(flight.id, bookings);
      const group = position.slice(0, 1);

      await runQuery(
        'UPDATE bookings SET boardingGroup = ?, boardingPosition = ? WHERE confirmationNumber = ?',
        [group, position, confirmationNumber]
      );
      booking.boardingGroup = group;
      booking.boardingPosition = position;
    }

    const boardingPass = {
      confirmationNumber: booking.confirmationNumber,
      flightId: flight.id,
      from: flight.from,
      to: flight.to,
      aircraft: flight.aircraft,
      departure: flight.departure,
      passenger: `${req.session.user ? req.session.user.username : 'Guest'}#${
        req.session.user ? req.session.user.discriminator : '0000'
      }`,
      boardingGroup: booking.boardingGroup,
      boardingPosition: booking.boardingPosition,
      checkedInAt: new Date().toISOString(),
    };

    await runQuery('UPDATE bookings SET checkedInAt = ? WHERE confirmationNumber = ?', [
      boardingPass.checkedInAt,
      confirmationNumber,
    ]);

    const buffer = generateBoardingPassImage(boardingPass);
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;