const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'users.db');

// Get database connection
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// Add button usage data (for testing/demo purposes)
router.post('/',
  authenticateToken,
  [
    body('lune_machine_id').isInt({ min: 1 }).withMessage('Valid lune machine ID is required'),
    body('button_number').isInt({ min: 1, max: 6 }).withMessage('Button number must be between 1 and 6'),
    body('start_time').isISO8601().withMessage('Valid start time is required'),
    body('end_time').isISO8601().withMessage('Valid end time is required'),
    body('usage_date').isISO8601().withMessage('Valid usage date is required')
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
    const { lune_machine_id, button_number, start_time, end_time, usage_date } = req.body;
    
    // Calculate duration
    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();
    const durationSeconds = Math.round((endMs - startMs) / 1000);
    
    if (durationSeconds <= 0) {
      db.close();
      return res.status(400).json({ 
        success: false, 
        message: 'End time must be after start time' 
      });
    }
    
    // Check if lune machine exists
    const checkLuneQuery = `
      SELECT id FROM lune_machines 
      WHERE id = ? AND is_deleted = 0
    `;
    
    db.get(checkLuneQuery, [lune_machine_id], (err, lune) => {
      if (err) {
        console.error('Error checking lune machine:', err);
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (!lune) {
        db.close();
        return res.status(404).json({ success: false, message: 'Lune machine not found' });
      }
      
      // Insert button usage
      const insertQuery = `
        INSERT INTO button_usage (lune_machine_id, button_number, start_time, end_time, duration_seconds, usage_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(insertQuery, [
        lune_machine_id, 
        button_number, 
        start_time, 
        end_time, 
        durationSeconds, 
        usage_date
      ], function(err) {
        if (err) {
          console.error('Error creating button usage:', err);
          db.close();
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.status(201).json({ 
          success: true, 
          message: 'Button usage recorded successfully',
          data: { 
            id: this.lastID,
            duration_seconds: durationSeconds
          }
        });
        
        db.close();
      });
    });
  }
);

// Bulk insert button usage data
router.post('/bulk',
  authenticateToken,
  [
    body('usage_data').isArray({ min: 1 }).withMessage('Usage data array is required'),
    body('usage_data.*.lune_machine_id').isInt({ min: 1 }).withMessage('Valid lune machine ID is required'),
    body('usage_data.*.button_number').isInt({ min: 1, max: 6 }).withMessage('Button number must be between 1 and 6'),
    body('usage_data.*.start_time').isISO8601().withMessage('Valid start time is required'),
    body('usage_data.*.end_time').isISO8601().withMessage('Valid end time is required'),
    body('usage_data.*.usage_date').isISO8601().withMessage('Valid usage date is required')
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
    const { usage_data } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let insertedCount = 0;
      let hasError = false;
      
      const insertQuery = `
        INSERT INTO button_usage (lune_machine_id, button_number, start_time, end_time, duration_seconds, usage_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      usage_data.forEach((usage, index) => {
        // Calculate duration
        const startMs = new Date(usage.start_time).getTime();
        const endMs = new Date(usage.end_time).getTime();
        const durationSeconds = Math.round((endMs - startMs) / 1000);
        
        if (durationSeconds <= 0) {
          if (!hasError) {
            hasError = true;
            db.run('ROLLBACK');
            db.close();
            return res.status(400).json({ 
              success: false, 
              message: `Invalid duration for usage data at index ${index}` 
            });
          }
          return;
        }
        
        db.run(insertQuery, [
          usage.lune_machine_id,
          usage.button_number,
          usage.start_time,
          usage.end_time,
          durationSeconds,
          usage.usage_date
        ], function(err) {
          if (err && !hasError) {
            console.error('Error inserting button usage:', err);
            hasError = true;
            db.run('ROLLBACK');
            db.close();
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          
          insertedCount++;
          
          if (insertedCount === usage_data.length && !hasError) {
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
              }
              
              res.status(201).json({ 
                success: true, 
                message: `${insertedCount} button usage records created successfully`
              });
            });
            
            db.close();
          }
        });
      });
    });
  }
);

// Generate sample data for testing
router.post('/generate-sample/:luneId',
  authenticateToken,
  (req, res) => {
    const db = getDb();
    const { luneId } = req.params;
    const { month, year, recordsPerDay } = req.body;
    
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const dailyRecords = recordsPerDay || 10;
    
    // Check if lune machine exists
    const checkLuneQuery = `
      SELECT id FROM lune_machines 
      WHERE id = ? AND is_deleted = 0
    `;
    
    db.get(checkLuneQuery, [luneId], (err, lune) => {
      if (err) {
        console.error('Error checking lune machine:', err);
        db.close();
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (!lune) {
        db.close();
        return res.status(404).json({ success: false, message: 'Lune machine not found' });
      }
      
      // Generate sample data
      const sampleData = [];
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        for (let record = 0; record < dailyRecords; record++) {
          const buttonNumber = Math.floor(Math.random() * 6) + 1; // Random button 1-6
          const baseHour = 8 + Math.floor(Math.random() * 10); // 8 AM to 6 PM
          const baseMinute = Math.floor(Math.random() * 60);
          const duration = 30 + Math.floor(Math.random() * 300); // 30 seconds to 5 minutes
          
          const startTime = new Date(targetYear, targetMonth - 1, day, baseHour, baseMinute);
          const endTime = new Date(startTime.getTime() + duration * 1000);
          const usageDate = new Date(targetYear, targetMonth - 1, day);
          
          sampleData.push({
            lune_machine_id: parseInt(luneId),
            button_number: buttonNumber,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_seconds: duration,
            usage_date: usageDate.toISOString().split('T')[0]
          });
        }
      }
      
      // Insert sample data
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let insertedCount = 0;
        let hasError = false;
        
        const insertQuery = `
          INSERT INTO button_usage (lune_machine_id, button_number, start_time, end_time, duration_seconds, usage_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        sampleData.forEach((usage) => {
          db.run(insertQuery, [
            usage.lune_machine_id,
            usage.button_number,
            usage.start_time,
            usage.end_time,
            usage.duration_seconds,
            usage.usage_date
          ], function(err) {
            if (err && !hasError) {
              console.error('Error inserting sample data:', err);
              hasError = true;
              db.run('ROLLBACK');
              db.close();
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            insertedCount++;
            
            if (insertedCount === sampleData.length && !hasError) {
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                res.status(201).json({ 
                  success: true, 
                  message: `Generated ${insertedCount} sample usage records for month ${targetMonth}/${targetYear}`
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

module.exports = router;
