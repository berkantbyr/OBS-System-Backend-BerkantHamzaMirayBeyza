const prerequisiteService = require('../../src/services/prerequisiteService');

describe('PrerequisiteService', () => {
  describe('gradeCompare', () => {
    it('should return positive when first grade is higher', () => {
      expect(prerequisiteService.gradeCompare('AA', 'BB')).toBeGreaterThan(0);
      expect(prerequisiteService.gradeCompare('BB', 'CC')).toBeGreaterThan(0);
      expect(prerequisiteService.gradeCompare('CC', 'DD')).toBeGreaterThan(0);
    });

    it('should return negative when first grade is lower', () => {
      expect(prerequisiteService.gradeCompare('BB', 'AA')).toBeLessThan(0);
      expect(prerequisiteService.gradeCompare('CC', 'BB')).toBeLessThan(0);
      expect(prerequisiteService.gradeCompare('FF', 'DD')).toBeLessThan(0);
    });

    it('should return 0 when grades are equal', () => {
      expect(prerequisiteService.gradeCompare('AA', 'AA')).toBe(0);
      expect(prerequisiteService.gradeCompare('BB', 'BB')).toBe(0);
      expect(prerequisiteService.gradeCompare('FF', 'FF')).toBe(0);
    });

    it('should handle unknown grades', () => {
      expect(prerequisiteService.gradeCompare('XY', 'AA')).toBe(0);
      expect(prerequisiteService.gradeCompare('AA', 'XY')).toBe(0);
    });

    it('should correctly compare all grade pairs', () => {
      const grades = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD', 'FF'];
      
      for (let i = 0; i < grades.length - 1; i++) {
        for (let j = i + 1; j < grades.length; j++) {
          expect(prerequisiteService.gradeCompare(grades[i], grades[j])).toBeGreaterThan(0);
          expect(prerequisiteService.gradeCompare(grades[j], grades[i])).toBeLessThan(0);
        }
      }
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

    it('should handle cycle detection with visited set', async () => {
      // Test that the visited set prevents infinite loops
      const visited = new Set(['some-course-id']);
      const result = await prerequisiteService.getAllPrerequisites('some-course-id', visited);
      expect(result).toEqual([]);
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
