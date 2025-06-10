const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const UserModel = require('../models/Users');
const jwt = require('jsonwebtoken');

// Local strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await UserModel.findOne({ username });
            if (!user) return done(null, false, { message: 'Incorrect username.' });
            
            const isMatch = await user.comparePassword(password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
            
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// JWT strategy for token authentication
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'cokgizlifurkan123'
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
        const user = await UserModel.findById(jwtPayload.id);
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    } catch (err) {
        return done(err, false);
    }
}));

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        jwtOptions.secretOrKey,
        { expiresIn: '1h' }
    );
};

module.exports = {
    passport,
    generateToken
};