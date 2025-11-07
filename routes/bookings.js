const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/airline.db');
console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database in bookings.js');
});

db.get('PRAGMA foreign_keys', (err, row) => {
  if (err) console.error('Error checking foreign_keys:', err.message);
  else console.log(`SQLite PRAGMA foreign_keys: ${row.foreign_keys}`);
});
db.get('PRAGMA journal_mode', (err, row) => {
  if (err) console.error('Error checking journal_mode:', err.message);
  else console.log(`SQLite PRAGMA journal_mode: ${row.journal_mode}`);
});

const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getOneQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const generateConfirmationNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const runTransaction = async (callback) => {
  await runQuery('PRAGMA foreign_keys = OFF');
  await runQuery('BEGIN TRANSACTION');
  try {
    const result = await callback();
    await runQuery('COMMIT');
    await runQuery('PRAGMA wal_checkpoint(FULL)');
    await runQuery('PRAGMA foreign_keys = ON');
    return result;
  } catch (err) {
    await runQuery('ROLLBACK');
    await runQuery('PRAGMA foreign_keys = ON');
    throw err;
  }
};

const router = express.Router();

router.post('/', isAuthenticated, async (req, res) => {
  const { flightId } = req.body;

  if (!flightId) {
    return res.status(400).json({ error: 'Flight ID is required' });
  }

  try {
    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    if (flight.booked >= flight.seats) {
      return res.status(400).json({ error: 'No seats available' });
    }

    await runQuery('UPDATE flights SET booked = booked + 1 WHERE id = ?', [flightId]);

    const confirmationNumber = generateConfirmationNumber();
    const bookingId = `${flightId}-${Date.now()}`;
    const booking = {
      id: bookingId,
      userId: req.session.user.id,
      flightId,
      confirmationNumber,
      bookedAt: new Date().toISOString(),
    };

    await runQuery(
      'INSERT INTO bookings (id, userId, flightId, confirmationNumber, bookedAt) VALUES (?, ?, ?, ?, ?)',
      [booking.id, booking.userId, booking.flightId, booking.confirmationNumber, booking.bookedAt]
    );

    const user = await getOneQuery('SELECT points FROM users WHERE id = ?', [req.session.user.id]);
    if (user) {
      const newPoints = (user.points || 0) + 100;
      await runQuery('UPDATE users SET points = ? WHERE id = ?', [newPoints, req.session.user.id]);
    }

    res.json({ message: 'Flight booked successfully', booking });
  } catch (err) {
    console.error('Error creating booking:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Fetching bookings for user: ${req.session.user.id}`);

    const allBookings = await getQuery('SELECT * FROM bookings');
    console.log('All bookings in database:', allBookings);

    const query = `SELECT b.id AS bookingId, b.userId, b.flightId, b.confirmationNumber, b.bookedAt,
                          b.boardingGroup, b.boardingPosition, b.checkedInAt,
                          f.id AS flightId, f."from", f."to", f.aircraft, f.departure, f.seats, f.booked, f.acftReg
                   FROM bookings b LEFT JOIN flights f ON b.flightId = f.id WHERE b.userId = ?`;
    const params = [req.session.user.id];
    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const userBookings = await getQuery(query, params);
    console.log('Raw bookings from database:', userBookings);

    if (!userBookings || userBookings.length === 0) {
      return res.json({ message: 'No bookings found for this user', bookings: [] });
    }

    const bookingsWithStatus = userBookings.map(booking => ({
      id: booking.bookingId,
      userId: booking.userId,
      flightId: booking.flightId,
      confirmationNumber: booking.confirmationNumber,
      bookedAt: booking.bookedAt,
      boardingGroup: booking.boardingGroup || null,
      boardingPosition: booking.boardingPosition || null,
      checkedInAt: booking.checkedInAt || null,
      flightExists: !!booking.flightId,
      flight: {
        id: booking.flightId || null,
        from: booking.from || null,
        to: booking.to || null,
        aircraft: booking.aircraft || null,
        departure: booking.departure || null,
        seats: booking.seats || null,
        booked: booking.booked || 0,
        acftReg: booking.acftReg || null,
      },
      status: booking.departure
        ? new Date(booking.departure) < new Date()
          ? 'Flight has departed'
          : 'Upcoming'
        : 'Unknown',
    }));

    res.json(bookingsWithStatus);
  } catch (err) {
    console.error('Error fetching bookings:', err.message, err.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/attended', isAuthenticated, async (req, res) => {
  try {
    console.log('Received request for /bookings/attended from user:', req.session.user?.id);
    const userId = req.session.user.id;
    const user = await getOneQuery('SELECT flightsAttended FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Fetched flightsAttended for user:', userId, 'Value:', user.flightsAttended);
    res.json({ attendedCount: user.flightsAttended || 0 });
  } catch (error) {
    console.error('Error in /bookings/attended:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/:confirmationNumber', isAuthenticated, async (req, res) => {
  const confirmationNumber = req.params.confirmationNumber;

  try {
    const booking = await getOneQuery(
      'SELECT * FROM bookings WHERE confirmationNumber = ? AND userId = ?',
      [confirmationNumber, req.session.user.id]
    );
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or you do not have permission to view it' });
    }

    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [booking.flightId]);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found for this booking' });
    }

    res.json({
      booking,
      flight,
      status: flight.departure
        ? new Date(flight.departure) < new Date()
          ? 'Flight has departed'
          : 'Upcoming'
        : 'Unknown',
    });
  } catch (err) {
    console.error('Error fetching booking by confirmation:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/cancel', isAuthenticated, async (req, res) => {
  const { bookingId } = req.body;

  console.log('Cancel request - bookingId:', bookingId, 'userId:', req.session.user.id);

  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    const bookingExists = await getOneQuery('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!bookingExists) {
      return res.status(404).json({ error: 'Booking does not exist in the database' });
    }

    const booking = await getOneQuery('SELECT * FROM bookings WHERE id = ? AND userId = ?', [
      bookingId,
      req.session.user.id,
    ]);
    if (!booking) {
      return res.status(403).json({ error: 'You do not have permission to cancel this booking' });
    }

    const flight = await getOneQuery('SELECT * FROM flights WHERE id = ?', [booking.flightId]);
    if (!flight) {
      const deleteResult = await runQuery('DELETE FROM bookings WHERE id = ?', [bookingId]);
      console.log(`Deleted ${deleteResult.changes} booking(s) with id ${bookingId} (flight not found)`);
      if (deleteResult.changes === 0) {
        return res.status(500).json({ error: 'Failed to delete booking from database' });
      }
      const verify = await getOneQuery('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      console.log(`Post-deletion check (flight not found): Booking still exists? ${!!verify}`);
      return res.status(200).json({ message: 'Booking canceled successfully (flight not found)' });
    }

    const departureTime = new Date(flight.departure);
    const now = new Date();
    if (departureTime < now) {
      return res.status(400).json({ error: 'Cannot cancel a flight that has already departed' });
    }

    await runTransaction(async () => {
      const deleteResult = await runQuery('DELETE FROM bookings WHERE id = ?', [bookingId]);
      console.log(`Deleted ${deleteResult.changes} booking(s) with id ${bookingId}`);

      if (deleteResult.changes === 0) {
        throw new Error('Failed to delete booking from database');
      }

      const updateResult = await runQuery('UPDATE flights SET booked = booked - 1 WHERE id = ?', [booking.flightId]);
      console.log(`Updated flight ${booking.flightId}, rows affected: ${updateResult.changes}`);
    });

    const verify = await getOneQuery('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    console.log(`Post-deletion check: Booking still exists? ${!!verify}`);
    if (verify) {
      throw new Error('Booking was not deleted from the database despite successful transaction');
    }

    res.status(200).json({ message: 'Booking canceled successfully' });
  } catch (err) {
    console.error('Error canceling booking:', err.message, err.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;