const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        let token;

        // Check if the token is arriving in the HTTP Authorization Header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]; // Extract the pure token string
        }

        // If no token found, deny access
        if (!token) {
            return res.status(401).json({ error: 'Not authorized, no login token provided' });
        }

        // Verify token authenticity and expiry (Part 2 step 5 requirement!)
        const decoded = verifyToken(token);

        // Attach the verified user details directly onto the request object
        req.user = await User.findById(decoded.id);
        
        next(); // Let them pass through to the core student route!
    } catch (err) {
        // If token has expired, jsonwebtoken throws a TokenExpiredError
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Your token has expired. Please log in again.' });
        }
        res.status(401).json({ error: 'Not authorized, token validation failed' });
    }
};

module.exports = { protect };