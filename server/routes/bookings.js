const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

// Get all bookings (admin) or user's bookings (customer)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const pool = await getConnection();
    
    let query = 'SELECT b.*, u.email as customerEmail, u.firstName, u.lastName, r.name as roomName FROM Bookings b JOIN Users u ON b.userId = u.id JOIN Rooms r ON b.roomId = r.id';
    const request = pool.request();
    
    if (req.user.role !== 'admin') {
      query += ' WHERE b.userId = @userId';
      request.input('userId', sql.Int, req.user.id);
    }
    
    query += ' ORDER BY b.checkIn DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const pool = await getConnection();
    const request = pool.request()
      .input('id', sql.Int, req.params.id);
    
    let query = 'SELECT b.*, u.email as customerEmail, u.firstName, u.lastName, r.name as roomName FROM Bookings b JOIN Users u ON b.userId = u.id JOIN Rooms r ON b.roomId = r.id WHERE b.id = @id';
    
    if (req.user.role !== 'admin') {
      query += ' AND b.userId = @userId';
      request.input('userId', sql.Int, req.user.id);
    }
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check room availability
router.post('/check-availability', async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('roomId', sql.Int, roomId)
      .input('checkIn', sql.Date, checkIn)
      .input('checkOut', sql.Date, checkOut)
      .query('SELECT COUNT(*) as count FROM Bookings WHERE roomId = @roomId AND status != \'cancelled\' AND ((@checkIn BETWEEN checkIn AND checkOut) OR (@checkOut BETWEEN checkIn AND checkOut) OR (checkIn BETWEEN @checkIn AND @checkOut))');
    
    const blockedResult = await pool.request()
      .input('roomId', sql.Int, roomId)
      .input('checkIn', sql.Date, checkIn)
      .input('checkOut', sql.Date, checkOut)
      .query('SELECT COUNT(*) as count FROM BlockedDates WHERE roomId = @roomId AND ((@checkIn BETWEEN startDate AND endDate) OR (@checkOut BETWEEN startDate AND endDate) OR (startDate BETWEEN @checkIn AND @checkOut))');
    
    const available = result.recordset[0].count === 0 && blockedResult.recordset[0].count === 0;
    res.json({ available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create booking
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, notes } = req.body;
    const userId = req.user.id;
    const pool = await getConnection();
    
    const availabilityCheck = await pool.request()
      .input('roomId', sql.Int, roomId)
      .input('checkIn', sql.Date, checkIn)
      .input('checkOut', sql.Date, checkOut)
      .query('SELECT COUNT(*) as count FROM Bookings WHERE roomId = @roomId AND status != \'cancelled\' AND ((@checkIn BETWEEN checkIn AND checkOut) OR (@checkOut BETWEEN checkIn AND checkOut) OR (checkIn BETWEEN @checkIn AND @checkOut))');
    
    if (availabilityCheck.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Room is not available for the selected dates' });
    }
    
    const blockedCheck = await pool.request()
      .input('roomId', sql.Int, roomId)
      .input('checkIn', sql.Date, checkIn)
      .input('checkOut', sql.Date, checkOut)
      .query('SELECT COUNT(*) as count FROM BlockedDates WHERE roomId = @roomId AND ((@checkIn BETWEEN startDate AND endDate) OR (@checkOut BETWEEN startDate AND endDate) OR (startDate BETWEEN @checkIn AND @checkOut))');
    
    if (blockedCheck.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Room is blocked for the selected dates' });
    }
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('roomId', sql.Int, roomId)
      .input('checkIn', sql.Date, checkIn)
      .input('checkOut', sql.Date, checkOut)
      .input('notes', sql.VarChar, notes || null)
      .input('status', sql.VarChar, 'confirmed')
      .query('INSERT INTO Bookings (userId, roomId, checkIn, checkOut, status, notes, createdAt) OUTPUT INSERTED.* VALUES (@userId, @roomId, @checkIn, @checkOut, @status, @notes, GETDATE())');
    
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status (admin only)
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, status)
      .input('notes', sql.VarChar, notes)
      .query('UPDATE Bookings SET status = @status, notes = @notes OUTPUT INSERTED.* WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel booking
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.Int, req.params.id);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, req.user.id);
      const result = await request.query('UPDATE Bookings SET status = \'cancelled\' OUTPUT INSERTED.* WHERE id = @id AND userId = @userId');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Booking not found or not authorized' });
      }
      
      res.json({ message: 'Booking cancelled successfully', booking: result.recordset[0] });
    } else {
      const result = await request.query('UPDATE Bookings SET status = \'cancelled\' OUTPUT INSERTED.* WHERE id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      res.json({ message: 'Booking cancelled successfully', booking: result.recordset[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
