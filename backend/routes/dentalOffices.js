const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Get all dental offices (excluding deleted ones)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/dental-offices - Request received');
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
    
    console.log('Executing query:', query);
    console.log('With params:', params);
    
    const offices = await db.all(query, params);
    console.log('Query result:', offices ? `${offices.length} offices found` : 'No offices found');
    
    res.json({
      success: true,
      data: offices || []
    });
  } catch (error) {
    console.error('Error fetching dental offices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dental offices',
      error: error.message
    });
  }
});

// Create new dental office
router.post('/', [
  authenticateToken,
  body('name').notEmpty().withMessage('Office name is required'),
  body('npi_id').notEmpty().withMessage('NPI ID is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('town').notEmpty().withMessage('Town is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    console.log('POST /api/dental-offices - Request received');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, npi_id, state, town, address, phone_number, email, lunes } = req.body;

    // Check if office with same NPI ID already exists
    const existingOffice = await db.get(
      'SELECT id FROM dental_offices WHERE npi_id = ? AND is_deleted = 0',
      [npi_id]
    );

    if (existingOffice) {
      return res.status(400).json({
        success: false,
        message: 'An office with this NPI ID already exists'
      });
    }

    // Insert dental office
    const officeResult = await db.run(`
      INSERT INTO dental_offices (name, npi_id, state, town, address, phone_number, email, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, npi_id, state, town, address, phone_number, email, req.user.id]);

    const officeId = officeResult.id;
    console.log('Office created with ID:', officeId);

    // Insert lune machines if provided
    if (lunes && lunes.length > 0) {
      for (const lune of lunes) {
        if (lune.serial_number) {
          await db.run(`
            INSERT INTO lune_machines (
              dental_office_id, serial_number, purchase_date, 
              connected_phone, sbc_identifier, plan_type, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            officeId, lune.serial_number, lune.purchase_date,
            lune.connected_phone, lune.sbc_identifier, lune.plan_type, req.user.id
          ]);
        }
      }
    }

    // Fetch the created office with lune count
    const createdOffice = await db.get(`
      SELECT do.*, 
             COUNT(lm.id) as lune_count,
             GROUP_CONCAT(lm.serial_number) as lune_serials
      FROM dental_offices do
      LEFT JOIN lune_machines lm ON do.id = lm.dental_office_id AND lm.is_deleted = 0
      WHERE do.id = ?
      GROUP BY do.id
    `, [officeId]);

    console.log('Office created successfully:', createdOffice);

    res.status(201).json({
      success: true,
      message: 'Dental office created successfully',
      data: createdOffice
    });
  } catch (error) {
    console.error('Error creating dental office:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dental office',
      error: error.message
    });
  }
});

module.exports = router;
