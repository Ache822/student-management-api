const jwt = require('jsonwebtoken');

// Sign a brand new token containing user id and role
const signToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' } 
    );
};

// Verify if a token is valid or expired
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };