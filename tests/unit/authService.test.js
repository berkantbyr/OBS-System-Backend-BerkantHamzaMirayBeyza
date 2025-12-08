const authService = require('../../src/services/authService');
const db = require('../../src/models');
const { hashPassword, comparePassword } = require('../../src/utils/password');
const jwtUtils = require('../../src/utils/jwt');
const emailService = require('../../src/services/emailService');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/password');
jest.mock('../../src/utils/jwt');
jest.mock('../../src/services/emailService');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Auth Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@university.edu',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'student',
      studentNumber: '20240001',
    };

    it('should successfully register a new student', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue(null);
      db.Department.findByPk.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashedPassword123');
      
      const mockUser = {
        id: 'user-id-123',
        email: mockUserData.email,
        role: mockUserData.role,
        first_name: mockUserData.firstName,
        last_name: mockUserData.lastName,
        is_active: false,
        is_verified: false,
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id-123',
          email: mockUserData.email,
          role: mockUserData.role,
        }),
      };

      db.sequelize.transaction.mockImplementation((callback) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      });
      
      db.User.create.mockResolvedValue(mockUser);
      db.Student.create.mockResolvedValue({});
      jwtUtils.generateVerificationToken.mockReturnValue('verification-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.EmailVerification.create.mockResolvedValue({});

      const result = await authService.register(mockUserData);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(db.User.findOne).toHaveBeenCalledWith({ where: { email: mockUserData.email } });
      expect(hashPassword).toHaveBeenCalledWith(mockUserData.password);
      expect(db.User.create).toHaveBeenCalled();
      expect(db.Student.create).toHaveBeenCalled();
    });

    it('should successfully register a new faculty member', async () => {
      const facultyData = {
        ...mockUserData,
        role: 'faculty',
        employeeNumber: 'EMP001',
        title: 'professor',
        departmentId: 'dept-id',
      };

      db.User.findOne.mockResolvedValue(null);
      db.Faculty.findOne.mockResolvedValue(null);
      db.Department.findByPk.mockResolvedValue({ id: 'dept-id' });
      hashPassword.mockResolvedValue('hashedPassword123');

      const mockUser = {
        id: 'user-id-123',
        toSafeObject: jest.fn().mockReturnValue({ id: 'user-id-123' }),
      };

      db.sequelize.transaction.mockImplementation((callback) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      });

      db.User.create.mockResolvedValue(mockUser);
      db.Faculty.create.mockResolvedValue({});
      jwtUtils.generateVerificationToken.mockReturnValue('verification-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.EmailVerification.create.mockResolvedValue({});

      const result = await authService.register(facultyData);

      expect(result).toHaveProperty('message');
      expect(db.Faculty.findOne).toHaveBeenCalledWith({ where: { employee_number: facultyData.employeeNumber } });
      expect(db.Faculty.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      db.User.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register(mockUserData)).rejects.toThrow('Bu e-posta adresi zaten kayıtlı');
    });

    it('should throw error if student number already exists', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue({ id: 'existing-student' });

      await expect(authService.register(mockUserData)).rejects.toThrow('Bu öğrenci numarası zaten kayıtlı');
    });

    it('should throw error if employee number already exists', async () => {
      const facultyData = {
        ...mockUserData,
        role: 'faculty',
        employeeNumber: 'EMP001',
      };

      db.User.findOne.mockResolvedValue(null);
      db.Faculty.findOne.mockResolvedValue({ id: 'existing-faculty' });

      await expect(authService.register(facultyData)).rejects.toThrow('Bu personel numarası zaten kayıtlı');
    });

    it('should throw error if department does not exist', async () => {
      const dataWithDept = {
        ...mockUserData,
        departmentId: 'non-existent-dept',
      };

      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue(null);
      db.Department.findByPk.mockResolvedValue(null);

      await expect(authService.register(dataWithDept)).rejects.toThrow('Seçilen bölüm bulunamadı');
    });

    it('should rollback transaction on error', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashedPassword123');

      const mockRollback = jest.fn();
      const mockTransaction = { rollback: mockRollback };

      db.sequelize.transaction.mockImplementation((callback) => {
        try {
          return callback(mockTransaction);
        } catch (error) {
          mockRollback();
          throw error;
        }
      });

      db.User.create.mockRejectedValue(new Error('Database error'));

      await expect(authService.register(mockUserData)).rejects.toThrow('Database error');
    });

    it('should create email verification record', async () => {
      db.User.findOne.mockResolvedValue(null);
      db.Student.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashedPassword123');

      const mockUser = {
        id: 'user-id-123',
        toSafeObject: jest.fn().mockReturnValue({ id: 'user-id-123' }),
      };

      db.sequelize.transaction.mockImplementation((callback) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      });

      db.User.create.mockResolvedValue(mockUser);
      db.Student.create.mockResolvedValue({});
      jwtUtils.generateVerificationToken.mockReturnValue('verification-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.EmailVerification.create.mockResolvedValue({});

      await authService.register(mockUserData);

      expect(db.EmailVerification.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const decoded = { userId: 'user-id', email: 'test@test.com' };

      jwtUtils.verifyToken.mockReturnValue(decoded);
      
      const mockVerification = {
        isValid: jest.fn().mockReturnValue(true),
        update: jest.fn().mockResolvedValue(true),
      };

      db.EmailVerification.findOne.mockResolvedValue(mockVerification);
      db.User.update.mockResolvedValue([1]);

      const result = await authService.verifyEmail(token);

      expect(result).toHaveProperty('message');
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
      expect(db.User.update).toHaveBeenCalledWith(
        { is_verified: true, is_active: true },
        { where: { id: decoded.userId } }
      );
      expect(mockVerification.update).toHaveBeenCalledWith({ is_used: true });
    });

    it('should throw error for invalid token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('Geçersiz veya süresi dolmuş doğrulama linki');
    });

    it('should throw error if verification record not found', async () => {
      const token = 'valid-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.EmailVerification.findOne.mockResolvedValue(null);

      await expect(authService.verifyEmail(token)).rejects.toThrow('Geçersiz veya süresi dolmuş doğrulama linki');
    });

    it('should throw error if verification token is already used', async () => {
      const token = 'used-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockVerification = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.EmailVerification.findOne.mockResolvedValue(mockVerification);

      await expect(authService.verifyEmail(token)).rejects.toThrow('Geçersiz veya süresi dolmuş doğrulama linki');
    });

    it('should throw error if verification token is expired', async () => {
      const token = 'expired-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockVerification = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.EmailVerification.findOne.mockResolvedValue(mockVerification);

      await expect(authService.verifyEmail(token)).rejects.toThrow('Geçersiz veya süresi dolmuş doğrulama linki');
    });
  });

  describe('login', () => {
    const mockEmail = 'test@university.edu';
    const mockPassword = 'Password123';
    const mockMetadata = { ip: '127.0.0.1', userAgent: 'test-agent' };

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        role: 'student',
        is_verified: true,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          email: mockEmail,
          role: 'student',
        }),
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.RefreshToken.create.mockResolvedValue({});

      const result = await authService.login(mockEmail, mockPassword, mockMetadata);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(comparePassword).toHaveBeenCalledWith(mockPassword, mockUser.password_hash);
      expect(db.RefreshToken.create).toHaveBeenCalled();
      expect(mockUser.update).toHaveBeenCalledWith({ last_login: expect.any(Date) });
    });

    it('should throw error if user not found', async () => {
      db.User.findOne.mockResolvedValue(null);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow('E-posta veya şifre hatalı');
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        is_verified: true,
        is_active: true,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow('E-posta veya şifre hatalı');
    });

    it('should throw error if user is not verified', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        is_verified: false,
        is_active: true,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow('Lütfen önce e-posta adresinizi doğrulayın');
    });

    it('should throw error if user is not active', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        is_verified: true,
        is_active: false,
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow('Hesabınız aktif değil');
    });

    it('should include student data in response', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        role: 'student',
        is_verified: true,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          student: { student_number: '20240001' },
        }),
        student: { student_number: '20240001' },
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.RefreshToken.create.mockResolvedValue({});

      const result = await authService.login(mockEmail, mockPassword);

      expect(result.user).toHaveProperty('student');
    });

    it('should include faculty data in response', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        role: 'faculty',
        is_verified: true,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          faculty: { employee_number: 'EMP001' },
        }),
        student: null,
        faculty: { employee_number: 'EMP001' },
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.RefreshToken.create.mockResolvedValue({});

      const result = await authService.login(mockEmail, mockPassword);

      expect(result.user).toHaveProperty('faculty');
    });

    it('should save refresh token with metadata', async () => {
      const mockUser = {
        id: 'user-id',
        email: mockEmail,
        password_hash: 'hashedPassword',
        role: 'student',
        is_verified: true,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({ id: 'user-id' }),
        student: null,
        faculty: null,
      };

      db.User.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.RefreshToken.create.mockResolvedValue({});

      await authService.login(mockEmail, mockPassword, mockMetadata);

      expect(db.RefreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          token: 'refresh-token',
          ip_address: mockMetadata.ip,
          user_agent: mockMetadata.userAgent,
        })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const decoded = { userId: 'user-id', email: 'test@test.com', role: 'student' };

      jwtUtils.verifyToken.mockReturnValue(decoded);

      const mockStoredToken = {
        isValid: jest.fn().mockReturnValue(true),
      };

      db.RefreshToken.findOne.mockResolvedValue(mockStoredToken);
      jwtUtils.generateAccessToken.mockReturnValue('new-access-token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('new-access-token');
      expect(jwtUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    });

    it('should throw error for invalid token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow('Geçersiz veya süresi dolmuş token');
    });

    it('should throw error if refresh token not found in database', async () => {
      const refreshToken = 'valid-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.RefreshToken.findOne.mockResolvedValue(null);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Geçersiz veya süresi dolmuş token');
    });

    it('should throw error if refresh token is revoked', async () => {
      const refreshToken = 'revoked-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockStoredToken = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.RefreshToken.findOne.mockResolvedValue(mockStoredToken);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Geçersiz veya süresi dolmuş token');
    });

    it('should throw error if refresh token is expired', async () => {
      const refreshToken = 'expired-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockStoredToken = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.RefreshToken.findOne.mockResolvedValue(mockStoredToken);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow('Geçersiz veya süresi dolmuş token');
    });
  });

  describe('logout', () => {
    it('should successfully logout and revoke refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      db.RefreshToken.update.mockResolvedValue([1]);

      await authService.logout(refreshToken);

      expect(db.RefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { token: refreshToken } }
      );
    });

    it('should handle logout without token gracefully', async () => {
      await authService.logout(null);

      expect(db.RefreshToken.update).not.toHaveBeenCalled();
    });

    it('should handle logout with empty token gracefully', async () => {
      await authService.logout('');

      expect(db.RefreshToken.update).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should successfully send password reset email for existing user', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        first_name: 'Test',
      };

      db.User.findOne.mockResolvedValue(mockUser);
      jwtUtils.generateResetToken.mockReturnValue('reset-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.PasswordReset.update.mockResolvedValue([1]);
      db.PasswordReset.create.mockResolvedValue({});

      const result = await authService.forgotPassword(email);

      expect(result).toHaveProperty('message');
      expect(db.PasswordReset.update).toHaveBeenCalled();
      expect(db.PasswordReset.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success message even if user does not exist (security)', async () => {
      db.User.findOne.mockResolvedValue(null);

      const result = await authService.forgotPassword('nonexistent@test.com');

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('şifre sıfırlama bağlantısı');
    });

    it('should invalidate old reset tokens', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        first_name: 'Test',
      };

      db.User.findOne.mockResolvedValue(mockUser);
      jwtUtils.generateResetToken.mockReturnValue('reset-token');
      jwtUtils.getExpirationDate.mockReturnValue(new Date());
      db.PasswordReset.update.mockResolvedValue([1]);
      db.PasswordReset.create.mockResolvedValue({});

      await authService.forgotPassword(email);

      expect(db.PasswordReset.update).toHaveBeenCalledWith(
        { is_used: true },
        { where: { user_id: mockUser.id, is_used: false } }
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123';
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

      const result = await authService.resetPassword(token, newPassword);

      expect(result).toHaveProperty('message');
      expect(hashPassword).toHaveBeenCalledWith(newPassword);
      expect(db.User.update).toHaveBeenCalledWith(
        { password_hash: 'newHashedPassword' },
        { where: { id: decoded.userId } }
      );
      expect(mockResetRecord.update).toHaveBeenCalledWith({ is_used: true });
      expect(db.RefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { user_id: decoded.userId } }
      );
    });

    it('should throw error for invalid token', async () => {
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.resetPassword('invalid-token', 'NewPassword123')).rejects.toThrow('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
    });

    it('should throw error if reset record not found', async () => {
      const token = 'valid-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });
      db.PasswordReset.findOne.mockResolvedValue(null);

      await expect(authService.resetPassword(token, 'NewPassword123')).rejects.toThrow('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
    });

    it('should throw error if reset token is already used', async () => {
      const token = 'used-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockResetRecord = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.PasswordReset.findOne.mockResolvedValue(mockResetRecord);

      await expect(authService.resetPassword(token, 'NewPassword123')).rejects.toThrow('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
    });

    it('should throw error if reset token is expired', async () => {
      const token = 'expired-token';
      jwtUtils.verifyToken.mockReturnValue({ userId: 'user-id' });

      const mockResetRecord = {
        isValid: jest.fn().mockReturnValue(false),
      };

      db.PasswordReset.findOne.mockResolvedValue(mockResetRecord);

      await expect(authService.resetPassword(token, 'NewPassword123')).rejects.toThrow('Geçersiz veya süresi dolmuş şifre sıfırlama linki');
    });

    it('should invalidate all refresh tokens after password reset', async () => {
      const token = 'valid-reset-token';
      const decoded = { userId: 'user-id' };

      jwtUtils.verifyToken.mockReturnValue(decoded);

      const mockResetRecord = {
        isValid: jest.fn().mockReturnValue(true),
        update: jest.fn().mockResolvedValue(true),
      };

      db.PasswordReset.findOne.mockResolvedValue(mockResetRecord);
      hashPassword.mockResolvedValue('newHashedPassword');
      db.User.update.mockResolvedValue([1]);
      db.RefreshToken.update.mockResolvedValue([1]);

      await authService.resetPassword(token, 'NewPassword123');

      expect(db.RefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { user_id: decoded.userId } }
      );
    });
  });
});

