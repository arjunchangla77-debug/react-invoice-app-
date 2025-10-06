const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { 
  AuthController, 
  registerValidation, 
  loginValidation, 
  forgotPasswordValidation, 
  resetPasswordValidation, 
  changePasswordValidation 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no authentication required)
router.post('/register', authLimiter, registerValidation, AuthController.register);
router.post('/login', authLimiter, loginValidation, AuthController.login);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, AuthController.resetPassword);

// Protected routes (authentication required)
router.get('/profile', generalLimiter, authenticateToken, AuthController.getProfile);
router.put('/profile', generalLimiter, authenticateToken, AuthController.updateProfile);
router.post('/change-password', generalLimiter, authenticateToken, changePasswordValidation, AuthController.changePassword);
router.get('/notification-preferences', generalLimiter, authenticateToken, AuthController.getNotificationPreferences);
router.put('/notification-preferences', generalLimiter, authenticateToken, AuthController.updateNotificationPreferences);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check users in database
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.getAllUsers();
    res.json({
      success: true,
      message: `Found ${users.length} users in database`,
      users: users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Test email endpoint (development only)
router.post('/test-email', generalLimiter, authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Test endpoint not available in production' });
  }
  
  const { type } = req.body;
  const emailService = require('../services/emailService');
  
  try {
    let result;
    if (type === 'password') {
      result = await emailService.sendPasswordChangeNotification(req.user.email, req.user.username);
    } else if (type === 'invoice') {
      result = await emailService.sendInvoiceGeneratedNotification(
        req.user.email,
        'Test Office',
        'TEST-INV-001',
        150.00,
        12,
        2024
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid email type. Use "password" or "invoice"' });
    }
    
    res.json({ success: true, message: 'Test email sent', result });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
});

module.exports = router;
