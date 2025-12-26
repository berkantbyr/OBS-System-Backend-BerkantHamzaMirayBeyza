/**
 * Create superadmin user if it doesn't exist
 * Usage: node scripts/create-superadmin.js
 */

require('dotenv').config();
const db = require('../src/models');
const { hashPassword } = require('../src/utils/password');

async function createSuperAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    const email = 'superadmin@test.com';
    const password = 'Admin123!';
    const normalizedEmail = email.trim().toLowerCase();

    console.log(`🔍 Checking for user: ${normalizedEmail}`);

    // Check if user exists
    const existingUser = await db.User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        normalizedEmail
      ),
    });

    if (existingUser) {
      console.log(`\n✅ User already exists: ${normalizedEmail}`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.first_name} ${existingUser.last_name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      console.log(`   Verified: ${existingUser.is_verified}`);
      
      // Update password and ensure active/verified
      const hashedPassword = await hashPassword(password);
      await existingUser.update({
        password_hash: hashedPassword,
        is_active: true,
        is_verified: true,
        role: 'admin',
      });
      
      console.log(`\n✅ Password updated and user activated!`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log(`\n📝 Creating new superadmin user...`);
      
      const hashedPassword = await hashPassword(password);
      const newUser = await db.User.create({
        email: normalizedEmail,
        password_hash: hashedPassword,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'admin',
        is_active: true,
        is_verified: true,
      });

      console.log(`\n✅ Superadmin user created successfully!`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Password: ${password}`);
    }

    console.log(`\n💡 You can now login with:`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Password: ${password}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

createSuperAdmin();

