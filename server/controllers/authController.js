const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { asyncHandler, AuthorizationError } = require('../middleware/errorHandler');

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

function parseList(value) {
    if (!value) return [];
    return String(value)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

class AuthController {
    /**
     * Register a new user
     */
    register = asyncHandler(async (req, res) => {
        const { email, password, name, inviteCode, invite_code } = req.body;

        // Defense-in-depth: block self-service registration unless explicitly allowed
        const allowByDefault = (process.env.NODE_ENV || 'development') === 'development';
        const allowPublicSignup = parseBoolean(process.env.ALLOW_PUBLIC_SIGNUP, allowByDefault);
        const inviteCodes = [
            ...parseList(process.env.SIGNUP_INVITE_CODES),
            ...parseList(process.env.SIGNUP_INVITE_CODE)
        ];
        const providedInviteCode = (inviteCode || invite_code) ? String(inviteCode || invite_code).trim() : '';

        if (!allowPublicSignup) {
            const inviteOnlyEnabled = inviteCodes.length > 0;
            const inviteValid = inviteOnlyEnabled && providedInviteCode && inviteCodes.includes(providedInviteCode);
            if (!inviteValid) {
                throw new AuthorizationError(inviteOnlyEnabled ? 'Registration is invite-only' : 'Public registration is disabled');
            }
        }

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
                last_login: user.last_login
            },
            stats
        });
    });

    /**
     * Update user profile
     */
    updateProfile = asyncHandler(async (req, res) => {
        const { username, email } = req.body;

        const updatedUser = await userService.updateProfile(req.user.id, {
            username,
            email
        });

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                is_admin: updatedUser.is_admin
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
     * Update OpenRouter API key for the user
     */
    updateOpenRouterKey = asyncHandler(async (req, res) => {
        const { apiKey } = req.body;

        try {
            await userService.updateOpenRouterKey(req.user.id, apiKey);

            res.json({
                success: true,
                message: 'API key updated successfully'
            });
        } catch (error) {
            console.error('Error updating OpenRouter key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update API key. The database may need migration.'
            });
        }
    });

    /**
     * Get OpenRouter API Key (masked for security)
     */
    getOpenRouterKey = asyncHandler(async (req, res) => {
        try {
            const apiKey = await userService.getOpenRouterKey(req.user.id);

            // If key exists, return masked version for display
            let maskedKey = null;
            if (apiKey) {
                // Show first 10 chars and last 4 chars: "sk-or-v1-x...xyz"
                const firstPart = apiKey.substring(0, 10);
                const lastPart = apiKey.substring(apiKey.length - 4);
                maskedKey = `${firstPart}...${lastPart}`;
            }

            res.json({
                success: true,
                hasKey: !!apiKey,
                maskedKey: maskedKey,
                // Send full key only if explicitly requested (for editing)
                fullKey: req.query.full === 'true' ? apiKey : undefined
            });
        } catch (error) {
            console.error('Error getting OpenRouter key:', error);
            // Return empty response instead of error to handle missing column gracefully
            res.json({
                success: true,
                hasKey: false,
                maskedKey: null
            });
        }
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
