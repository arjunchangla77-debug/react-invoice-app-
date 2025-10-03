const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.db = null;
    this.connect();
  }

  connect() {
    const dbPath = path.resolve(process.env.DB_PATH || './database/users.db');
    
    // Ensure database directory exists
    const fs = require('fs');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('Created database directory:', dbDir);
    }
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        // Try alternative path for Render
        const altPath = path.resolve('/tmp/users.db');
        console.log('Trying alternative database path:', altPath);
        this.db = new sqlite3.Database(altPath, (altErr) => {
          if (altErr) {
            console.error('Alternative database path also failed:', altErr.message);
          } else {
            console.log('Connected to SQLite database at alternative path');
            this.db.run('PRAGMA foreign_keys = ON');
          }
        });
      } else {
        console.log('Connected to SQLite database');
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
      }
    });
  }

  getDb() {
    return this.db;
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database query timeout'));
      }, 10000); // 10 second timeout
      
      this.db.get(sql, params, (err, row) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = new Database();
