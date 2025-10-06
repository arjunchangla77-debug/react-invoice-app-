const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const db = require('../config/database');

const router = express.Router();

// Get all dental offices (excluding deleted ones)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, includeDeleted } = req.query;
  
  let query = `
    SELECT do.*, 
           COUNT(lm.id) as lune_count,
           GROUP_CONCAT(lm.serial_number) as lune_serials
    FROM dental_offices do
    LEFT JOIN lune_machines lm ON do.id = lm.dental_office_id AND lm.is_deleted = 0
    WHERE do.is_deleted = ?
  `;
  
  const params = [includeDeleted === 'true' ? 1 : 0];
  
  if (search) {
    query += ` AND (do.name LIKE ? OR do.npi_id LIKE ? OR do.state LIKE ? OR do.town LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }
  
  query += ` GROUP BY do.id ORDER BY do.created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching dental offices:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    const offices = rows.map(row => ({
      ...row,
      lune_serials: row.lune_serials ? row.lune_serials.split(',') : []
    }));
    
    res.json({ success: true, data: offices });
  });
  
  db.close();
});

// Get dental office by ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { includeDeleted } = req.query;
  
  let query = `
    SELECT do.*, 
           COUNT(lm.id) as lune_count
    FROM dental_offices do
    LEFT JOIN lune_machines lm ON do.id = lm.dental_office_id AND lm.is_deleted = 0
    WHERE do.id = ?
  `;
  
  // Only add the is_deleted condition if we're not including deleted records
  if (includeDeleted !== 'true') {
    query += ` AND do.is_deleted = 0`;
  }
  
  query += ` GROUP BY do.id`;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching dental office:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ success: false, message: 'Dental office not found' });
    }
    
    res.json({ success: true, data: row });
  });
  
  db.close();
});

// Search dental office by NPI
router.get('/search/npi/:npi', authenticateToken, (req, res) => {
  const db = getDb();
  const { npi } = req.params;
  
  const query = `
    SELECT do.*, 
           COUNT(lm.id) as lune_count
    FROM dental_offices do
    LEFT JOIN lune_machines lm ON do.id = lm.dental_office_id AND lm.is_deleted = 0
    WHERE do.npi_id = ? AND do.is_deleted = 0
    GROUP BY do.id
  `;
  
  db.get(query, [npi], (err, row) => {
    if (err) {
      console.error('Error searching dental office by NPI:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ success: false, message: 'Dental office not found' });
    }
    
    res.json({ success: true, data: row });
  });
  
  db.close();
});

// Create new dental office
router.post('/', 
  authenticateToken,
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Office name is required'),
    body('npi_id').trim().isLength({ min: 10, max: 10 }).withMessage('NPI ID must be exactly 10 digits'),
    body('state').trim().isLength({ min: 1 }).withMessage('State is required'),
    body('town').trim().isLength({ min: 1 }).withMessage('Town is required'),
    body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
    body('phone_number').optional().trim(),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('lunes').isArray({ min: 1 }).withMessage('At least one lune machine is required'),
    body('lunes.*.serial_number').trim().isLength({ min: 1 }).withMessage('Serial number is required'),
    body('lunes.*.purchase_date').isISO8601().withMessage('Valid purchase date is required'),
    body('lunes.*.connected_phone').trim().isLength({ min: 1 }).withMessage('Connected phone number is required'),
    body('lunes.*.sbc_identifier').trim().isLength({ min: 1 }).withMessage('SBC identifier is required'),
    body('lunes.*.plan_type').trim().isLength({ min: 1 }).withMessage('Plan type is required')
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
    const { name, npi_id, state, town, address, phone_number, email, lunes } = req.body;
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Insert dental office
      const officeQuery = `
        INSERT INTO dental_offices (name, npi_id, state, town, address, phone_number, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(officeQuery, [name, npi_id, state, town, address, phone_number, email], function(err) {
        if (err) {
          console.error('Error creating dental office:', err);
          db.run('ROLLBACK');
          db.close();
          
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ 
              success: false, 
              message: 'NPI ID already exists' 
            });
          }
          
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        const officeId = this.lastID;
        
        // Insert lune machines
        const luneQuery = `
          INSERT INTO lune_machines (serial_number, dental_office_id, purchase_date, connected_phone, sbc_identifier, plan_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        let lunesInserted = 0;
        let hasError = false;
        
        lunes.forEach((lune, index) => {
          db.run(luneQuery, [lune.serial_number, officeId, lune.purchase_date, lune.connected_phone, lune.sbc_identifier, lune.plan_type], function(err) {
            if (err && !hasError) {
              console.error('Error creating lune machine:', err);
              hasError = true;
              db.run('ROLLBACK');
              db.close();
              
              if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ 
                  success: false, 
                  message: `Serial number ${lune.serial_number} already exists` 
                });
              }
              
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            lunesInserted++;
            
            if (lunesInserted === lunes.length && !hasError) {
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                res.status(201).json({ 
                  success: true, 
                  message: 'Dental office created successfully',
                  data: { id: officeId }
                });
              });
              
              db.close();
            }
          });
        });
      });
    });
  }
);

// Update dental office
router.put('/:id',
  authenticateToken,
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Office name is required'),
    body('state').trim().isLength({ min: 1 }).withMessage('State is required'),
    body('town').trim().isLength({ min: 1 }).withMessage('Town is required'),
    body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
    body('phone_number').optional().trim(),
    body('email').optional().isEmail().withMessage('Invalid email format')
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
    const { name, state, town, address, phone_number, email } = req.body;
    
    const query = `
      UPDATE dental_offices 
      SET name = ?, state = ?, town = ?, address = ?, phone_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_deleted = 0
    `;
    
    db.run(query, [name, state, town, address, phone_number, email, id], function(err) {
      if (err) {
        console.error('Error updating dental office:', err);
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        db.close();
        return res.status(404).json({ success: false, message: 'Dental office not found' });
      }
      
      res.json({ success: true, message: 'Dental office updated successfully' });
      db.close();
    });
  }
);

// Soft delete dental office (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Soft delete dental office
    const officeQuery = `
      UPDATE dental_offices 
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_deleted = 0
    `;
    
    db.run(officeQuery, [id], function(err) {
      if (err) {
        console.error('Error deleting dental office:', err);
        db.run('ROLLBACK');
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        db.close();
        return res.status(404).json({ success: false, message: 'Dental office not found' });
      }
      
      // Soft delete associated lune machines
      const lunesQuery = `
        UPDATE lune_machines 
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE dental_office_id = ? AND is_deleted = 0
      `;
      
      db.run(lunesQuery, [id], (err) => {
        if (err) {
          console.error('Error deleting associated lune machines:', err);
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          
          res.json({ success: true, message: 'Dental office deleted successfully' });
        });
        
        db.close();
      });
    });
  });
});

// Restore dental office
router.patch('/:id/restore', authenticateToken, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Restore dental office
    const officeQuery = `
      UPDATE dental_offices 
      SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_deleted = 1
    `;
    
    db.run(officeQuery, [id], function(err) {
      if (err) {
        console.error('Error restoring dental office:', err);
        db.run('ROLLBACK');
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        db.close();
        return res.status(404).json({ success: false, message: 'Dental office not found or not deleted' });
      }
      
      // Restore associated lune machines
      const lunesQuery = `
        UPDATE lune_machines 
        SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP
        WHERE dental_office_id = ? AND is_deleted = 1
      `;
      
      db.run(lunesQuery, [id], (err) => {
        if (err) {
          console.error('Error restoring associated lune machines:', err);
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          
          res.json({ success: true, message: 'Dental office restored successfully' });
        });
        
        db.close();
      });
    });
  });
});

// Permanently delete dental office (Admin only)
router.delete('/:id/permanent', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // First, permanently delete associated button usage data
    const buttonUsageQuery = `
      DELETE FROM button_usage 
      WHERE lune_machine_id IN (
        SELECT id FROM lune_machines WHERE dental_office_id = ?
      )
    `;
    
    db.run(buttonUsageQuery, [id], (err) => {
      if (err) {
        console.error('Error deleting button usage data:', err);
        db.run('ROLLBACK');
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      // Then, permanently delete associated invoices
      const invoicesQuery = `
        DELETE FROM invoices 
        WHERE dental_office_id = ?
      `;
      
      db.run(invoicesQuery, [id], (err) => {
        if (err) {
          console.error('Error deleting invoices:', err);
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Then, permanently delete associated lune machines
        const lunesQuery = `
          DELETE FROM lune_machines 
          WHERE dental_office_id = ?
        `;
        
        db.run(lunesQuery, [id], (err) => {
          if (err) {
            console.error('Error deleting lune machines:', err);
            db.run('ROLLBACK');
            db.close();
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          
          // Finally, permanently delete the dental office
          const officeQuery = `
            DELETE FROM dental_offices 
            WHERE id = ?
          `;
          
          db.run(officeQuery, [id], function(err) {
            if (err) {
              console.error('Error permanently deleting dental office:', err);
              db.run('ROLLBACK');
              db.close();
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              db.close();
              return res.status(404).json({ success: false, message: 'Dental office not found' });
            }
            
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
              }
              
              res.json({ success: true, message: 'Dental office permanently deleted' });
            });
            
            db.close();
          });
        });
      });
    });
  });
});

module.exports = router;
