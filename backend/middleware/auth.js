const { passport } = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignIn = passport.authenticate('local', { session: false });

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
        }
        next();
    };
};

module.exports = {
    requireAuth,
    requireSignIn,
    requireRole
};