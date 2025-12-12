/**
 * Check user in database and reset password if needed
 * Usage: node scripts/check-user.js <email> <newPassword>
 */

require('dotenv').config();
const db = require('../src/models');
const { hashPassword } = require('../src/utils/password');

const email = process.argv[2] || 'miray.tiryaki@student.university.edu';
const newPassword = process.argv[3] || 'Miray123';

async function checkAndFixUser() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`\n🔍 Checking user: ${normalizedEmail}`);

    // Find user
    const user = await db.User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        normalizedEmail
      ),
      include: [
        { model: db.Student, as: 'student' },
        { model: db.Faculty, as: 'faculty' },
      ],
    });

    if (!user) {
      console.log(`\n❌ User not found: ${normalizedEmail}`);
      console.log('💡 User needs to be created. Please register first.');
      process.exit(1);
    }

    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Verified: ${user.is_verified}`);
    console.log(`   Has Password Hash: ${!!user.password_hash}`);
    console.log(`   Password Hash Length: ${user.password_hash?.length || 0}`);

    // Check if password needs to be reset
    if (!user.password_hash || user.password_hash.length < 10) {
      console.log(`\n⚠️  Password hash is missing or invalid. Resetting password...`);
      
      const hashedPassword = await hashPassword(newPassword);
      await user.update({ 
        password_hash: hashedPassword,
        is_active: true,
        is_verified: true,
      });
      
      console.log(`✅ Password reset successfully!`);
      console.log(`   New password: ${newPassword}`);
    } else {
      console.log(`\n✅ Password hash exists.`);
      console.log(`💡 If login still fails, you can reset the password by running:`);
      console.log(`   node scripts/reset-password.js ${normalizedEmail} ${newPassword}`);
    }

    // Ensure user is active and verified
    if (!user.is_active || !user.is_verified) {
      await user.update({ is_active: true, is_verified: true });
      console.log(`✅ User activated and verified.`);
    }

    console.log(`\n✅ User is ready for login!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

checkAndFixUser();

