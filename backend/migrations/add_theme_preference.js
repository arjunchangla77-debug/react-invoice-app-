const db = require('../config/database');

async function addThemePreferenceColumn() {
  try {
    console.log('Adding theme_preference column to users table...');
    
    // Check if column already exists
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const hasThemeColumn = tableInfo.some(column => column.name === 'theme_preference');
    
    if (!hasThemeColumn) {
      // Add theme_preference column with default value 'light'
      await db.run(`
        ALTER TABLE users 
        ADD COLUMN theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'))
      `);
      
      console.log('Successfully added theme_preference column to users table');
    } else {
      console.log('theme_preference column already exists');
    }
    
  } catch (error) {
    console.error('Error adding theme_preference column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addThemePreferenceColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addThemePreferenceColumn;
