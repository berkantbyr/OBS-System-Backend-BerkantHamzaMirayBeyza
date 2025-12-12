/**
 * Reset user password
 * Usage: node scripts/reset-password.js <email> <newPassword>
 */

require('dotenv').config();
const db = require('../src/models');
const { hashPassword } = require('../src/utils/password');

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('❌ Usage: node scripts/reset-password.js <email> <newPassword>');
  process.exit(1);
}

async function resetPassword() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`\n🔍 Finding user: ${normalizedEmail}`);

    // Find user
    const user = await db.User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        normalizedEmail
      ),
    });

    if (!user) {
      console.log(`\n❌ User not found: ${normalizedEmail}`);
      process.exit(1);
    }

    console.log(`\n✅ User found: ${user.first_name} ${user.last_name}`);

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await user.update({ 
      password_hash: hashedPassword,
      is_active: true,
      is_verified: true,
    });

    console.log(`\n✅ Password reset successfully!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`\n💡 You can now login with these credentials.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

resetPassword();

