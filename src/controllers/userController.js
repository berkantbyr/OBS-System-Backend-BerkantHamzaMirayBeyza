const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);
    
    // Convert profile picture URL to full URL if exists
    if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
    }
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    
    res.status(404).json({
      success: false,
      message: error.message,
      code: 'NOT_FOUND',
    });
  }
};

/**
 * Update current user profile
 * PUT /api/v1/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Profil güncellendi',
      data: user,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Update profile picture
 * POST /api/v1/users/me/profile-picture
 */
const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir resim dosyası yükleyin',
        code: 'NO_FILE',
      });
    }
    
    const pictureUrl = `/uploads/${req.file.filename}`;
    const user = await userService.updateProfilePicture(req.user.id, pictureUrl);
    
    // Get full URL for the profile picture
    const protocol = req.protocol;
    const host = req.get('host');
    const fullPictureUrl = `${protocol}://${host}${pictureUrl}`;
    
    res.status(200).json({
      success: true,
      message: 'Profil fotoğrafı güncellendi',
      data: {
        profilePictureUrl: fullPictureUrl,
        user,
      },
    });
  } catch (error) {
    logger.error('Update profile picture error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Change password
 * PUT /api/v1/users/me/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Change password error:', error);
    
    const status = error.message.includes('yanlış') ? 401 : 400;
    
    res.status(status).json({
      success: false,
      message: error.message,
      code: 'PASSWORD_ERROR',
    });
  }
};

/**
 * Get all users (admin only)
 * GET /api/v1/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);
    
    // Convert profile picture URLs to full URLs
    const protocol = req.protocol;
    const host = req.get('host');
    const users = result.users.map(user => {
      if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
        user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
      }
      return user;
    });
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Get user by ID (admin only)
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    
    // Convert profile picture URL to full URL if exists
    if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
    }
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    
    res.status(404).json({
      success: false,
      message: error.message,
      code: 'NOT_FOUND',
    });
  }
};

/**
 * Update user status (admin only)
 * PATCH /api/v1/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(req.params.id, isActive);
    
    res.status(200).json({
      success: true,
      message: `Kullanıcı ${isActive ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`,
      data: user,
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz',
        code: 'SELF_DELETE',
      });
    }
    
    const result = await userService.deleteUser(req.params.id);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'DELETE_ERROR',
    });
  }
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

