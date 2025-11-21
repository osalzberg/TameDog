const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

// Get all blocked dates
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT bd.*, r.name as roomName FROM BlockedDates bd LEFT JOIN Rooms r ON bd.roomId = r.id ORDER BY bd.startDate');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get blocked dates for specific room
router.get('/room/:roomId', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('roomId', sql.Int, req.params.roomId)
      .query('SELECT * FROM BlockedDates WHERE roomId = @roomId ORDER BY startDate');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create blocked date range (admin only)
router.post('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { roomId, startDate, endDate, reason } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('roomId', sql.Int, roomId || null)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('reason', sql.VarChar, reason || null)
      .query('INSERT INTO BlockedDates (roomId, startDate, endDate, reason) OUTPUT INSERTED.* VALUES (@roomId, @startDate, @endDate, @reason)');
    
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update blocked date range (admin only)
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { roomId, startDate, endDate, reason } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('roomId', sql.Int, roomId || null)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('reason', sql.VarChar, reason)
      .query('UPDATE BlockedDates SET roomId = @roomId, startDate = @startDate, endDate = @endDate, reason = @reason OUTPUT INSERTED.* WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Blocked date not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete blocked date range (admin only)
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM BlockedDates WHERE id = @id');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Blocked date not found' });
    }
    
    res.json({ message: 'Blocked date deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
