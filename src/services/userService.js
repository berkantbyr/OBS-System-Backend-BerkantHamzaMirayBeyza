const db = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const { User, Student, Faculty, Department, RefreshToken } = db;

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Object} User profile
 */
const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { 
        model: Student, 
        as: 'student', 
        include: [{ model: Department, as: 'department' }] 
      },
      { 
        model: Faculty, 
        as: 'faculty', 
        include: [{ model: Department, as: 'department' }] 
      },
    ],
  });

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  return user.toSafeObject();
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user
 */
const updateProfile = async (userId, updateData) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  const { firstName, lastName, phone } = updateData;

  const updates = {};
  if (firstName) updates.first_name = firstName;
  if (lastName) updates.last_name = lastName;
  if (phone !== undefined) updates.phone = phone;

  await user.update(updates);

  logger.info(`Profile updated for user: ${user.email}`);

  return user.toSafeObject();
};

/**
 * Update user profile picture
 * @param {string} userId - User ID
 * @param {string} pictureUrl - Profile picture URL
 * @returns {Object} Updated user
 */
const updateProfilePicture = async (userId, pictureUrl) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  await user.update({ profile_picture_url: pictureUrl });

  logger.info(`Profile picture updated for user: ${user.email}`);

  return user.toSafeObject();
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Mevcut şifre yanlış');
  }

  // Hash and update new password
  const hashedPassword = await hashPassword(newPassword);
  await user.update({ password_hash: hashedPassword });

  // Invalidate all refresh tokens
  await RefreshToken.update(
    { is_revoked: true },
    { where: { user_id: userId } }
  );

  logger.info(`Password changed for user: ${user.email}`);

  return { message: 'Şifreniz başarıyla değiştirildi' };
};

/**
 * Get all users (admin only)
 * @param {Object} options - Query options
 * @returns {Object} Users list with pagination
 */
const getAllUsers = async (options = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    role, 
    departmentId,
    search,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;
  const where = {};

  // Filter by role
  if (role) {
    where.role = role;
  }

  // Search by name or email
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const include = [
    { 
      model: Student, 
      as: 'student', 
      include: [{ model: Department, as: 'department' }],
      ...(departmentId && { where: { department_id: departmentId } }),
    },
    { 
      model: Faculty, 
      as: 'faculty', 
      include: [{ model: Department, as: 'department' }],
      ...(departmentId && { where: { department_id: departmentId } }),
    },
  ];

  const { count, rows } = await User.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [[sortBy, sortOrder]],
    distinct: true,
  });

  return {
    users: rows.map(user => user.toSafeObject()),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get user by ID (admin only)
 * @param {string} userId - User ID
 * @returns {Object} User data
 */
const getUserById = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { 
        model: Student, 
        as: 'student', 
        include: [{ model: Department, as: 'department' }] 
      },
      { 
        model: Faculty, 
        as: 'faculty', 
        include: [{ model: Department, as: 'department' }] 
      },
    ],
  });

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  return user.toSafeObject();
};

/**
 * Update user status (admin only)
 * @param {string} userId - User ID
 * @param {boolean} isActive - New status
 * @returns {Object} Updated user
 */
const updateUserStatus = async (userId, isActive) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  await user.update({ is_active: isActive });

  logger.info(`User status updated: ${user.email} -> ${isActive ? 'active' : 'inactive'}`);

  return user.toSafeObject();
};

/**
 * Delete user (admin only) - Soft delete
 * @param {string} userId - User ID
 * @returns {Object} Success message
 */
const deleteUser = async (userId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  // Soft delete by deactivating
  await user.update({ is_active: false });

  logger.info(`User deactivated: ${user.email}`);

  return { message: 'Kullanıcı başarıyla silindi' };
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePicture,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};

