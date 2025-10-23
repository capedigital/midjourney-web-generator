const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
    /**
     * Register a new user
     */
    register = asyncHandler(async (req, res) => {
        const { email, password, name } = req.body;

        // Create user
        const user = await userService.createUser({ email, password, name });

        // Generate JWT token
        const token = this.generateToken(user);

        // Return user and token
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                is_admin: user.is_admin
            }
        });
    });

    /**
     * Login user
     */
    login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Verify credentials
        const user = await userService.verifyCredentials(email, password);

        // Update last login
        await userService.updateLastLogin(user.id);

        // Generate token
        const token = this.generateToken(user);

        // Return user and token
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
    });

    /**
     * Get current user profile
     */
    getProfile = asyncHandler(async (req, res) => {
        const user = await userService.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user statistics
        const stats = await userService.getUserStats(user.id);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                is_admin: user.is_admin,
                created_at: user.created_at,
                last_login: user.last_login,
                discord_enabled: user.discord_enabled,
                discord_channel_id: user.discord_channel_id
            },
            stats
        });
    });

    /**
     * Update user profile
     */
    updateProfile = asyncHandler(async (req, res) => {
        const { username, email, discord_bot_token, discord_channel_id, discord_enabled } = req.body;

        const updatedUser = await userService.updateProfile(req.user.id, {
            username,
            email,
            discord_bot_token,
            discord_channel_id,
            discord_enabled
        });

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                is_admin: updatedUser.is_admin,
                discord_enabled: updatedUser.discord_enabled,
                discord_channel_id: updatedUser.discord_channel_id
            }
        });
    });

    /**
     * Change password
     */
    changePassword = asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        await userService.changePassword(req.user.id, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    });

    /**
     * Logout (client-side token removal, but we can add token blacklist later)
     */
    logout = asyncHandler(async (req, res) => {
        // For now, just confirm logout
        // In future, could add token blacklist to database
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });

    /**
     * Verify token (useful for checking if user is still authenticated)
     */
    verifyToken = asyncHandler(async (req, res) => {
        // Token is already verified by auth middleware
        const user = await userService.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                is_admin: user.is_admin
            }
        });
    });

    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }
}

module.exports = new AuthController();
