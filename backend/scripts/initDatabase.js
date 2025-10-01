const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Create database directory if it doesn't exist
    const dbDir = path.join(__dirname, '..', 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'users.db');

    // Initialize database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create all tables
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100),
          role VARCHAR(20) DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          last_login DATETIME,
          reset_token VARCHAR(255),
          reset_token_expires DATETIME,
          theme_preference VARCHAR(10) DEFAULT 'light',
          email_notifications BOOLEAN DEFAULT 1,
          system_notifications BOOLEAN DEFAULT 1
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        } else {
          console.log('Users table created successfully');
        }
      });

      // Add notification preference columns if they don't exist (migration)
      db.run(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding role column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN theme_preference VARCHAR(10) DEFAULT 'light'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding theme_preference column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding email_notifications column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN system_notifications BOOLEAN DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding system_notifications column:', err.message);
        }
      });

      // Dental offices table
      db.run(`
        CREATE TABLE IF NOT EXISTS dental_offices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          npi_id VARCHAR(20) UNIQUE NOT NULL,
          state VARCHAR(50) NOT NULL,
          town VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          phone_number VARCHAR(20),
          email VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0
        )
      `, (err) => {
        if (err) {
          console.error('Error creating dental_offices table:', err.message);
        } else {
          console.log('Dental offices table created successfully');
        }
      });

      // Lune machines table
      db.run(`
        CREATE TABLE IF NOT EXISTS lune_machines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serial_number VARCHAR(50) UNIQUE NOT NULL,
          dental_office_id INTEGER NOT NULL,
          purchase_date DATE NOT NULL,
          connected_phone VARCHAR(20),
          sbc_identifier VARCHAR(50),
          plan_type VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (dental_office_id) REFERENCES dental_offices (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating lune_machines table:', err.message);
        } else {
          console.log('Lune machines table created successfully');
        }
      });

      // Push button usage data table
      db.run(`
        CREATE TABLE IF NOT EXISTS button_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lune_machine_id INTEGER NOT NULL,
          button_number INTEGER NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          duration_seconds INTEGER NOT NULL,
          usage_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lune_machine_id) REFERENCES lune_machines (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating button_usage table:', err.message);
        } else {
          console.log('Button usage table created successfully');
        }
      });

      // Invoices table
      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dental_office_id INTEGER NOT NULL,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'unpaid',
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          paid_at DATETIME,
          invoice_data TEXT, -- JSON data with detailed breakdown
          FOREIGN KEY (dental_office_id) REFERENCES dental_offices (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating invoices table:', err.message);
        } else {
          console.log('Invoices table created successfully');
        }
      });

      // Add new columns to existing lune_machines table if they don't exist
      db.run(`ALTER TABLE lune_machines ADD COLUMN connected_phone VARCHAR(20)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding connected_phone column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE lune_machines ADD COLUMN sbc_identifier VARCHAR(50)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding sbc_identifier column:', err.message);
        }
      });
      
      db.run(`ALTER TABLE lune_machines ADD COLUMN plan_type VARCHAR(50)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding plan_type column:', err.message);
        }
      });

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_dental_offices_npi ON dental_offices(npi_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_dental_offices_deleted ON dental_offices(is_deleted)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_lune_machines_serial ON lune_machines(serial_number)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_lune_machines_office ON lune_machines(dental_office_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_lune_machines_deleted ON lune_machines(is_deleted)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_button_usage_lune ON button_usage(lune_machine_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_button_usage_date ON button_usage(usage_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_office ON invoices(dental_office_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_month_year ON invoices(month, year)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);

      console.log('Database initialized successfully');
      
      // Close database connection
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Database initialization completed');
          resolve();
        }
      });
    });
  });
};

module.exports = { initializeDatabase };
