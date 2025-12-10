const Joi = require('joi');

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
  studentNumber: /^[0-9]{8,12}$/,
  employeeNumber: /^[A-Z]{2}[0-9]{4,8}$/,
};

// Registration validation schema
const registerSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Geçerli bir e-posta adresi giriniz',
      'any.required': 'E-posta adresi zorunludur',
      'string.empty': 'E-posta adresi zorunludur',
    }),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.min': 'Şifre en az 8 karakter olmalıdır',
      'string.pattern.name': 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
      'any.required': 'Şifre zorunludur',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Şifreler eşleşmiyor',
      'any.required': 'Şifre tekrarı zorunludur',
    }),
  firstName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Ad en az 2 karakter olmalıdır',
      'any.required': 'Ad zorunludur',
    }),
  lastName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Soyad en az 2 karakter olmalıdır',
      'any.required': 'Soyad zorunludur',
    }),
  role: Joi.string()
    .valid('student', 'faculty')
    .required()
    .messages({
      'any.only': 'Geçerli bir kullanıcı tipi seçiniz',
      'any.required': 'Kullanıcı tipi zorunludur',
    }),
  studentNumber: Joi.when('role', {
    is: 'student',
    then: Joi.string()
      .pattern(/^[0-9]{8,12}$/)
      .required()
      .messages({
        'string.pattern.base': 'Geçerli bir öğrenci numarası giriniz',
        'any.required': 'Öğrenci numarası zorunludur',
      }),
    otherwise: Joi.optional(),
  }),
  employeeNumber: Joi.when('role', {
    is: 'faculty',
    then: Joi.string()
      .min(4)
      .max(20)
      .required()
      .messages({
        'any.required': 'Personel numarası zorunludur',
      }),
    otherwise: Joi.optional(),
  }),
  departmentId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Geçerli bir bölüm seçiniz',
    }),
  title: Joi.when('role', {
    is: 'faculty',
    then: Joi.string()
      .valid('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'research_assistant')
      .optional(),
    otherwise: Joi.optional(),
  }),
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Geçerli bir e-posta adresi giriniz',
      'any.required': 'E-posta adresi zorunludur',
      'string.empty': 'E-posta adresi zorunludur',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Şifre zorunludur',
    }),
});

// Profile update validation schema
const profileUpdateSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Ad en az 2 karakter olmalıdır',
    }),
  lastName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Soyad en az 2 karakter olmalıdır',
    }),
  phone: Joi.string()
    .pattern(patterns.phone)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Geçerli bir telefon numarası giriniz',
    }),
});

// Password change validation schema
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Mevcut şifre zorunludur',
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.min': 'Yeni şifre en az 8 karakter olmalıdır',
      'string.pattern.name': 'Yeni şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
      'any.required': 'Yeni şifre zorunludur',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Şifreler eşleşmiyor',
      'any.required': 'Şifre tekrarı zorunludur',
    }),
});

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Geçerli bir e-posta adresi giriniz',
      'any.required': 'E-posta adresi zorunludur',
      'string.empty': 'E-posta adresi zorunludur',
    }),
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token zorunludur',
    }),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.min': 'Şifre en az 8 karakter olmalıdır',
      'string.pattern.name': 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
      'any.required': 'Şifre zorunludur',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Şifreler eşleşmiyor',
      'any.required': 'Şifre tekrarı zorunludur',
    }),
});

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
  sortBy: Joi.string()
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc', 'ASC', 'DESC')
    .default('asc'),
});

module.exports = {
  patterns,
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  passwordChangeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  paginationSchema,
};

