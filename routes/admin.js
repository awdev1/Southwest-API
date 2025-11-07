const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { runQuery, getOneQuery, getQuery, beginTransaction, commitTransaction, rollbackTransaction } = require('../utils/dbUtils');
const { isStaff } = require('../middleware/staff');

const router = express.Router();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function determineRapidRewardsStatus(points) {
  if (points >= 100000) return 'Companion Pass';
  if (points >= 40000) return 'A-List Preferred';
  if (points >= 20000) return 'A-List';
  return 'Base';
}

async function awardPointsToUser(userId, points, incrementFlightsAttended = false) {
  try {
    if (incrementFlightsAttended) {
      await runQuery(`
        UPDATE users 
        SET points = points + ?, flightsAttended = flightsAttended + 1 
        WHERE id = ?
      `, [points, userId]);
    } else {
      await runQuery('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
    }

    const updatedUser = await getOneQuery('SELECT points, flightsAttended FROM users WHERE id = ?', [userId]);
    if (!updatedUser) {
      throw new Error('User not found');
    }

    const newPoints = updatedUser.points || 0;
    const newStatus = determineRapidRewardsStatus(newPoints);
    const newFlightsAttended = updatedUser.flightsAttended || 0;

    await runQuery('UPDATE users SET rapidRwdStatus = ? WHERE id = ?', [newStatus, userId]);

    return { 
      success: true,
      message: `Awarded ${points} points to user ${userId}. New Rapid Rewards status: ${newStatus}`,
      newPoints,
      newStatus,
      newFlightsAttended
    };
  } catch (err) {
    throw new Error(`Error awarding points: ${err.message}`);
  }
}

async function removePointsFromUser(userId, pointsToRemove) {
  if (typeof pointsToRemove !== 'number' || pointsToRemove <= 0) {
    throw new Error('Points to remove must be a positive number');
  }

  const user = await getOneQuery('SELECT points FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('User not found');

  const currentPoints = user.points || 0;
  const newPoints = Math.max(0, currentPoints - pointsToRemove); // prevent negatives

  await runQuery('UPDATE users SET points = ? WHERE id = ?', [newPoints, userId]);
  const newStatus = determineRapidRewardsStatus(newPoints);
  await runQuery('UPDATE users SET rapidRwdStatus = ? WHERE id = ?', [newStatus, userId]);

  return {
    success: true,
    message: `Removed ${pointsToRemove} points from user ${userId}. New Rapid Rewards status: ${newStatus}`,
    newPoints,
    newStatus
  };
}

router.post('/removeflightpoints', isAuthenticated, isStaff, async (req, res) => {
  const { flightId, points } = req.body;

  if (!flightId || typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ error: 'flightId and points (positive number) are required' });
  }

  let transaction;
  try {
    transaction = await beginTransaction();

    const bookings = await getQuery('SELECT userId FROM bookings WHERE flightId = ?', [flightId]);

    if (!bookings || bookings.length === 0) {
      await rollbackTransaction(transaction);
      return res.status(404).json({ error: `No users found on flight ${flightId}` });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    const updatedUsers = [];

    for (let i = 0; i < bookings.length; i++) {
      const userId = bookings[i].userId;
      try {
        const result = await removePointsFromUser(userId, points);
        successCount++;
        updatedUsers.push({
          userId,
          newPoints: result.newPoints,
          newStatus: result.newStatus
        });
        if (i % 50 === 0) await delay(50); // throttle for performance or we will explode the server
      } catch (error) {
        failureCount++;
        errors.push(`Failed to remove points from user ${userId}: ${error.message}`);
      }
    }

    await commitTransaction(transaction);

    const message = `Removed ${points} points from ${successCount} users on flight ${flightId}.`;
    const response = { message, successCount, failureCount, updatedUsers };
    if (failureCount > 0) {
      response.errors = errors;
    }

    res.status(200).json(response);
  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    console.error('Error in /admin/removeflightpoints:', error.message);
    res.status(500).json({ error: 'Server error while removing points' });
  }
});

router.post('/awardpoints', isAuthenticated, isStaff, async (req, res) => {
  const { userId, points } = req.body;

  try {
    const result = await awardPointsToUser(userId, points); 
    res.json({ 
      message: result.message, 
      newPoints: result.newPoints, 
      newStatus: result.newStatus, 
      newFlightsAttended: result.newFlightsAttended 
    });
  } catch (err) {
    console.error('Error in /admin/awardpoints:', err.message);
    if (err.message.includes('User not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/removepoints', isAuthenticated, isStaff, async (req, res) => {
  const { userId, points } = req.body;

  if (!userId || typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ error: 'userId and positive points are required' });
  }

  try {
    const result = await removePointsFromUser(userId, points);
    res.json({
      message: result.message,
      newPoints: result.newPoints,
      newStatus: result.newStatus
    });
  } catch (err) {
    console.error('Error in /admin/removepoints:', err.message);
    if (err.message.includes('User not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/awardflightpoints', isAuthenticated, isStaff, async (req, res) => {
  const { flightId, points } = req.body;
  if (!flightId || !points || typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ error: 'flightId and points (positive number) are required' });
  }

  let transaction;
  try {
    transaction = await beginTransaction();

    const bookings = await getQuery('SELECT userId FROM bookings WHERE flightId = ?', [flightId]);

    if (!bookings || bookings.length === 0) {
      await rollbackTransaction(transaction);
      return res.status(404).json({ error: `No users found on flight ${flightId}` });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    const updatedUsers = [];

    const pointsUpdates = bookings.map(booking => ({
      userId: booking.userId,
      points: points
    }));

    for (let i = 0; i < pointsUpdates.length; i++) {
      const { userId } = pointsUpdates[i];
      try {
        const result = await awardPointsToUser(userId, points, true); 
        successCount++;
        updatedUsers.push({
          userId,
          newPoints: result.newPoints,
          newStatus: result.newStatus,
          newFlightsAttended: result.newFlightsAttended
        });
        if (i % 50 === 0) await delay(50);
      } catch (error) {
        failureCount++;
        errors.push(`Failed to award points to user ${userId}: ${error.message}`);
      }
    }

    await commitTransaction(transaction);

    const message = `Awarded ${points} points to ${successCount} users on flight ${flightId}.`;
    const response = { message, successCount, failureCount, updatedUsers };
    if (failureCount > 0) {
      response.errors = errors;
    }

    res.status(200).json(response);
  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    console.error('Error in /admin/awardflightpoints:', error.message);
    res.status(500).json({ error: 'Server error while awarding points' });
  }
});

router.post('/refresh-rapid-rewards', isAuthenticated, isStaff, async (req, res) => {
  let transaction;
  try {
    transaction = await beginTransaction();

    const users = await getQuery('SELECT id, points FROM users');

    if (!users || users.length === 0) {
      await rollbackTransaction(transaction);
      return res.status(404).json({ error: 'No users found in the database' });
    }

    const updatedUsers = [];
    const statusUpdates = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const currentPoints = user.points || 0;
      const newStatus = determineRapidRewardsStatus(currentPoints);

      statusUpdates.push({ userId: user.id, newStatus });
      updatedUsers.push({ userId: user.id, points: currentPoints, newStatus });

      if (i % 50 === 0) await delay(50);
    }

    for (const update of statusUpdates) {
      await runQuery('UPDATE users SET rapidRwdStatus = ? WHERE id = ?', [update.newStatus, update.userId]);
    }

    await commitTransaction(transaction);

    res.status(200).json({
      message: `Successfully refreshed Rapid Rewards statuses for ${updatedUsers.length} users.`,
      updatedCount: updatedUsers.length,
      updatedUsers
    });
  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    console.error('Error in /admin/refresh-rapid-rewards:', error.message);
    res.status(500).json({ error: 'Server error while refreshing Rapid Rewards statuses' });
  }
});

module.exports = router;