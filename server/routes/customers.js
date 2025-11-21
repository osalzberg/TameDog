const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

// Get all customers (admin only)
router.get('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT id, email, firstName, lastName, role, createdAt FROM Users WHERE role = \'customer\' ORDER BY createdAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer by ID (admin only)
router.get('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id, email, firstName, lastName, role, createdAt FROM Users WHERE id = @id AND role = \'customer\'');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer bookings (admin only)
router.get('/:id/bookings', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT b.*, r.name as roomName FROM Bookings b JOIN Rooms r ON b.roomId = r.id WHERE b.userId = @id ORDER BY b.checkIn DESC');
    
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer info (admin only)
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('email', sql.VarChar, email)
      .query('UPDATE Users SET firstName = @firstName, lastName = @lastName, email = @email OUTPUT INSERTED.id, INSERTED.email, INSERTED.firstName, INSERTED.lastName, INSERTED.role, INSERTED.createdAt WHERE id = @id AND role = \'customer\'');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer (admin only)
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Users WHERE id = @id AND role = \'customer\'');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
