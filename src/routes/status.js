const express = require('express');
const router = express.Router();

// Get flight status
router.get('/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;

    // Mock status data
    const status = {
      flightNumber: flightId,
      status: 'On Time',
      departureTime: '08:00',
      arrivalTime: '10:30',
      gate: 'A12',
      terminal: '1',
      baggage: 'Carousel 3',
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get flight status',
      details: error.message
    });
  }
});

// Get airport status
router.get('/airport/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // Mock airport status
    const airportStatus = {
      airport: code.toUpperCase(),
      name: 'Sample Airport',
      status: 'Normal Operations',
      delays: {
        departure: 0,
        arrival: 0
      },
      weather: {
        condition: 'Clear',
        temperature: 72,
        visibility: 'Good'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      airport: airportStatus
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get airport status',
      details: error.message
    });
  }
});

module.exports = router;
