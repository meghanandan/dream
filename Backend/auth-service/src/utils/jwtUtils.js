// /auth-service/utils/jwtUtils.js
const jwt = require('jsonwebtoken');

// Generate Access Token (valid for 15 mins)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, user_id: user.user_id, emp_id:  user.emp_id   },
    process.env.JWT_SECRET,
    { expiresIn: '3h' }
  );
};

// Generate Refresh Token (valid for 7 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify Access Token
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_SECRET);
};

const setSession = (accessToken) => {
  if (accessToken) {
    return axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  } else {
    return delete axios.defaults.headers.common.Authorization;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setSession
};
