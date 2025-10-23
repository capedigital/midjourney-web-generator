const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const { ConflictError, NotFoundError, AuthenticationError } = require('../middleware/errorHandler');

class UserService {
    /**
     * Create a new user
     */
    async createUser({ email, password, name }) {
        // Check if user already exists
        const existing = await this.findByEmail(email);
        if (existing) {
            throw new ConflictError('User already exists');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create username from email if name not provided
        const username = name || email.split('@')[0];

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, username, password_hash, created_at, last_login) 
             VALUES ($1, $2, $3, NOW(), NOW()) 
             RETURNING id, email, username, is_admin, is_active, created_at`,
            [email, username, password_hash]
        );

        return result.rows[0];
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const result = await pool.query(
            'SELECT id, email, username, password_hash, is_admin, is_active, created_at, last_login FROM users WHERE email = $1',
            [email]
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    async findById(id) {
        const result = await pool.query(
            'SELECT id, email, username, is_admin, is_active, created_at, last_login, discord_enabled, discord_channel_id FROM users WHERE id = $1',
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * Verify user credentials
     */
    async verifyCredentials(email, password) {
        const user = await this.findByEmail(email);
        
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }

        if (!user.is_active) {
            throw new AuthenticationError('Account is disabled');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Remove password hash from returned user
        delete user.password_hash;

        return user;
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId) {
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [userId]
        );
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, { username, email, discord_bot_token, discord_channel_id, discord_enabled }) {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (username) {
            updates.push(`username = $${paramIndex++}`);
            values.push(username);
        }

        if (email) {
            // Check if email is already taken by another user
            const existing = await this.findByEmail(email);
            if (existing && existing.id !== userId) {
                throw new ConflictError('Email already in use');
            }
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }

        // Handle Discord settings
        if (discord_bot_token !== undefined) {
            updates.push(`discord_bot_token = $${paramIndex++}`);
            values.push(discord_bot_token);
        }

        if (discord_channel_id !== undefined) {
            updates.push(`discord_channel_id = $${paramIndex++}`);
            values.push(discord_channel_id);
        }

        if (discord_enabled !== undefined) {
            updates.push(`discord_enabled = $${paramIndex++}`);
            values.push(discord_enabled);
        }

        if (updates.length === 0) {
            return await this.findById(userId);
        }

        values.push(userId);
        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} 
             RETURNING id, email, username, is_admin, is_active, discord_enabled, discord_channel_id`,
            values
        );

        return result.rows[0];
    }

    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const result = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValid) {
            throw new AuthenticationError('Current password is incorrect');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newHash, userId]
        );

        return true;
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_sessions,
                COUNT(DISTINCT DATE(created_at)) as days_active
             FROM prompt_sessions 
             WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Deactivate user account
     */
    async deactivateUser(userId) {
        await pool.query(
            'UPDATE users SET is_active = false WHERE id = $1',
            [userId]
        );
    }

    /**
     * Activate user account (admin only)
     */
    async activateUser(userId) {
        await pool.query(
            'UPDATE users SET is_active = true WHERE id = $1',
            [userId]
        );
    }
}

module.exports = new UserService();
