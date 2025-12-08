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
    // Create user
    const user = await User.create({
      email,
      password_hash: hashedPassword,
      role,
      first_name: firstName,
      last_name: lastName,
      is_active: false,
      is_verified: false,
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
    const verificationToken = generateVerificationToken({ userId: user.id, email });
    
    // Save verification token
    await EmailVerification.create({
      user_id: user.id,
      token: verificationToken,
      expires_at: getExpirationDate(jwtConfig.verificationTokenExpiry),
    }, { transaction });

    await transaction.commit();

    // Send verification email (don't await to avoid blocking)
    sendVerificationEmail(email, verificationToken, firstName).catch(err => {
      logger.error('Failed to send verification email:', err);
    });

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

  // Check if user is verified
  if (!user.is_verified) {
    throw new Error('Lütfen önce e-posta adresinizi doğrulayın');
  }

  // Check if user is active
  if (!user.is_active) {
    throw new Error('Hesabınız aktif değil. Lütfen yöneticiyle iletişime geçin');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('E-posta veya şifre hatalı');
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
 * @param {string} email - User email
 * @returns {Object} Success message
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });

  // Don't reveal if email exists
  if (!user) {
    return { message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi' };
  }

  // Generate reset token
  const resetToken = generateResetToken({ userId: user.id, email });

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

  // Send reset email
  sendPasswordResetEmail(email, resetToken, user.first_name).catch(err => {
    logger.error('Failed to send password reset email:', err);
  });

  logger.info(`Password reset requested for: ${email}`);

  return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
};

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Object} Success message
 */
const resendVerification = async (email) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    // Don't reveal if email exists for security
    return { message: 'Eğer bu e-posta adresi kayıtlıysa, doğrulama bağlantısı gönderildi' };
  }

  // Check if already verified
  if (user.is_verified) {
    throw new Error('Bu e-posta adresi zaten doğrulanmış');
  }

  // Invalidate old verification tokens
  await EmailVerification.update(
    { is_used: true },
    { where: { user_id: user.id, is_used: false } }
  );

  // Generate new verification token
  const verificationToken = generateVerificationToken({ userId: user.id, email });

  // Save new verification token
  await EmailVerification.create({
    user_id: user.id,
    token: verificationToken,
    expires_at: getExpirationDate(jwtConfig.verificationTokenExpiry),
  });

  // Send verification email
  sendVerificationEmail(email, verificationToken, user.first_name).catch(err => {
    logger.error('Failed to send verification email:', err);
  });

  logger.info(`Verification email resent to: ${email}`);

  return { message: 'Doğrulama bağlantısı e-posta adresinize gönderildi' };
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

  // Update user password
  await User.update(
    { password_hash: hashedPassword },
    { where: { id: decoded.userId } }
  );

  // Mark token as used
  await resetRecord.update({ is_used: true });

  // Invalidate all refresh tokens for this user
  await RefreshToken.update(
    { is_revoked: true },
    { where: { user_id: decoded.userId } }
  );

  logger.info(`Password reset completed for user: ${decoded.email}`);

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

