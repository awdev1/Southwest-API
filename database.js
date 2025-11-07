const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

const dbPath = path.join(dataDir, 'airline.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      aircraft TEXT NOT NULL,
      departure TEXT NOT NULL,
      seats INTEGER NOT NULL,
      booked INTEGER DEFAULT 0,
      acftReg TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating flights table:', err.message);
    } else {
      console.log('Flights table created or already exists.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      flightId TEXT NOT NULL,
      confirmationNumber TEXT UNIQUE NOT NULL,
      bookedAt TEXT NOT NULL,
      boardingGroup TEXT,
      boardingPosition TEXT,
      checkedInAt TEXT,
      FOREIGN KEY (flightId) REFERENCES flights(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating bookings table:', err.message);
    } else {
      console.log('Bookings table created or already exists.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      discriminator TEXT NOT NULL,
      avatar TEXT,
      points INTEGER DEFAULT 0,
      linked BOOLEAN DEFAULT 0,
      apiToken TEXT,
      isAdmin BOOLEAN DEFAULT 0,
      isBot BOOLEAN DEFAULT 0,
      isStaff BOOLEAN DEFAULT 0,
      rapidRwdStatus TEXT DEFAULT 'Base',
      flightsAttended INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS banned_users (
      userId TEXT PRIMARY KEY
    )
  `, (err) => {
    if (err) {
      console.error('Error creating banned_users table:', err.message);
    } else {
      console.log('Banned_users table created or already exists.');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN isStaff BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding isStaff column:', err.message);
    } else {
      console.log('isStaff column added or already exists.');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN rapidRwdStatus TEXT DEFAULT 'Base'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding rapidRwdStatus column:', err.message);
    } else {
      console.log('rapidRwdStatus column added or already exists.');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN flightsAttended INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding flightsAttended column:', err.message);
    } else {
      console.log('flightsAttended column added or already exists.');
    }
  });
});

module.exports = db;