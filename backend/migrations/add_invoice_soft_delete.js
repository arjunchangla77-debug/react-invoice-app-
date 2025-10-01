const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'users.db');

async function addInvoiceSoftDeleteColumns() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
        return;
      }
    });

    console.log('🔄 Adding soft delete columns to invoices table...');

    // Check if columns already exist
    db.get("PRAGMA table_info(invoices)", (err, row) => {
      if (err) {
        console.error('Error checking table info:', err);
        db.close();
        reject(err);
        return;
      }

      // Get all column info
      db.all("PRAGMA table_info(invoices)", (err, columns) => {
        if (err) {
          console.error('Error getting column info:', err);
          db.close();
          reject(err);
          return;
        }

        const columnNames = columns.map(col => col.name);
        const hasIsDeleted = columnNames.includes('is_deleted');
        const hasDeletedAt = columnNames.includes('deleted_at');

        console.log('Current columns:', columnNames);

        const alterQueries = [];

        if (!hasIsDeleted) {
          alterQueries.push("ALTER TABLE invoices ADD COLUMN is_deleted INTEGER DEFAULT 0");
          console.log('Will add is_deleted column');
        } else {
          console.log('is_deleted column already exists');
        }

        if (!hasDeletedAt) {
          alterQueries.push("ALTER TABLE invoices ADD COLUMN deleted_at TEXT");
          console.log('Will add deleted_at column');
        } else {
          console.log('deleted_at column already exists');
        }

        if (alterQueries.length === 0) {
          console.log('All columns already exist, no migration needed');
          db.close();
          resolve();
          return;
        }

        // Execute alter queries
        let completed = 0;
        alterQueries.forEach((query, index) => {
          db.run(query, (err) => {
            if (err) {
              console.error(`Error executing query ${index + 1}:`, err);
              db.close();
              reject(err);
              return;
            }

            console.log(`Query ${index + 1} completed: ${query}`);
            completed++;

            if (completed === alterQueries.length) {
              console.log('Migration completed successfully!');
              db.close();
              resolve();
            }
          });
        });
      });
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  addInvoiceSoftDeleteColumns()
    .then(() => {
      console.log('Invoice soft delete migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addInvoiceSoftDeleteColumns };
