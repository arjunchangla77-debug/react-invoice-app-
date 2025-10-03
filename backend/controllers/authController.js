const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

class AuthController {
  // Register new user
  static async register(req, res) {
    console.log('Registration attempt started for:', req.body.username);
    
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation failed:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, fullName } = req.body;
      console.log('Registration data validated for:', username);

      // Check if user already exists
      console.log('Checking if user exists:', username);
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        console.log('Username already exists:', username);
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Check if email already exists
      console.log('Checking if email exists:', email);
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        console.log('Email already exists:', email);
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Create new user
      console.log('Creating new user:', username);
      const userId = await User.create({ username, email, password, fullName });
      console.log('User created with ID:', userId);

      // Generate JWT token
      console.log('Generating JWT token for user:', userId);
      const token = generateToken(userId);
      console.log('JWT token generated successfully');

      // Get user data (excluding sensitive information)
      const userData = await User.findById(userId);
      delete userData.password_hash;
      delete userData.reset_token;
      delete userData.reset_token_expires;

      // Send welcome email (don't wait for it)
      emailService.sendWelcomeEmail(email, fullName || username)
        .catch(err => console.error('Failed to send welcome email:', err));

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: userData
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { login, password } = req.body;

      // Find user by username or email
      const user = await User.findByLogin(login);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Account not found. Please check your username/email or create a new account.'
        });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate JWT token
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role || 'user',
            createdAt: user.created_at,
            lastLogin: user.last_login
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      try {
        const { resetToken, user } = await User.generateResetToken(email);
        
        // Send password reset email
        await emailService.sendPasswordResetEmail(
          email, 
          resetToken, 
          user.full_name || user.username
        );

        res.json({
          success: true,
          message: 'Password reset email sent successfully'
        });

      } catch (error) {
        if (error.message === 'User not found') {
          // Don't reveal if email exists or not for security
          res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
          });
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, newPassword } = req.body;

      try {
        await User.resetPassword(token, newPassword);

        res.json({
          success: true,
          message: 'Password reset successfully'
        });

      } catch (error) {
        if (error.message === 'Invalid or expired reset token') {
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token'
          });
        }
        if (error.message === 'New password cannot be the same as your current password') {
          return res.status(400).json({
            success: false,
            message: 'New password cannot be the same as your current password'
          });
        }
        throw error;
      }

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role || 'user',
            createdAt: user.created_at,
            lastLogin: user.last_login
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { fullName, email } = req.body;

      // Basic validation
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      if (fullName && fullName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Full name cannot exceed 100 characters'
        });
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({
            success: false,
            message: 'Email is already registered to another account'
          });
        }
      }

      // Update profile
      await User.updateProfile(req.user.id, { fullName, email });

      // Get updated user data
      const updatedUser = await User.findById(req.user.id);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            createdAt: updatedUser.created_at,
            lastLogin: updatedUser.last_login
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Change password (for logged in users)
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      try {
        await User.changePassword(req.user.id, currentPassword, newPassword);

        // Send password change notification email (only if user has email notifications enabled)
        console.log('📧 Checking notification preferences for user:', req.user.id);
        try {
          const preferences = await User.getNotificationPreferences(req.user.id);
          console.log('📧 User notification preferences:', preferences);
          
          if (preferences && preferences.email_notifications) {
            console.log('📧 Attempting to send password change notification to:', req.user.email);
            const emailResult = await emailService.sendPasswordChangeNotification(req.user.email, req.user.username);
            console.log('📧 Password change email result:', emailResult);
          } else {
            console.log('📧 Email notifications disabled for user, skipping password change email');
          }
        } catch (emailError) {
          console.error('❌ Failed to send password change notification:', emailError);
          // Don't fail the password change if email fails
        }

        res.json({
          success: true,
          message: 'Password changed successfully'
        });

      } catch (error) {
        if (error.message === 'Current password is incorrect') {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }
        if (error.message === 'New password cannot be the same as your current password') {
          return res.status(400).json({
            success: false,
            message: 'New password cannot be the same as your current password'
          });
        }
        throw error;
      }

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }


  // Update notification preferences
  static async updateNotificationPreferences(req, res) {
    try {
      const { emailNotifications, systemNotifications } = req.body;

      // Validate preferences
      if (typeof emailNotifications !== 'boolean' || typeof systemNotifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Email and system notifications must be boolean values'
        });
      }

      // Update notification preferences
      await User.updateNotificationPreferences(req.user.id, {
        emailNotifications,
        systemNotifications
      });

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          emailNotifications,
          systemNotifications
        }
      });

    } catch (error) {
      console.error('Update notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(req, res) {
    try {
      const preferences = await User.getNotificationPreferences(req.user.id);
      
      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: 'User preferences not found'
        });
      }

      res.json({
        success: true,
        data: {
          emailNotifications: Boolean(preferences.email_notifications),
          systemNotifications: Boolean(preferences.system_notifications)
        }
      });

    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences'
      });
    }
  }
}

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_.@-]+$/)
    .withMessage('Username can contain letters, numbers, underscores, dots, @ and hyphens'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters')
];

const loginValidation = [
  body('login')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

module.exports = {
  AuthController,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
};
