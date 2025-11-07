const express = require('express');
const router = express.Router();

// Search for flights
router.get('/search', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({
        error: 'Missing required parameters: from, to, date'
      });
    }

    // Mock flight data for demonstration
    const flights = [
      {
        id: 'SW1234',
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        date: date,
        departure: '08:00',
        arrival: '10:30',
        price: 149.99,
        available: true
      },
      {
        id: 'SW5678',
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        date: date,
        departure: '14:00',
        arrival: '16:30',
        price: 129.99,
        available: true
      }
    ];

    res.json({
      success: true,
      count: flights.length,
      flights: flights
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to search flights',
      details: error.message
    });
  }
});

// Get flight details
router.get('/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;

    // Mock flight details
    const flight = {
      id: flightId,
      airline: 'Southwest Airlines',
      status: 'On Time',
      departure: {
        airport: 'LAX',
        time: '08:00',
        gate: 'A12'
      },
      arrival: {
        airport: 'SFO',
        time: '10:30',
        gate: 'B5'
      },
      aircraft: 'Boeing 737-800'
    };

    res.json({
      success: true,
      flight: flight
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get flight details',
      details: error.message
    });
  }
});

module.exports = router;
