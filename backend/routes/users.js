const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const User = require('../models/User');

// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { includeDeleted } = req.query;
    const users = await User.getAllUsers(includeDeleted === 'true');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Update user role (Admin only)
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "user" or "admin"'
      });
    }

    // Prevent admin from demoting themselves
    if (parseInt(id) === req.user.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself from admin role'
      });
    }

    const result = await User.updateRole(id, role);
    
    if (result.success) {
      res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        data: result.user
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

// Soft delete user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const result = await User.softDeleteUser(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found or already deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Restore user (Admin only)
router.patch('/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await User.restoreUser(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'User restored successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found or not deleted'
      });
    }
  } catch (error) {
    console.error('Error restoring user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore user'
    });
  }
});

// Permanently delete user (Admin only) - CANNOT be undone
router.delete('/:id/permanent', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from permanently deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot permanently delete your own account'
      });
    }

    // Check if user exists and get user info before deletion
    const user = await User.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent permanent deletion of admin users for safety
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin users cannot be permanently deleted for security reasons'
      });
    }

    const result = await User.permanentDeleteUser(id);
    
    if (result.success) {
      console.log(`⚠️ User ${user.username} (ID: ${id}) permanently deleted by admin`);
      res.json({
        success: true,
        message: 'User permanently deleted',
        deletedUser: {
          id: id,
          username: user.username
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete user'
    });
  }
});

module.exports = router;
