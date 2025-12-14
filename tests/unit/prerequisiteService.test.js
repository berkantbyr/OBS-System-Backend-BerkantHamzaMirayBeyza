// Mock Sequelize models with native Jest mocks (no sequelize-mock)
jest.mock('../../src/models', () => {
  const mockFuncs = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  };

  return {
    Course: { ...mockFuncs },
    Enrollment: { ...mockFuncs },
    Student: { ...mockFuncs },
    CoursePrerequisite: { ...mockFuncs },
    sequelize: {
      transaction: jest.fn(cb => cb ? cb({}) : Promise.resolve())
    }
  };
});

const prerequisiteService = require('../../src/services/prerequisiteService');

describe('Prerequisite Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('gradeCompare', () => {
    it('should correctly compare AA > BB', () => {
      const result = prerequisiteService.gradeCompare('AA', 'BB');
      expect(result).toBeGreaterThan(0);
    });

    it('should correctly compare FF < DD', () => {
      const result = prerequisiteService.gradeCompare('FF', 'DD');
      expect(result).toBeLessThan(0);
    });

    it('should return 0 for equal grades', () => {
      const result = prerequisiteService.gradeCompare('BB', 'BB');
      expect(result).toBe(0);
    });

    it('should handle CC grade', () => {
      expect(prerequisiteService.gradeCompare('CC', 'DD')).toBeGreaterThan(0);
      expect(prerequisiteService.gradeCompare('CC', 'BB')).toBeLessThan(0);
    });
  });

  describe('getDirectPrerequisites', () => {
    it('should be a function', () => {
      expect(typeof prerequisiteService.getDirectPrerequisites).toBe('function');
    });
  });

  describe('getAllPrerequisites', () => {
    it('should be a function', () => {
      expect(typeof prerequisiteService.getAllPrerequisites).toBe('function');
    });
  });

  describe('checkPrerequisites', () => {
    it('should be a function', () => {
      expect(typeof prerequisiteService.checkPrerequisites).toBe('function');
    });
  });

  describe('hasCompletedCourse', () => {
    it('should be a function', () => {
      expect(typeof prerequisiteService.hasCompletedCourse).toBe('function');
    });
  });
});
