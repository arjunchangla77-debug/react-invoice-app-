const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'users.db');

const fixPaymentIntentsUserIdConstraint = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    console.log('🔧 Fixing payment_intents table to allow null user_id for public payments...');

    db.serialize(() => {
      // Step 1: Create a new table with the correct schema (user_id nullable)
      const createNewTable = `
        CREATE TABLE IF NOT EXISTS payment_intents_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stripe_payment_intent_id TEXT UNIQUE NOT NULL,
          invoice_id TEXT NOT NULL,
          office_id INTEGER,
          user_id INTEGER,
          amount INTEGER NOT NULL,
          currency TEXT DEFAULT 'usd',
          status TEXT DEFAULT 'created',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (office_id) REFERENCES dental_offices(id)
        )
      `;

      db.run(createNewTable, (err) => {
        if (err) {
          console.error('Error creating new payment_intents table:', err);
          reject(err);
          return;
        }
        console.log('New payment_intents table created');

        // Step 2: Copy existing data to the new table
        const copyData = `
          INSERT INTO payment_intents_new 
          SELECT * FROM payment_intents
        `;

        db.run(copyData, (err) => {
          if (err && !err.message.includes('no such table')) {
            console.error('Error copying data:', err);
            // Continue anyway, might be first time setup
          } else {
            console.log('Existing data copied to new table');
          }

          // Step 3: Drop the old table
          db.run('DROP TABLE IF EXISTS payment_intents', (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
            } else {
              console.log('Old payment_intents table dropped');
            }

            // Step 4: Rename the new table
            db.run('ALTER TABLE payment_intents_new RENAME TO payment_intents', (err) => {
              if (err) {
                console.error('Error renaming table:', err);
                reject(err);
                return;
              }
              console.log('New table renamed to payment_intents');

              db.close((err) => {
                if (err) {
                  console.error('Error closing database:', err);
                  reject(err);
                } else {
                  console.log('Payment intents user_id constraint fix completed');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
};

// Run migration if called directly
if (require.main === module) {
  fixPaymentIntentsUserIdConstraint()
    .then(() => {
      console.log('Payment intents user_id constraint fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Payment intents user_id constraint fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPaymentIntentsUserIdConstraint };
