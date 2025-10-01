const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const emailService = require('../services/emailService');
// const { generateInvoicePDF } = require('../utils/pdfGenerator'); // Not used - frontend handles PDF

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'users.db');

// Get database connection with proper error handling
const getDb = () => {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database connection error:', err);
    }
  });
};

// Get all invoices
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const { officeId, status, year, month, includeDeleted } = req.query;
  
  let query = `
    SELECT i.*, do.name as office_name, do.npi_id
    FROM invoices i
    JOIN dental_offices do ON i.dental_office_id = do.id
    WHERE do.is_deleted = 0
  `;
  
  // Add invoice deletion filter
  if (includeDeleted !== 'true') {
    query += ` AND (i.is_deleted = 0 OR i.is_deleted IS NULL)`;
  }
  
  const params = [];
  
  if (officeId) {
    query += ` AND i.dental_office_id = ?`;
    params.push(officeId);
  }
  
  if (status) {
    query += ` AND i.status = ?`;
    params.push(status);
  }
  
  if (year) {
    query += ` AND i.year = ?`;
    params.push(year);
  }
  
  if (month) {
    query += ` AND i.month = ?`;
    params.push(month);
  }
  
  query += ` ORDER BY i.year DESC, i.month DESC, i.generated_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    const invoices = rows.map(row => ({
      ...row,
      invoice_data: row.invoice_data ? JSON.parse(row.invoice_data) : null
    }));
    
    res.json({ success: true, data: invoices });
  });
  
  db.close();
});

// Get invoices for a specific office (must be before /:id route)
router.get('/office/:officeId', authenticateToken, (req, res) => {
  const db = getDb();
  const { officeId } = req.params;
  const { includeDeleted } = req.query;
  
  let query = `
    SELECT i.*, do.name as office_name, do.npi_id
    FROM invoices i
    JOIN dental_offices do ON i.dental_office_id = do.id
    WHERE i.dental_office_id = ? AND do.is_deleted = 0
  `;
  
  // Add invoice deletion filter
  if (includeDeleted !== 'true') {
    query += ` AND (i.is_deleted = 0 OR i.is_deleted IS NULL)`;
  }
  
  query += ` ORDER BY i.year DESC, i.month DESC, i.generated_at DESC`;
  
  console.log(`Fetched invoices for office ${officeId} (includeDeleted: ${includeDeleted})`);
  
  db.all(query, [officeId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    console.log(`Fetched ${rows.length} invoices for office ${officeId} (includeDeleted: ${includeDeleted})`);
    res.json({ success: true, data: rows });
    db.close();
  });
});

// Get invoice by ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const query = `
    SELECT i.*, do.name as office_name, do.npi_id, do.address, do.phone_number, do.email
    FROM invoices i
    JOIN dental_offices do ON i.dental_office_id = do.id
    WHERE i.id = ? AND do.is_deleted = 0
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching invoice:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    const invoice = {
      ...row,
      invoice_data: row.invoice_data ? JSON.parse(row.invoice_data) : null
    };
    
    res.json({ success: true, data: invoice });
  });
  
  db.close();
});

// POST /api/invoices - Create custom invoice (Frontend will handle PDF and email)
router.post('/',
  authenticateToken,
  [
    body('dental_office_id').isInt().withMessage('Valid dental office ID is required'),
    body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
    body('issueDate').isISO8601().withMessage('Valid issue date is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').notEmpty().withMessage('Item description is required'),
    body('items.*.quantity').isFloat({ min: 0 }).withMessage('Valid quantity is required'),
    body('items.*.rate').isFloat({ min: 0 }).withMessage('Valid rate is required'),
    body('items.*.amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Valid subtotal is required'),
    body('tax').isFloat({ min: 0 }).withMessage('Valid tax is required'),
    body('total').isFloat({ min: 0 }).withMessage('Valid total is required')
  ],
  async (req, res) => {
    let db;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        dental_office_id,
        invoiceNumber,
        issueDate,
        dueDate,
        description,
        items,
        subtotal,
        tax,
        total,
        notes,
        selectedMonth,
        selectedYear
      } = req.body;

      db = getDb();

      // Check if invoice number already exists
      const existingInvoice = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNumber], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingInvoice) {
        db.close();
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists'
        });
      }

      // Verify dental office exists and is active
      const office = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM dental_offices WHERE id = ? AND is_deleted = 0', [dental_office_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!office) {
        db.close();
        return res.status(404).json({
          success: false,
          message: 'Dental office not found'
        });
      }

      // Extract month and year from issue date
      const issueDateObj = new Date(issueDate);
      const month = issueDateObj.getMonth() + 1;
      const year = issueDateObj.getFullYear();

      // Prepare invoice data
      const invoiceData = {
        office,
        invoiceNumber,
        issueDate,
        dueDate,
        description: description || '',
        items,
        subtotal,
        tax,
        total,
        notes: notes || '',
        selectedMonth: selectedMonth || month,
        selectedYear: selectedYear || year,
        type: 'custom'
      };

      // Insert invoice into database
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO invoices (
            dental_office_id, invoice_number, invoice_data, 
            total_amount, status, month, year, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          dental_office_id,
          invoiceNumber,
          JSON.stringify(invoiceData),
          total,
          'unpaid',
          selectedMonth || month,
          selectedYear || year
        ], function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID });
        });
      });

      db.close();

      // Return invoice data for frontend to generate PDF and send email
      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: {
          id: result.lastInsertRowid,
          invoice_number: invoiceNumber,
          total_amount: total,
          office_name: office.name,
          office_email: office.email,
          invoice_data: invoiceData
        }
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      
      // Ensure database connection is closed
      try {
        if (db && typeof db.close === 'function') {
          db.close();
        }
      } catch (closeError) {
        console.error('Error closing database:', closeError);
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        error: error.message
      });
    }
  }
);

// POST /api/invoices/send-email - Send invoice email with frontend-generated PDF
router.post('/send-email',
  authenticateToken,
  async (req, res) => {
    try {
      const {
        invoiceNumber,
        officeName,
        officeEmail,
        totalAmount,
        issueDate,
        dueDate,
        pdfBase64
      } = req.body;

      if (!invoiceNumber || !officeEmail) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number and office email are required'
        });
      }

      // Convert base64 PDF to buffer if provided
      let pdfBuffer = null;
      if (pdfBase64) {
        try {
          // Remove data URL prefix if present
          const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Buffer.from(base64Data, 'base64');
          console.log(`Received PDF from frontend: ${pdfBuffer.length} bytes`);
        } catch (error) {
          console.error('Error converting PDF base64:', error);
        }
      }

      // Send email notification with frontend PDF
      await emailService.sendInvoiceGeneratedNotification(officeEmail, {
        officeName: officeName || 'N/A',
        invoiceNumber,
        totalAmount: totalAmount || 0,
        issueDate: issueDate || new Date().toISOString(),
        dueDate: dueDate || new Date().toISOString()
      }, pdfBuffer);

      console.log('📧 Invoice notification sent successfully with frontend PDF');

      res.json({
        success: true,
        message: 'Invoice email sent successfully'
      });

    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send invoice email',
        error: error.message
      });
    }
  }
);

// Update invoice status
router.patch('/:id/status',
  authenticateToken,
  [
    body('status').isIn(['paid', 'unpaid']).withMessage('Status must be either paid or unpaid')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;
    
    const paidAt = status === 'paid' ? new Date().toISOString() : null;
    
    const query = `
      UPDATE invoices 
      SET status = ?, paid_at = ?
      WHERE id = ?
    `;
    
    db.run(query, [status, paidAt, id], function(err) {
      if (err) {
        console.error('Error updating invoice status:', err);
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        db.close();
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      
      res.json({ success: true, message: 'Invoice status updated successfully' });
      db.close();
    });
  }
);

// Permanently delete invoice (Admin only) - CANNOT be undone
// This route MUST come before the general /:id route
router.delete('/:id/permanent', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  console.log(`🗑️ Permanent delete request for invoice ID: ${id}`);
  
  // First check if invoice exists
  const checkQuery = `SELECT id, invoice_number FROM invoices WHERE id = ?`;
  
  db.get(checkQuery, [id], (err, invoice) => {
    if (err) {
      console.error('Error checking invoice:', err);
      db.close();
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!invoice) {
      console.log(`Invoice ID ${id} not found`);
      db.close();
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    // Permanently delete the invoice
    const deleteQuery = `DELETE FROM invoices WHERE id = ?`;
    
    db.run(deleteQuery, [id], function(err) {
      if (err) {
        console.error('Error permanently deleting invoice:', err);
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        console.log(`No changes made for invoice ID ${id}`);
        db.close();
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      
      console.log(`⚠️ Invoice ${invoice.invoice_number} (ID: ${id}) permanently deleted by admin`);
      res.json({ 
        success: true, 
        message: 'Invoice permanently deleted',
        deletedInvoice: {
          id: id,
          invoice_number: invoice.invoice_number
        }
      });
      db.close();
    });
  });
});

// Soft delete invoice (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const query = `
    UPDATE invoices 
    SET is_deleted = 1, deleted_at = datetime('now')
    WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
  `;
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting invoice:', err);
      db.close();
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, message: 'Invoice not found or already deleted' });
    }
    
    res.json({ success: true, message: 'Invoice deleted successfully' });
    db.close();
  });
});

// Restore invoice (Admin only)
router.patch('/:id/restore', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const query = `
    UPDATE invoices 
    SET is_deleted = 0, deleted_at = NULL
    WHERE id = ? AND is_deleted = 1
  `;
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error restoring invoice:', err);
      db.close();
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, message: 'Invoice not found or not deleted' });
    }
    
    res.json({ success: true, message: 'Invoice restored successfully' });
    db.close();
  });
});

module.exports = router;
