const { passport } = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignIn = passport.authenticate('local', { session: false });

// Middleware to require a specific user role
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
        }
        next();
    };
};

// Export the middleware functions
module.exports = {
    requireAuth,
    requireSignIn,
    requireRole
};