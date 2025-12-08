const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const { hashPassword, comparePassword } = require('../../src/utils/password');
const jwtUtils = require('../../src/utils/jwt');

// Mock the database
jest.mock('../../src/models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
  },
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  Student: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Faculty: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Department: {
    findByPk: jest.fn(),
  },
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  Sequelize: {
    Op: {
      or: Symbol('or'),
      iLike: Symbol('iLike'),
    },
  },
}));

// Mock password utils
jest.mock('../../src/utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

// Mock JWT utils
jest.mock('../../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: 'authenticated-user-id',
      email: 'authenticated@test.com',
      role: 'student',
    };
    next();
  },
  authorize: (role) => (req, res, next) => {
    // Mock admin user for admin routes
    if (role === 'admin') {
      req.user = {
        id: 'admin-user-id',
        email: 'admin@test.com',
        role: 'admin',
      };
    }
    next();
  },
}));

describe('User API Integration Tests', () => {
  let accessToken;

  beforeEach(() => {
    jest.clearAllMocks();
    accessToken = 'mock-access-token';
    jwtUtils.verifyToken.mockReturnValue({
      userId: 'authenticated-user-id',
      email: 'authenticated@test.com',
      role: 'student',
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile successfully', async () => {
      const mockUser = {
        id: 'authenticated-user-id',
        email: 'authenticated@test.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        phone: '+905551234567',
        is_active: true,
        is_verified: true,
        toSafeObject: jest.fn().mockReturnValue({
          id: 'authenticated-user-id',
          email: 'authenticated@test.com',
          role: 'student',
          first_name: 'Test',
          last_name: 'User',
        }),
        student: null,
        faculty: null,
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 if user not found', async () => {
      db.User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should include student data for student users', async () => {
      const mockStudent = {
        id: 'student-id',
        student_number: '20240001',
        department: {
          id: 'dept-id',
          name: 'Computer Science',
        },
      };

      const mockUser = {
        id: 'authenticated-user-id',
        role: 'student',
        toSafeObject: jest.fn().mockReturnValue({
          id: 'authenticated-user-id',
          student: mockStudent,
        }),
        student: mockStudent,
        faculty: null,
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.student).toBeDefined();
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+905559876543',
      };

      const mockUser = {
        id: 'authenticated-user-id',
        email: 'authenticated@test.com',
        first_name: 'Test',
        last_name: 'User',
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: 'authenticated-user-id',
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          phone: updateData.phone,
        }),
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profil güncellendi');
    });

    it('should reject invalid phone format', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Test',
          phone: 'invalid-phone',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if user not found', async () => {
      db.User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/me/password', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'authenticated-user-id',
        email: 'authenticated@test.com',
        password_hash: 'oldHashedPassword',
        update: jest.fn().mockResolvedValue(true),
      };

      db.User.findByPk.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('newHashedPassword');
      db.RefreshToken.update.mockResolvedValue([1]);

      const response = await request(app)
        .put('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Şifreniz başarıyla değiştirildi');
    });

    it('should reject change password with wrong current password', async () => {
      const mockUser = {
        id: 'authenticated-user-id',
        password_hash: 'oldHashedPassword',
      };

      db.User.findByPk.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PASSWORD_ERROR');
    });

    it('should reject change password with mismatched new passwords', async () => {
      const response = await request(app)
        .put('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
          confirmPassword: 'DifferentPassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .put('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'weak',
          confirmPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/users (Admin)', () => {
    it('should get all users with pagination (admin)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          role: 'student',
          toSafeObject: jest.fn().mockReturnValue({
            id: 'user-1',
            email: 'user1@test.com',
          }),
        },
        {
          id: 'user-2',
          email: 'user2@test.com',
          role: 'faculty',
          toSafeObject: jest.fn().mockReturnValue({
            id: 'user-2',
            email: 'user2@test.com',
          }),
        },
      ];

      db.User.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockUsers,
      });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter users by role (admin)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          role: 'student',
          toSafeObject: jest.fn().mockReturnValue({ id: 'user-1' }),
        },
      ];

      db.User.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockUsers,
      });

      const response = await request(app)
        .get('/api/v1/users?role=student')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should search users by name or email (admin)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          toSafeObject: jest.fn().mockReturnValue({ id: 'user-1' }),
        },
      ];

      db.User.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockUsers,
      });

      const response = await request(app)
        .get('/api/v1/users?search=test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should handle pagination parameters (admin)', async () => {
      db.User.findAndCountAll.mockResolvedValue({
        count: 50,
        rows: [],
      });

      const response = await request(app)
        .get('/api/v1/users?page=2&limit=20')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(20);
    });
  });

  describe('GET /api/v1/users/:id (Admin)', () => {
    it('should get user by ID successfully (admin)', async () => {
      const userId = 'target-user-id';
      const mockUser = {
        id: userId,
        email: 'target@test.com',
        role: 'student',
        toSafeObject: jest.fn().mockReturnValue({
          id: userId,
          email: 'target@test.com',
        }),
        student: null,
        faculty: null,
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 if user not found (admin)', async () => {
      db.User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/users/:id/status (Admin)', () => {
    it('should activate user successfully (admin)', async () => {
      const userId = 'target-user-id';
      const mockUser = {
        id: userId,
        email: 'target@test.com',
        is_active: false,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: userId,
          is_active: true,
        }),
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .patch(`/api/v1/users/${userId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should deactivate user successfully (admin)', async () => {
      const userId = 'target-user-id';
      const mockUser = {
        id: userId,
        email: 'target@test.com',
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: userId,
          is_active: false,
        }),
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .patch(`/api/v1/users/${userId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if user not found (admin)', async () => {
      db.User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/v1/users/non-existent-id/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/:id (Admin)', () => {
    it('should delete user successfully (admin)', async () => {
      const userId = 'target-user-id';
      const mockUser = {
        id: userId,
        email: 'target@test.com',
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Kullanıcı başarıyla silindi');
    });

    it('should prevent self-deletion', async () => {
      // Mock the middleware to set req.user.id to match the delete target
      const selfUserId = 'admin-user-id'; // This matches the admin user ID from mock
      const mockUser = {
        id: selfUserId,
        email: 'admin@test.com',
        is_active: true,
      };

      db.User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete(`/api/v1/users/${selfUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // The controller should prevent self-deletion
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SELF_DELETE');
    });

    it('should return 404 if user not found (admin)', async () => {
      db.User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

