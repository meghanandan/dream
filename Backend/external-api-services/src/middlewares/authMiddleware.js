const { verifyAccessToken } = require('../utils/jwtUtils');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: 'Access Token Required' });

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or Expired Token' });
  }
};

module.exports = { authenticateToken };
