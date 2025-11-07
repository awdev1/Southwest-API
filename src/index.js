const express = require('express');
const dotenv = require('dotenv');
const flightRoutes = require('./routes/flights');
const statusRoutes = require('./routes/status');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Southwest API is running',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/flights', flightRoutes);
app.use('/api/status', statusRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Southwest API server running on port ${PORT}`);
  });
}

module.exports = app;
