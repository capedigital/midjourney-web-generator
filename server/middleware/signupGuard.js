const { getConfig } = require('../config/env');

function parseList(value) {
    if (!value) return [];
    return String(value)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

/**
 * Blocks public self-service registration unless explicitly enabled.
 *
 * - Production default: disabled
 * - Development default: enabled (unless ALLOW_PUBLIC_SIGNUP explicitly set false)
 */
function signupGuard(req, res, next) {
    const config = getConfig();
    const allowByDefault = config.isDevelopment;
    const allowPublicSignup = parseBoolean(process.env.ALLOW_PUBLIC_SIGNUP, allowByDefault);

    const inviteCodes = [
        ...parseList(process.env.SIGNUP_INVITE_CODES),
        ...parseList(process.env.SIGNUP_INVITE_CODE)
    ];

    const providedInviteCode = (req.body && (req.body.inviteCode || req.body.invite_code))
        ? String(req.body.inviteCode || req.body.invite_code).trim()
        : '';

    if (!allowPublicSignup) {
        const inviteOnlyEnabled = inviteCodes.length > 0;
        const inviteValid = inviteOnlyEnabled && providedInviteCode && inviteCodes.includes(providedInviteCode);

        if (!inviteValid) {
            return res.status(403).json({
                success: false,
                error: inviteOnlyEnabled ? 'Registration is invite-only' : 'Public registration is disabled'
            });
        }
    }

    next();
}

module.exports = signupGuard;
