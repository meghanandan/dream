// /auth-service/middlewares/authMiddleware.js
const { verifyAccessToken } = require('../utils/jwtUtils');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from headers

  if (!token) {
    return res.status(401).json({ message: 'Access Token Required' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or Expired Token' });
  }
};

module.exports = authenticateToken;
