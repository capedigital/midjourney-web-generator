const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errorHandler');

module.exports = function(req, res, next) {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            throw new AuthenticationError('Authentication required');
        }

        // Extract token (support both "Bearer token" and just "token")
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : authHeader;
        
        if (!token) {
            throw new AuthenticationError('Authentication token missing');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request
        req.user = decoded;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AuthenticationError('Invalid authentication token'));
        } else if (error.name === 'TokenExpiredError') {
            next(new AuthenticationError('Authentication token has expired'));
        } else {
            next(error);
        }
    }
};
