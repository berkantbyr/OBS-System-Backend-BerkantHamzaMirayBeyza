module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/authService.js',
    'src/services/userService.js',
    'src/controllers/authController.js',
    'src/controllers/userController.js',
    'src/routes/authRoutes.js',
    'src/routes/userRoutes.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
};


