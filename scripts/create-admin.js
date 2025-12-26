/**
 * Create new admin user
 * Usage: node scripts/create-admin.js <email> <password> [firstName] [lastName]
 * Example: node scripts/create-admin.js admin@example.com MyPassword123! Admin User
 */

require('dotenv').config();
const db = require('../src/models');
const { hashPassword } = require('../src/utils/password');

async function createAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    // Get arguments
    const email = process.argv[2];
    const password = process.argv[3];
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'User';

    if (!email || !password) {
      console.error('❌ Usage: node scripts/create-admin.js <email> <password> [firstName] [lastName]');
      console.error('   Example: node scripts/create-admin.js admin@example.com MyPassword123! Admin User');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Geçersiz e-posta adresi formatı!');
      process.exit(1);
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('❌ Şifre en az 8 karakter olmalıdır!');
      process.exit(1);
    }

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
      console.log(`\n⚠️  User already exists: ${normalizedEmail}`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.first_name} ${existingUser.last_name}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Update password and ensure active/verified
      const hashedPassword = await hashPassword(password);
      await existingUser.update({
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        is_active: true,
        is_verified: true,
      });
      
      console.log(`\n✅ User updated successfully!`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Password: ${password}`);
      console.log(`   Name: ${firstName} ${lastName}`);
      console.log(`   Role: admin`);
      
      console.log(`\n💡 You can now login with:`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Password: ${password}\n`);
      
      await db.sequelize.close();
      process.exit(0);
    }

    console.log(`\n📝 Creating new admin user...`);
    
    const hashedPassword = await hashPassword(password);
    const newUser = await db.User.create({
      email: normalizedEmail,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
      is_active: true,
      is_verified: true,
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: admin`);
    console.log(`\n💡 You can now login with:`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Password: ${password}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('   Bu e-posta adresi zaten kullanılıyor!');
    }
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

createAdmin();

