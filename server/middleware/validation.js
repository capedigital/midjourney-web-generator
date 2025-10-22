const { ValidationError } = require('./errorHandler');

/**
 * Validate request body against schema
 */
function validateBody(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // Check required fields
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip validation if field is optional and not provided
            if (!rules.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation
            if (rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    errors.push(`${field} must be of type ${rules.type}`);
                    continue;
                }
            }

            // String validations
            if (rules.type === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must not exceed ${rules.maxLength} characters`);
                }
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }
                if (rules.email && !isValidEmail(value)) {
                    errors.push(`${field} must be a valid email address`);
                }
            }

            // Number validations
            if (rules.type === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`${field} must not exceed ${rules.max}`);
                }
            }

            // Array validations
            if (rules.type === 'array') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must have at least ${rules.minLength} items`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must not exceed ${rules.maxLength} items`);
                }
            }

            // Custom validation function
            if (rules.custom) {
                const customError = rules.custom(value, req.body);
                if (customError) {
                    errors.push(customError);
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join('; '));
        }

        next();
    };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.query[field];

            if (rules.required && !value) {
                errors.push(`Query parameter ${field} is required`);
                continue;
            }

            if (value && rules.type === 'number') {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    errors.push(`Query parameter ${field} must be a number`);
                } else {
                    req.query[field] = numValue;
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join('; '));
        }

        next();
    };
}

/**
 * Validate URL parameters
 */
function validateParams(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.params[field];

            if (rules.required && !value) {
                errors.push(`URL parameter ${field} is required`);
                continue;
            }

            if (value && rules.type === 'number') {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    errors.push(`URL parameter ${field} must be a number`);
                } else {
                    req.params[field] = numValue;
                }
            }

            if (value && rules.pattern && !rules.pattern.test(value)) {
                errors.push(`URL parameter ${field} format is invalid`);
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join('; '));
        }

        next();
    };
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(value) {
    if (typeof value === 'string') {
        return value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    return value;
}

/**
 * Common validation schemas
 */
const schemas = {
    register: {
        email: {
            required: true,
            type: 'string',
            email: true,
            maxLength: 255
        },
        password: {
            required: true,
            type: 'string',
            minLength: 8,
            maxLength: 100
        },
        name: {
            required: false,
            type: 'string',
            maxLength: 100
        }
    },
    login: {
        email: {
            required: true,
            type: 'string',
            email: true
        },
        password: {
            required: true,
            type: 'string'
        }
    },
    generatePrompts: {
        promptText: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 10000
        },
        model: {
            required: false,
            type: 'string',
            maxLength: 100
        }
    }
};

module.exports = {
    validateBody,
    validateQuery,
    validateParams,
    sanitizeInput,
    schemas
};
