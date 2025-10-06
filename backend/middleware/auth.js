const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  console.log('Generating token with secret available:', !!process.env.JWT_SECRET);
  
  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    console.log('JWT decoded successfully, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    console.log('User lookup result:', user ? `Found user: ${user.username}` : 'User not found');
    
    if (!user) {
      console.log('Authentication failed: User not found for ID:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Token verification failed' 
      });
    }
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth
};
