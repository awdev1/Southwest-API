const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const { PORT, SESSION_SECRET, allowedOrigins } = require('./config/config');
const db = require('./database');

const authRoutes = require('./routes/auth');
const flightsRoutes = require('./routes/flights');
const bookingsRoutes = require('./routes/bookings');
const checkinRoutes = require('./routes/checkin');
const bookRoutes = require('./routes/book');
const linkedRoutes = require('./routes/linked');
const linkDiscordRoutes = require('./routes/linkdiscord');
const rewardsRoutes = require('./routes/rewards');
const adminRoutes = require('./routes/admin');
const botRoutes = require('./routes/bot');
const userRoutes = require('./routes/users');
const changeflightRoutes = require('./routes/changeflight');
const upgrades = require('./routes/upgrades');
const employee = require('./routes/employee');

const app = express();

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

const cleanupPastFlights = async () => {
  try {
    console.log('Cleaning up past flights...');

    const pastFlights = await getQuery(
      `SELECT id, departure FROM flights WHERE departure < datetime(?, '-2 hours');`,
      [new Date().toISOString()]
    );

    if (pastFlights.length === 0) {
      console.log('No past flights to clean up.');
      return;
    }

    console.log('Past flights found:', pastFlights);

    const flightIds = pastFlights.map(flight => flight.id);

    await runQuery(
      `DELETE FROM bookings WHERE flightId IN (${flightIds.map(() => '?').join(',')})`,
      flightIds
    );
    console.log(`Deleted bookings for flights: ${flightIds.join(', ')}`);

    await runQuery(
      `DELETE FROM flights WHERE id IN (${flightIds.map(() => '?').join(',')})`,
      flightIds
    );
    console.log(`Deleted past flights: ${flightIds.join(', ')}`);
  } catch (err) {
    console.error('Error cleaning up past flights:', err.message);
  }
};

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Request logging to logs/access.log
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}
const accessLogStream = fs.createWriteStream(
  path.join(logDirectory, 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use('/auth', authRoutes);
app.use('/flights', flightsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/checkin', checkinRoutes);
app.use('/book', bookRoutes);
app.use('/linked', linkedRoutes);
app.use('/linkdiscord', linkDiscordRoutes);
app.use('/rewards', rewardsRoutes);
app.use('/admin', adminRoutes);
app.use('/bot', botRoutes);
app.use('/users', userRoutes);
app.use('/changeflight', changeflightRoutes);
app.use('/upgrades', upgrades);
app.use('/employee', employee);
app.get('/', (req, res) => {
  res.status(200).json({ message: '200 OK' });
});

cleanupPastFlights().then(() => {
  console.log('Initial cleanup completed.');
});

setInterval(cleanupPastFlights, 5 * 60 * 1000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
