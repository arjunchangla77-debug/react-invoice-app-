const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const addUserRoles = async () => {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '..', 'database', 'users.db');
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to database for role migration');
    });

    db.serialize(() => {
      // Add role column to users table
      db.run(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding role column:', err.message);
          reject(err);
          return;
        } else if (!err) {
          console.log('Role column added successfully');
        } else {
          console.log('Role column already exists');
        }
      });

      // Update Eric_enamel001 to be admin
      db.run(`UPDATE users SET role = 'admin' WHERE username = 'Eric_enamel001'`, function(err) {
        if (err) {
          console.error('Error updating Eric_enamel001 role:', err.message);
          reject(err);
          return;
        }
        
        if (this.changes > 0) {
          console.log('Eric_enamel001 has been set as admin');
        } else {
          console.log('Eric_enamel001 user not found - will be set as admin when they register');
        }
      });

      // Create index for role column
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`, (err) => {
        if (err) {
          console.error('Error creating role index:', err.message);
        } else {
          console.log('Role index created successfully');
        }
      });

      console.log('User roles migration completed');
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Role migration completed successfully');
          resolve();
        }
      });
    });
  });
};

// Run migration if called directly
if (require.main === module) {
  addUserRoles()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addUserRoles };
