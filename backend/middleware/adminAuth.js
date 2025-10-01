const User = require('../models/User');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be done by authenticateToken middleware first)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    const isAdmin = await User.isAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required. This feature is only available to administrators.'
      });
    }

    // User is admin, proceed to next middleware/route
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authorization'
    });
  }
};

module.exports = { requireAdmin };
