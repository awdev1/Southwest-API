const express = require('express');
const { getQuery } = require('../utils/dbUtils');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const flights = await getQuery('SELECT * FROM flights');
    res.json(flights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params; 
    const flight = await getQuery('SELECT * FROM flights WHERE id = ?', [flightId]);

    if (flight.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json(flight[0]); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;