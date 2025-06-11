const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if header exists and has the correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth failed: No token or incorrect format');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Extract token from header
  const token = authHeader.replace('Bearer ', '');

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth success: Decoded token payload:', decoded);
    
    // Set req.user to the user ID directly
    req.user = { id: decoded.user.id };
    console.log('Auth success: req.user set to:', req.user);
    next();
  } catch (err) {
    console.error('Auth failed: Token verification error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
}; 