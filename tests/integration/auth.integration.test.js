const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const { hashPassword } = require('../../src/utils/password');
const jwtUtils = require('../../src/utils/jwt');

// Mock the database
jest.mock('../../src/models', () => {
  const mockUser = {
    id: 'test-uuid',
    email: 'test@test.com',
    password_hash: '$2b$12$hashedpassword',
    role: 'student',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    is_verified: true,
    toSafeObject: function() {
      const { password_hash, ...safe } = this;
      return safe;
    },
    update: jest.fn(),
  };

  return {
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(true),
      sync: jest.fn().mockResolvedValue(true),
      transaction: jest.fn((callback) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      }),
    },
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    EmailVerification: {
      create: jest.fn(),
      findOne: jest.fn(),
    },
    PasswordReset: {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    },
    Sequelize: {
      Op: {
        or: Symbol('or'),
      },
    },
  };
});

// Mock password utils
jest.mock('../../src/utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

// Mock JWT utils
jest.mock('../../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  generateVerificationToken: jest.fn(),
  generateResetToken: jest.fn(),
  verifyToken: jest.fn(),
  getExpirationDate: jest.fn(),
}));

// Mock email service
jest.mock('../../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new student successfully', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue(null);
      db.Department.findByPk.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashedPassword123');
      
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@test.com',
        role: 'student',
        first_name: 'New',
        last_name: 'User',
        is_active: false,
        is_verified: false,
        toSafeObject: function() {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      
      db.User.create.mockResolvedValue(mockUser);
      db.Student.create.mockResolvedValue({});
      jwtUtils.generateVerificationToken.mockReturnValue('verification-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.EmailVerification.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'New',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230001',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should register a new faculty member successfully', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Faculty.findOne.mockResolvedValue(null);
      db.Department.findByPk.mockResolvedValue({ id: 'dept-id' });
      hashPassword.mockResolvedValue('hashedPassword123');
      
      const mockUser = {
        id: 'new-faculty-id',
        email: 'faculty@test.com',
        role: 'faculty',
        toSafeObject: function() {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      
      db.User.create.mockResolvedValue(mockUser);
      db.Faculty.create.mockResolvedValue({});
      jwtUtils.generateVerificationToken.mockReturnValue('verification-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.EmailVerification.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'faculty@test.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'Faculty',
          lastName: 'Member',
          role: 'faculty',
          employeeNumber: 'EMP001',
          title: 'professor',
          departmentId: 'dept-id',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject registration with existing email', async () => {
      db.User.findOne.mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230002',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DUPLICATE_ENTRY');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230003',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'weak',
          confirmPassword: 'weak',
          firstName: 'Test',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230004',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password123',
          confirmPassword: 'Password456',
          firstName: 'Test',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230005',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with duplicate student number', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue({ id: 'existing-student' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new@test.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'student',
          studentNumber: '20230001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const decoded = { userId: 'user-id', email: 'test@test.com' };
      
      jwtUtils.verifyToken.mockReturnValue(decoded);
      
      const mockVerification = {
        isValid: jest.fn().mockReturnValue(true),
        update: jest.fn().mockResolvedValue(true),
      };
      
      db.EmailVerification.findOne.mockResolvedValue(mockVerification);
      db.User.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VERIFICATION_ERROR');
    });

    it('should reject expired verification token', async () => {
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.EmailVerification.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'expired-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        password_hash: 'hashedPassword',
        role: 'student',
        is_verified: true,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          email: 'test@test.com',
          role: 'student',
        }),
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      const { comparePassword } = require('../../src/utils/password');
      comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.RefreshToken.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject login with invalid credentials', async () => {
      db.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('LOGIN_ERROR');
    });

    it('should reject login for unverified user', async () => {
      const mockUser = {
        id: 'unverified-user',
        email: 'unverified@test.com',
        password_hash: 'hashedPassword',
        is_verified: false,
        is_active: true,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      const { comparePassword } = require('../../src/utils/password');
      comparePassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unverified@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject login for inactive user', async () => {
      const mockUser = {
        id: 'inactive-user',
        email: 'inactive@test.com',
        password_hash: 'hashedPassword',
        is_verified: true,
        is_active: false,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      const { comparePassword } = require('../../src/utils/password');
      comparePassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with wrong password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        password_hash: 'hashedPassword',
        is_verified: true,
        is_active: true,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      const { comparePassword } = require('../../src/utils/password');
      comparePassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const decoded = { userId: 'user-id', email: 'test@test.com', role: 'student' };

      jwtUtils.verifyToken.mockReturnValue(decoded);

      const mockStoredToken = {
        isValid: jest.fn().mockReturnValue(true),
      };

      db.RefreshToken.findOne.mockResolvedValue(mockStoredToken);
      jwtUtils.generateAccessToken.mockReturnValue('new-access-token');

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('should reject invalid refresh token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('REFRESH_ERROR');
    });

    it('should reject expired refresh token', async () => {
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.RefreshToken.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      db.RefreshToken.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(204);
    });

    it('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(response.status).toBe(204);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should always return success for existing user (security)', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        first_name: 'Test',
      };

      db.User.findOne.mockResolvedValue(mockUser);
      jwtUtils.generateResetToken.mockReturnValue('reset-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.PasswordReset.update.mockResolvedValue([1]);
      db.PasswordReset.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'test@test.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should always return success even if user does not exist (security)', async () => {
      db.User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password successfully with valid token', async () => {
      const token = 'valid-reset-token';
      const decoded = { userId: 'user-id', email: 'test@test.com' };

      jwtUtils.verifyToken.mockReturnValue(decoded);

      const mockResetRecord = {
        isValid: jest.fn().mockReturnValue(true),
        update: jest.fn().mockResolvedValue(true),
      };

      db.PasswordReset.findOne.mockResolvedValue(mockResetRecord);
      hashPassword.mockResolvedValue('newHashedPassword');
      db.User.update.mockResolvedValue([1]);
      db.RefreshToken.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject reset with invalid token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RESET_ERROR');
    });

    it('should reject reset with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'NewPassword123',
          confirmPassword: 'DifferentPassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject reset with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'weak',
          confirmPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject expired reset token', async () => {
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.PasswordReset.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API is running');
    });
  });
});


