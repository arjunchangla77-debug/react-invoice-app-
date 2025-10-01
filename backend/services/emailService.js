/**
 * Email Service
 * 
 * Handles all email functionality for the EnamelPure system including:
 * - Password reset emails
 * - Welcome emails for new users
 * - Invoice notifications with PDF attachments
 * - Password change notifications
 * 
 * Uses mock email service for deployment without nodemailer dependency.
 * Can be upgraded to use real email service later.
 */

require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   * Checks for valid email credentials and sets up SMTP connection
   */
  initializeTransporter() {
    // Check if email credentials are properly configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
        process.env.EMAIL_USER === 'your_email@gmail.com' || 
        process.env.EMAIL_PASS === 'your_app_password') {
      console.warn('Email credentials not configured. Email functionality will be disabled.');
      this.transporter = null;
      return;
    }

    // Mock transporter - nodemailer not available
    console.log('📧 Email service running in mock mode (nodemailer not installed)');
    this.transporter = null;
  }

  /**
   * Send password reset email to user
   * @param {string} email - User's email address
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's name for personalization
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    // Check if email service is configured
    if (!this.transporter) {
      console.log('Email service not configured - simulating password reset email');
      console.log(`Reset token for ${email}: ${resetToken}`);
      console.log(`Reset URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
      return { success: true, messageId: 'simulated', mode: 'development' };
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request - EnamelPure',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - EnamelPure</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #38bdf8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #1e40af; }
            .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>EnamelPure Invoice Management System</p>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              <p>We received a request to reset your password for your EnamelPure account.</p>
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in ${process.env.RESET_TOKEN_EXPIRY || 30} minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If you're having trouble clicking the button, you can also visit the reset page directly and enter this token:</p>
              <p style="font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 14px;">
                ${resetToken}
              </p>
            </div>
            <div class="footer">
              <p>This email was sent from EnamelPure Invoice Management System</p>
              <p>If you have any questions, please contact our support team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, userName) {
    // Check if email service is configured
    if (!this.transporter) {
      console.log('Email service not configured - simulating welcome email');
      console.log(`Welcome email for ${email} (${userName})`);
      return { success: true, messageId: 'simulated', mode: 'development' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to EnamelPure - Account Created Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to EnamelPure</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #38bdf8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to EnamelPure!</h1>
              <p>Your account has been created successfully</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Thank you for joining EnamelPure Invoice Management System! Your account is now ready to use.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
              </div>
              
              <h3>What you can do with EnamelPure:</h3>
              
              <div class="feature">
                <h4>🏥 Dental Office Management</h4>
                <p>Manage multiple dental offices with their contact details and locations</p>
              </div>
              
              <div class="feature">
                <h4>🖥️ Lune Machine Tracking</h4>
                <p>Monitor and track all Lune laser machines across your dental offices</p>
              </div>
              
              <div class="feature">
                <h4>📊 Usage Analytics</h4>
                <p>View detailed usage statistics and button press data for each machine</p>
              </div>
              
              <div class="feature">
                <h4>📄 Invoice Generation</h4>
                <p>Generate monthly invoices based on machine usage and billing data</p>
              </div>
              
              <div class="feature">
                <h4>🔍 Search & Filter</h4>
                <p>Easily search and filter offices, machines, and invoices</p>
              </div>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>Welcome to EnamelPure - Dental Office & Lune Machine Management</p>
              <p>Start managing your dental offices and Lune machines efficiently!</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome email - it's not critical
      return { success: false, error: error.message };
    }
  }

  async sendPasswordChangeNotification(email, userName) {
    // Check if email service is configured
    if (!this.transporter) {
      console.log('Email service not configured - simulating password change notification');
      console.log(`Password change notification for ${email} (${userName})`);
      return { success: true, messageId: 'simulated', mode: 'development' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Changed Successfully - EnamelPure',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed - EnamelPure</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Changed Successfully</h1>
              <p>EnamelPure Invoice Management System</p>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              
              <div class="success-box">
                <strong>✅ Password Updated</strong>
                <p>Your password has been successfully changed on ${new Date().toLocaleString()}.</p>
              </div>
              
              <p>Your EnamelPure account password has been updated successfully. You can continue using your account with the new password.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>If you did not make this change, please contact support immediately</li>
                  <li>Make sure to keep your new password secure and don't share it with anyone</li>
                  <li>Consider using a password manager for better security</li>
                </ul>
              </div>
              
              <p>If you have any concerns about this password change or need assistance, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>This notification was sent from EnamelPure Invoice Management System</p>
              <p>For security questions, please contact our support team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password change notification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password change notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendInvoiceGeneratedNotification(officeEmail, invoiceData, pdfBuffer = null) {
    // Handle both old format (individual params) and new format (object)
    let officeName, invoiceNumber, invoiceAmount, invoiceMonth, invoiceYear;
    
    if (typeof invoiceData === 'string') {
      // Old format: sendInvoiceGeneratedNotification(email, name, number, amount, month, year, pdf)
      officeName = invoiceData;
      invoiceNumber = arguments[2];
      invoiceAmount = arguments[3];
      invoiceMonth = arguments[4];
      invoiceYear = arguments[5];
      pdfBuffer = arguments[6];
    } else {
      // New format: sendInvoiceGeneratedNotification(email, {data}, pdf)
      officeName = invoiceData.officeName;
      invoiceNumber = invoiceData.invoiceNumber;
      invoiceAmount = invoiceData.totalAmount;
      
      // Extract month/year from dates if available
      if (invoiceData.issueDate) {
        const date = new Date(invoiceData.issueDate);
        invoiceMonth = date.getMonth() + 1;
        invoiceYear = date.getFullYear();
      } else {
        invoiceMonth = new Date().getMonth() + 1;
        invoiceYear = new Date().getFullYear();
      }
    }

    // Check if email service is configured
    if (!this.transporter) {
      console.log('Email service not configured - simulating invoice notification');
      console.log(`Invoice notification for ${officeEmail} - Invoice: ${invoiceNumber}`);
      return { success: true, messageId: 'simulated', mode: 'development' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: officeEmail,
      subject: `New Invoice Generated - ${invoiceNumber} - EnamelPure`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice Generated - EnamelPure</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #38bdf8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .invoice-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #2563eb; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; text-align: center; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #374151; }
            .info-value { color: #6b7280; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>Dear ${officeName},</h2>
              <p>A new invoice has been generated for your dental office based on your Lune machine usage.</p>
              
              <div class="invoice-box">
                <h3 style="text-align: center; color: #2563eb; margin-top: 0;">Invoice Details</h3>
                
                <div class="info-row">
                  <span class="info-label">Invoice Number:</span>
                  <span class="info-value">${invoiceNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Billing Period:</span>
                  <span class="info-value">${invoiceMonth}/${invoiceYear}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Generated Date:</span>
                  <span class="info-value">${new Date().toLocaleDateString()}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Office:</span>
                  <span class="info-value">${officeName}</span>
                </div>
                
                <div class="amount">
                  Total Amount: $${parseFloat(invoiceAmount).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Add PDF attachment if provided and valid
    if (pdfBuffer && pdfBuffer.length > 0) {
      mailOptions.attachments = [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];
      console.log(`PDF attachment added: Invoice_${invoiceNumber}.pdf (${pdfBuffer.length} bytes)`);
    } else {
      console.log('No PDF attachment - sending email notification only');
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Invoice notification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending invoice notification:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.transporter) {
      console.log('Email service not configured - skipping connection test');
      return false;
    }
    
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
