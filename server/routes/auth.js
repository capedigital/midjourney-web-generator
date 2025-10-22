const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password with bcrypt (10 rounds like digestorBot)
        const password_hash = await bcrypt.hash(password, 10);

        // Create user with username (defaults to email prefix)
        const username = name || email.split('@')[0];
        const result = await pool.query(
            'INSERT INTO users (email, username, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, username, is_admin',
            [email, username, password_hash]
        );

        const user = result.rows[0];

        // Update last_login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        // Generate token (30 days like current)
        const token = jwt.sign(
            { id: user.id, email: user.email, is_admin: user.is_admin }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                username: user.username,
                is_admin: user.is_admin 
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user
        const result = await pool.query(
            'SELECT id, email, username, password_hash, is_admin, is_active FROM users WHERE email = $1', 
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is disabled' });
        }

        // Verify password (using password_hash column)
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last_login timestamp
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        // Generate token with user info
        const token = jwt.sign(
            { id: user.id, email: user.email, is_admin: user.is_admin }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                username: user.username,
                is_admin: user.is_admin 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
