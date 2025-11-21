const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Rooms ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Rooms WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create room (admin only)
router.post('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, capacity, pricePerNight, description } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('capacity', sql.Int, capacity)
      .input('pricePerNight', sql.Decimal(10, 2), pricePerNight)
      .input('description', sql.VarChar, description || null)
      .query('INSERT INTO Rooms (name, capacity, pricePerNight, description) OUTPUT INSERTED.* VALUES (@name, @capacity, @pricePerNight, @description)');
    
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update room (admin only)
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, capacity, pricePerNight, description } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.VarChar, name)
      .input('capacity', sql.Int, capacity)
      .input('pricePerNight', sql.Decimal(10, 2), pricePerNight)
      .input('description', sql.VarChar, description || null)
      .query('UPDATE Rooms SET name = @name, capacity = @capacity, pricePerNight = @pricePerNight, description = @description OUTPUT INSERTED.* WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete room (admin only)
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Rooms WHERE id = @id');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
