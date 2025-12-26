/**
 * Run Database Migrations
 * 
 * This script runs all database migrations to set up the complete schema.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 *   node scripts/run-migrations.js --file migrations/create_all_tables.sql
 *   node scripts/run-migrations.js --part 3
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATION_FILES = {
  all: 'migrations/create_all_tables.sql',
  part1_2: 'migrations/create_part1_2_tables.sql',
  part3: 'migrations/create_part3_tables.sql',
  part4: 'migrations/create_part4_tables.sql',
  missing: 'migrations/create_missing_tables.sql',
};

async function runMigration() {
  let connection;
  
  try {
    // Get migration file from command line args
    const args = process.argv.slice(2);
    let migrationFile = MIGRATION_FILES.all; // Default: all tables
    
    if (args.includes('--file')) {
      const fileIndex = args.indexOf('--file');
      migrationFile = args[fileIndex + 1];
    } else if (args.includes('--part')) {
      const partIndex = args.indexOf('--part');
      const part = args[partIndex + 1];
      if (MIGRATION_FILES[`part${part}`]) {
        migrationFile = MIGRATION_FILES[`part${part}`];
      } else if (part === '1_2' || part === '1-2') {
        migrationFile = MIGRATION_FILES.part1_2;
      }
    }

    // Check if file exists
    const filePath = path.join(__dirname, '..', migrationFile);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Reading migration file: ${migrationFile}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Create database connection
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'campus_db',
      multipleStatements: true, // Allow multiple SQL statements
    };

    console.log(`🔌 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established\n');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📊 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.length < 10) continue;

      try {
        await connection.query(statement);
        successCount++;
        
        // Extract table name from CREATE TABLE statement for logging
        const tableMatch = statement.match(/CREATE TABLE.*?`?(\w+)`?/i);
        if (tableMatch) {
          console.log(`✅ Created/verified table: ${tableMatch[1]}`);
        }
      } catch (error) {
        // Ignore "table already exists" errors (idempotent)
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          const tableMatch = statement.match(/CREATE TABLE.*?`?(\w+)`?/i);
          if (tableMatch) {
            console.log(`ℹ️  Table already exists: ${tableMatch[1]}`);
          }
          successCount++;
        } else {
          errorCount++;
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Don't exit on error, continue with other statements
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n🎉 Migration completed!\n`);

    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📋 Total tables in database: ${tables.length}`);
    
    // List important tables
    const importantTables = ['users', 'meal_menus', 'cafeterias', 'sensors', 'sensor_data', 'notifications'];
    console.log(`\n🔍 Checking important tables:`);
    for (const tableName of importantTables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      if (rows.length > 0) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (missing)`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();

