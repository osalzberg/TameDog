const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, phone } = req.body;
      const pool = await getConnection();

      const existingUser = await pool.request()
        .input('email', sql.VarChar, email)
        .query('SELECT id FROM Users WHERE email = @email');

      if (existingUser.recordset.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.request()
        .input('email', sql.VarChar, email)
        .input('password', sql.VarChar, hashedPassword)
        .input('firstName', sql.VarChar, firstName)
        .input('lastName', sql.VarChar, lastName)
        .input('phone', sql.VarChar, phone || null)
        .input('role', sql.VarChar, 'customer')
        .query(`
          INSERT INTO Users (email, password, firstName, lastName, phone, role, createdAt)
          OUTPUT INSERTED.id, INSERTED.email, INSERTED.firstName, INSERTED.lastName, INSERTED.role
          VALUES (@email, @password, @firstName, @lastName, @phone, @role, GETDATE())
        `);

      const user = result.recordset[0];
      const token = generateToken(user);

      res.json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Login
router.post('/login',
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const adminUser = {
          id: 0,
          email: 'admin@tamedog.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        };
        const token = generateToken(adminUser);
        return res.json({ token, user: adminUser });
      }

      const pool = await getConnection();
      const result = await pool.request()
        .input('email', sql.VarChar, username)
        .query('SELECT * FROM Users WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.recordset[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user);
      delete user.password;
      
      res.json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get current user
router.get('/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

// Forgot Password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      const { email } = req.body;
      const pool = await getConnection();

      const result = await pool.request()
        .input('email', sql.VarChar, email)
        .query('SELECT id, email, firstName FROM Users WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
      }

      const user = result.recordset[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);

      await pool.request()
        .input('resetToken', sql.VarChar, resetToken)
        .input('resetTokenExpiry', sql.DateTime, resetTokenExpiry)
        .input('id', sql.Int, user.id)
        .query('UPDATE Users SET resetToken = @resetToken, resetTokenExpiry = @resetTokenExpiry WHERE id = @id');

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      
      console.log(`Password reset requested for ${email}`);
      console.log(`Reset URL: ${resetUrl}`);

      res.json({ 
        message: 'Password reset link has been sent.',
        resetUrl: resetUrl
      });

    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Reset Password
router.post('/reset-password/:token',
  [body('password').isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const { token } = req.params;
      const { password } = req.body;
      const pool = await getConnection();

      const result = await pool.request()
        .input('resetToken', sql.VarChar, token)
        .query('SELECT id, email, resetTokenExpiry FROM Users WHERE resetToken = @resetToken');

      if (result.recordset.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const user = result.recordset[0];

      if (new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.request()
        .input('password', sql.VarChar, hashedPassword)
        .input('id', sql.Int, user.id)
        .query('UPDATE Users SET password = @password, resetToken = NULL, resetTokenExpiry = NULL WHERE id = @id');

      console.log(`Password reset successful for user ID: ${user.id}`);

      res.json({ message: 'Password reset successful' });

    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
