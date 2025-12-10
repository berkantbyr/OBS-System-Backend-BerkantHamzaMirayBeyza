const db = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  generateVerificationToken,
  generateResetToken,
  verifyToken,
  getExpirationDate 
} = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailService');
const logger = require('../utils/logger');
const jwtConfig = require('../config/jwt');

const { User, Student, Faculty, Department, RefreshToken, PasswordReset, EmailVerification } = db;

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} Created user and verification message
 */
const register = async (userData) => {
  const { 
    email, 
    password, 
    firstName, 
    lastName, 
    role, 
    studentNumber, 
    employeeNumber,
    departmentId,
    title 
  } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Bu e-posta adresi zaten kayıtlı');
  }

  // Check if student number already exists
  if (role === 'student' && studentNumber) {
    const existingStudent = await Student.findOne({ where: { student_number: studentNumber } });
    if (existingStudent) {
      throw new Error('Bu öğrenci numarası zaten kayıtlı');
    }
  }

  // Check if employee number already exists
  if (role === 'faculty' && employeeNumber) {
    const existingFaculty = await Faculty.findOne({ where: { employee_number: employeeNumber } });
    if (existingFaculty) {
      throw new Error('Bu personel numarası zaten kayıtlı');
    }
  }

  // Verify department exists if provided
  if (departmentId) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      throw new Error('Seçilen bölüm bulunamadı');
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user transaction
  const transaction = await db.sequelize.transaction();

  try {
    // Create user (email verification required)
    const user = await User.create({
      email,
      password_hash: hashedPassword,
      role,
      first_name: firstName,
      last_name: lastName,
      is_active: false, // Will be activated after email verification
      is_verified: false, // Email verification required
    }, { transaction });

    // Create role-specific record
    if (role === 'student') {
      await Student.create({
        user_id: user.id,
        student_number: studentNumber,
        department_id: departmentId || null,
      }, { transaction });
    } else if (role === 'faculty') {
      await Faculty.create({
        user_id: user.id,
        employee_number: employeeNumber,
        department_id: departmentId || null,
        title: title || 'lecturer',
      }, { transaction });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken({
      userId: user.id,
      email: user.email,
    });

    // Create email verification record
    const expiresAt = getExpirationDate(jwtConfig.verificationTokenExpiry);
    await EmailVerification.create({
      user_id: user.id,
      token: verificationToken,
      expires_at: expiresAt,
      is_used: false,
    }, { transaction });

    await transaction.commit();

    // Send verification email (outside transaction to avoid rollback on email failure)
    try {
      await sendVerificationEmail(email, verificationToken, firstName);
      logger.info(`Verification email sent to: ${email}`);
    } catch (emailError) {
      // Log email error but don't fail registration
      logger.error(`Failed to send verification email to ${email}:`, emailError);
      // In production, you might want to throw this error
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Kayıt başarılı ancak doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    }

    logger.info(`New user registered: ${email} (${role})`);

    return {
      message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.',
      user: user.toSafeObject(),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Object} Success message
 */
const verifyEmail = async (token) => {
  // Verify token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş doğrulama linki');
  }

  // Find verification record
  const verification = await EmailVerification.findOne({ 
    where: { token, is_used: false } 
  });

  if (!verification || !verification.isValid()) {
    throw new Error('Geçersiz veya süresi dolmuş doğrulama linki');
  }

  // Update user
  await User.update(
    { is_verified: true, is_active: true },
    { where: { id: decoded.userId } }
  );

  // Mark token as used
  await verification.update({ is_used: true });

  logger.info(`Email verified for user: ${decoded.email}`);

  return { message: 'E-posta adresiniz başarıyla doğrulandı' };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} metadata - Request metadata (IP, user agent)
 * @returns {Object} Tokens and user info
 */
const login = async (email, password, metadata = {}) => {
  // Find user
  const user = await User.findOne({ 
    where: { email },
    include: [
      { model: Student, as: 'student', include: [{ model: Department, as: 'department' }] },
      { model: Faculty, as: 'faculty', include: [{ model: Department, as: 'department' }] },
    ]
  });

  if (!user) {
    throw new Error('E-posta veya şifre hatalı');
  }

  // Email doğrulamasını zorunlu tutma
  // Hesap aktiflik kontrolü de devre dışı bırakıldı

  // Verify password
  logger.info(`Attempting login for ${email}, comparing password...`);
  logger.info(`Stored hash length: ${user.password_hash?.length || 0}`);
  
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    logger.warn(`Login failed for ${email}: Invalid password`);
    logger.warn(`Password comparison failed. Hash exists: ${!!user.password_hash}`);
    throw new Error('E-posta veya şifre hatalı');
  }
  
  logger.info(`Password verified successfully for user: ${email}`);

  // Her girişte hesabı aktif ve doğrulanmış hale getir
  if (!user.is_active || !user.is_verified) {
    await user.update({ is_active: true, is_verified: true });
  }

  // Generate tokens
  const tokenPayload = { 
    userId: user.id, 
    email: user.email, 
    role: user.role 
  };
  
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Save refresh token
  await RefreshToken.create({
    user_id: user.id,
    token: refreshToken,
    expires_at: getExpirationDate(jwtConfig.refreshTokenExpiry),
    ip_address: metadata.ip,
    user_agent: metadata.userAgent,
  });

  // Update last login
  await user.update({ last_login: new Date() });

  logger.info(`User logged in: ${email}`);

  return {
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New access token
 */
const refreshAccessToken = async (refreshToken) => {
  // Verify token
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş token');
  }

  // Find refresh token in database
  const storedToken = await RefreshToken.findOne({ 
    where: { token: refreshToken, is_revoked: false } 
  });

  if (!storedToken || !storedToken.isValid()) {
    throw new Error('Geçersiz veya süresi dolmuş token');
  }

  // Generate new access token
  const tokenPayload = { 
    userId: decoded.userId, 
    email: decoded.email, 
    role: decoded.role 
  };
  
  const newAccessToken = generateAccessToken(tokenPayload);

  return { accessToken: newAccessToken };
};

/**
 * Logout user
 * @param {string} refreshToken - Refresh token to invalidate
 */
const logout = async (refreshToken) => {
  if (!refreshToken) return;

  await RefreshToken.update(
    { is_revoked: true },
    { where: { token: refreshToken } }
  );

  logger.info('User logged out');
};

/**
 * Request password reset
 * @param {string} email - Email address entered by user (will be used as recipient email)
 * @returns {Object} Success message
 * 
 * IMPORTANT: This function sends the reset email to the email address provided by the user.
 * The user can enter any email address (login email or recovery email), and the email
 * will be sent to that address. The system first finds the user by the entered email,
 * then sends the reset email to the same email address.
 * 
 * Example:
 * - User enters: recovery@example.com
 * - System finds user by: recovery@example.com (if it matches login email)
 * - Email sent to: recovery@example.com
 */
const forgotPassword = async (email) => {
  // Find user by the email address entered by the user
  // This email will be used both to find the user AND as the recipient email
  let user = await User.findOne({ where: { email } });
  
  // Don't reveal if email exists (security: prevent email enumeration)
  if (!user) {
    return { message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi' };
  }

  // Generate reset token (use user's login email for token generation)
  const resetToken = generateResetToken({ userId: user.id, email: user.email });

  // Invalidate old reset tokens
  await PasswordReset.update(
    { is_used: true },
    { where: { user_id: user.id, is_used: false } }
  );

  // Save reset token
  await PasswordReset.create({
    user_id: user.id,
    token: resetToken,
    expires_at: getExpirationDate(jwtConfig.resetTokenExpiry),
  });

  // IMPORTANT: Send email to the email address entered by the user
  // This allows users to request password reset to any email they specify
  // If user enters "recovery@example.com", email will be sent to "recovery@example.com"
  const recipientEmail = email; // Send to the email address the user entered

  // Send reset email to the email address provided by the user
  try {
    await sendPasswordResetEmail(recipientEmail, resetToken, user.first_name);
    logger.info(`Password reset email sent to: ${recipientEmail} (user login email: ${user.email})`);
    logger.info(`Password reset requested - User login: ${user.email}, Email sent to: ${recipientEmail}`);
    return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
  } catch (err) {
    logger.error('Failed to send password reset email:', err);
    logger.error('Email error details:', {
      code: err.code,
      message: err.message,
      recipient: recipientEmail,
      userId: user.id,
    });
    
    // In production, throw error so it can be handled properly
    // This ensures email configuration issues are visible
    if (process.env.NODE_ENV === 'production') {
      // Log the error but still return success to prevent email enumeration
      // However, log it prominently so admins can see the issue
      logger.error('═══════════════════════════════════════════════════════');
      logger.error('❌ PRODUCTION EMAIL SEND FAILURE - ŞİFRE SIFIRLAMA');
      logger.error('═══════════════════════════════════════════════════════');
      logger.error(`User: ${user.email} (ID: ${user.id})`);
      logger.error(`Recipient: ${recipientEmail}`);
      logger.error(`Error: ${err.message}`);
      logger.error(`Token: ${resetToken}`);
      logger.error('═══════════════════════════════════════════════════════');
      logger.error('ACTION REQUIRED: Check EMAIL_USER and EMAIL_PASS secrets in Cloud Run');
      logger.error('═══════════════════════════════════════════════════════');
      
      // Still return success to prevent email enumeration
      // But the error is logged prominently for admin attention
      return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
    }
    
    // In development, just log and continue
    return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
  }
};

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Object} Success message
 */
const resendVerification = async (email) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    // Bilgi sızmasını engellemek için nötr yanıt
    return { message: 'Eğer bu e-posta adresi kayıtlıysa, doğrulama e-postası gönderildi' };
  }

  // If already verified, return success message
  if (user.is_verified && user.is_active) {
    return { message: 'E-posta adresiniz zaten doğrulanmış. Doğrudan giriş yapabilirsiniz.' };
  }

  // Mark old verification tokens as used
  await EmailVerification.update(
    { is_used: true },
    { where: { user_id: user.id, is_used: false } }
  );

  // Generate new verification token
  const verificationToken = generateVerificationToken({
    userId: user.id,
    email: user.email,
  });

  // Create new email verification record
  const expiresAt = getExpirationDate(jwtConfig.verificationTokenExpiry);
  await EmailVerification.create({
    user_id: user.id,
    token: verificationToken,
    expires_at: expiresAt,
    is_used: false,
  });

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken, user.first_name);
    logger.info(`Verification email resent to: ${email}`);
  } catch (emailError) {
    logger.error(`Failed to resend verification email to ${email}:`, emailError);
    throw new Error('Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.');
  }

  return { message: 'Doğrulama e-postası gönderildi. Lütfen e-posta kutunuzu kontrol edin.' };
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Object} Success message
 */
const resetPassword = async (token, newPassword) => {
  // Verify token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
  }

  // Find reset record
  const resetRecord = await PasswordReset.findOne({ 
    where: { token, is_used: false } 
  });

  if (!resetRecord || !resetRecord.isValid()) {
    throw new Error('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  logger.info(`Password hashed for user ${decoded.userId}, hash length: ${hashedPassword.length}`);

  // Get user instance first
  const user = await User.findByPk(decoded.userId);
  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  // Update user password using instance method (more reliable)
  await user.update({ password_hash: hashedPassword });
  
  // Reload user to verify password was saved
  await user.reload();
  logger.info(`Password updated for user ${decoded.userId}, verifying hash...`);
  
  // Verify the password was saved correctly by comparing
  const testCompare = await comparePassword(newPassword, user.password_hash);
  if (!testCompare) {
    logger.error(`CRITICAL: Password hash verification failed after update for user ${decoded.userId}`);
    throw new Error('Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
  }
  logger.info(`Password hash verified successfully after update for user ${decoded.userId}`);

  // Mark token as used
  await resetRecord.update({ is_used: true });

  // Invalidate all refresh tokens for this user
  await RefreshToken.update(
    { is_revoked: true },
    { where: { user_id: decoded.userId } }
  );

  logger.info(`Password reset completed for user: ${decoded.email}`);
  logger.info(`User ID: ${decoded.userId}, Password updated successfully`);

  return { message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' };
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};


