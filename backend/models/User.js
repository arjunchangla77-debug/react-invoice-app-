const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
class User {
  // Create new user
  static async create(userData) {
    const { username, email, password, fullName } = userData;
    
    // Hash password (reduced salt round for better performance on free tier)
    const saltRounds = 8;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Set role - Eric_enamel001 gets admin role, others get user role
    const role = username === 'Eric_enamel001' ? 'admin' : 'user';
    
    const sql = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await db.run(sql, [username, email, passwordHash, fullName, role]);
    return result.id;
  }

  // Find user by username or email
  static async findByLogin(login) {
    const sql = `
      SELECT * FROM users 
      WHERE (username = ? OR email = ?) AND is_active = 1
    `;
    return await db.get(sql, [login, login]);
  }

  // Find user by ID
  static async findById(id) {
    const sql = `SELECT * FROM users WHERE id = ? AND is_active = 1`;
    return await db.get(sql, [id]);
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ? AND is_active = 1`;
    return await db.get(sql, [email]);
  }

  // Find user by username
  static async findByUsername(username) {
    const sql = `SELECT * FROM users WHERE username = ? AND is_active = 1`;
    return await db.get(sql, [username]);
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update last login
  static async updateLastLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [userId]);
  }

  // Generate password reset token
  static async generateResetToken(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRY || 30) * 60 * 1000);

    const sql = `
      UPDATE users 
      SET reset_token = ?, reset_token_expires = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.run(sql, [resetToken, expiresAt.toISOString(), user.id]);
    return { resetToken, user };
  }

  // Verify reset token
  static async verifyResetToken(token) {
    const sql = `
      SELECT * FROM users 
      WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP AND is_active = 1
    `;
    return await db.get(sql, [token]);
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const user = await this.verifyResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if new password is the same as current password
    const isSamePassword = await this.verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new Error('New password cannot be the same as your current password');
    }

    // Hash new password (reduced salt rounds for better performance)
    const saltRounds = 8;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const sql = `
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.run(sql, [passwordHash, user.id]);
    return user;
  }

  // Change password (for logged in users)
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password (reduced salt rounds for better performance)
    const saltRounds = 8;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const sql = `
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.run(sql, [passwordHash, userId]);
    return user;
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    const { fullName, email } = updateData;
    
    const sql = `
      UPDATE users 
      SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return await db.run(sql, [fullName, email, userId]);
  }


  // Deactivate user account
  static async deactivateAccount(userId) {
    const sql = `
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return await db.run(sql, [userId]);
  }

  // Get user stats
  static async getUserStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 END) as recent_logins
      FROM users
    `;
    
    return await db.get(sql);
  }

  // Update notification preferences
  static async updateNotificationPreferences(userId, preferences) {
    const { emailNotifications, systemNotifications } = preferences;
    const sql = `
      UPDATE users 
      SET email_notifications = ?, system_notifications = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [emailNotifications ? 1 : 0, systemNotifications ? 1 : 0, userId]);
  }

  // Get user notification preferences
  static async getNotificationPreferences(userId) {
    const sql = `
      SELECT email_notifications, system_notifications, theme_preference
      FROM users 
      WHERE id = ? AND is_active = 1
    `;
    return await db.get(sql, [userId]);
  }

  // Check if user is admin
  static async isAdmin(userId) {
    const sql = `
      SELECT role FROM users 
      WHERE id = ? AND is_active = 1
    `;
    const user = await db.get(sql, [userId]);
    return user && user.role === 'admin';
  }

  // Update user role (admin only function)
  static async updateUserRole(userId, newRole) {
    const sql = `
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [newRole, userId]);
  }

  // Get all users (admin only)
  static async getAllUsers(includeDeleted = false) {
    let sql = `
      SELECT 
        id, 
        username, 
        email, 
        full_name, 
        role, 
        is_active, 
        last_login, 
        created_at,
        updated_at
      FROM users 
    `;
    
    if (!includeDeleted) {
      sql += ` WHERE is_active = 1`;
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    return await db.all(sql);
  }

  // Update user role with validation
  static async updateRole(userId, newRole) {
    try {
      // First check if user exists
      const user = await this.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update the role
      const sql = `
        UPDATE users 
        SET role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.run(sql, [newRole, userId]);

      // Return updated user data
      const updatedUser = await this.findById(userId);
      return { 
        success: true, 
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          is_active: updatedUser.is_active,
          last_login: updatedUser.last_login,
          created_at: updatedUser.created_at
        }
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, message: 'Failed to update user role' };
    }
  }

  // Soft delete user (admin only)
  static async softDeleteUser(userId) {
    try {
      // First check if user exists and is active
      const sql = `
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_active = 1
      `;
      const result = await db.run(sql, [userId]);

      if (result.changes === 0) {
        return { success: false, message: 'User not found or already deleted' };
      }

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: 'Failed to delete user' };
    }
  }

  // Restore user (admin only)
  static async restoreUser(userId) {
    try {
      // Restore user by setting is_active to 1
      const sql = `
        UPDATE users 
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_active = 0
      `;
      const result = await db.run(sql, [userId]);

      if (result.changes === 0) {
        return { success: false, message: 'User not found or not deleted' };
      }

      return { success: true, message: 'User restored successfully' };
    } catch (error) {
      console.error('Error restoring user:', error);
      return { success: false, message: 'Failed to restore user' };
    }
  }

  // Delete user (admin only) - kept for backward compatibility
  static async deleteUser(userId) {
    return await this.softDeleteUser(userId);
  }

  // Get user by ID (including inactive users for admin operations)
  static async getUserById(userId) {
    try {
      const sql = `SELECT * FROM users WHERE id = ?`;
      return await db.get(sql, [userId]);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Permanently delete user (admin only) - CANNOT be undone
  static async permanentDeleteUser(userId) {
    try {
      // First check if user exists
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Permanently delete the user from database
      const sql = `DELETE FROM users WHERE id = ?`;
      const result = await db.run(sql, [userId]);

      if (result.changes === 0) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, message: 'User permanently deleted' };
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      return { success: false, message: 'Failed to permanently delete user' };
    }
  }
}

module.exports = User;
