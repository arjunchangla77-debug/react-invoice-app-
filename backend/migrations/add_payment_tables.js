const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'users.db');

const addPaymentTables = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    // Create payment_intents table
    const createPaymentIntentsTable = `
      CREATE TABLE IF NOT EXISTS payment_intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_payment_intent_id TEXT UNIQUE NOT NULL,
        invoice_id TEXT NOT NULL,
        office_id INTEGER,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'usd',
        status TEXT DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (office_id) REFERENCES dental_offices(id)
      )
    `;

    // Create checkout_sessions table
    const createCheckoutSessionsTable = `
      CREATE TABLE IF NOT EXISTS checkout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_session_id TEXT UNIQUE NOT NULL,
        invoice_id TEXT NOT NULL,
        office_id INTEGER,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (office_id) REFERENCES dental_offices(id)
      )
    `;

    // Add payment columns to invoices table
    const addPaymentColumnsToInvoices = `
      ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
      ALTER TABLE invoices ADD COLUMN payment_date DATETIME;
      ALTER TABLE invoices ADD COLUMN stripe_session_id TEXT;
      ALTER TABLE invoices ADD COLUMN transaction_id TEXT;
    `;

    db.serialize(() => {
      // Create payment_intents table
      db.run(createPaymentIntentsTable, (err) => {
        if (err) {
          console.error('Error creating payment_intents table:', err);
        } else {
          console.log('payment_intents table created successfully');
        }
      });

      // Create checkout_sessions table
      db.run(createCheckoutSessionsTable, (err) => {
        if (err) {
          console.error('Error creating checkout_sessions table:', err);
        } else {
          console.log('checkout_sessions table created successfully');
        }
      });

      // Add payment columns to invoices table (handle errors gracefully)
      const alterCommands = [
        "ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid'",
        "ALTER TABLE invoices ADD COLUMN payment_date DATETIME",
        "ALTER TABLE invoices ADD COLUMN stripe_session_id TEXT",
        "ALTER TABLE invoices ADD COLUMN transaction_id TEXT"
      ];

      alterCommands.forEach((command, index) => {
        db.run(command, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`Error adding payment column ${index + 1}:`, err);
          } else if (!err) {
            console.log(`Payment column ${index + 1} added successfully`);
          }
        });
      });

      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Payment tables migration completed');
          resolve();
        }
      });
    });
  });
};

// Run migration if called directly
if (require.main === module) {
  addPaymentTables()
    .then(() => {
      console.log('Payment tables migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Payment tables migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPaymentTables };
