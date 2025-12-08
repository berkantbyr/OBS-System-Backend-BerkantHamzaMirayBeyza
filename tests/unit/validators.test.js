const {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  forgotPasswordSchema,
} = require('../../src/utils/validators');

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct student registration', () => {
      const data = {
        email: 'test@test.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        studentNumber: '20210001',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should validate correct faculty registration', () => {
      const data = {
        email: 'faculty@test.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        firstName: 'Test',
        lastName: 'Faculty',
        role: 'faculty',
        employeeNumber: 'AK0001',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        studentNumber: '20210001',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should reject mismatched passwords', () => {
      const data = {
        email: 'test@test.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        studentNumber: '20210001',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should reject weak password', () => {
      const data = {
        email: 'test@test.com',
        password: 'weak',
        confirmPassword: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        studentNumber: '20210001',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should require student number for students', () => {
      const data = {
        email: 'test@test.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
      };

      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@test.com',
        password: 'anypassword',
      };

      const { error } = loginSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const data = {
        password: 'anypassword',
      };

      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const data = {
        email: 'test@test.com',
      };

      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe('profileUpdateSchema', () => {
    it('should validate correct update data', () => {
      const data = {
        firstName: 'UpdatedName',
        lastName: 'UpdatedSurname',
        phone: '+905551234567',
      };

      const { error } = profileUpdateSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should allow partial updates', () => {
      const data = {
        firstName: 'OnlyName',
      };

      const { error } = profileUpdateSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject too short name', () => {
      const data = {
        firstName: 'A',
      };

      const { error } = profileUpdateSchema.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const data = {
        email: 'test@test.com',
      };

      const { error } = forgotPasswordSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'not-an-email',
      };

      const { error } = forgotPasswordSchema.validate(data);
      expect(error).toBeDefined();
    });
  });
});

