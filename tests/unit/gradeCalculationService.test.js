const gradeCalculationService = require('../../src/services/gradeCalculationService');

describe('GradeCalculationService', () => {
  describe('calculateLetterGrade', () => {
    it('should return AA for 90-100', () => {
      expect(gradeCalculationService.calculateLetterGrade(90)).toBe('AA');
      expect(gradeCalculationService.calculateLetterGrade(95)).toBe('AA');
      expect(gradeCalculationService.calculateLetterGrade(100)).toBe('AA');
    });

    it('should return BA for 85-89', () => {
      expect(gradeCalculationService.calculateLetterGrade(85)).toBe('BA');
      expect(gradeCalculationService.calculateLetterGrade(89)).toBe('BA');
    });

    it('should return BB for 80-84', () => {
      expect(gradeCalculationService.calculateLetterGrade(80)).toBe('BB');
      expect(gradeCalculationService.calculateLetterGrade(84)).toBe('BB');
    });

    it('should return CB for 75-79', () => {
      expect(gradeCalculationService.calculateLetterGrade(75)).toBe('CB');
      expect(gradeCalculationService.calculateLetterGrade(79)).toBe('CB');
    });

    it('should return CC for 70-74', () => {
      expect(gradeCalculationService.calculateLetterGrade(70)).toBe('CC');
      expect(gradeCalculationService.calculateLetterGrade(74)).toBe('CC');
    });

    it('should return DC for 65-69', () => {
      expect(gradeCalculationService.calculateLetterGrade(65)).toBe('DC');
      expect(gradeCalculationService.calculateLetterGrade(69)).toBe('DC');
    });

    it('should return DD for 60-64', () => {
      expect(gradeCalculationService.calculateLetterGrade(60)).toBe('DD');
      expect(gradeCalculationService.calculateLetterGrade(64)).toBe('DD');
    });

    it('should return FD for 50-59', () => {
      expect(gradeCalculationService.calculateLetterGrade(50)).toBe('FD');
      expect(gradeCalculationService.calculateLetterGrade(59)).toBe('FD');
    });

    it('should return FF for below 50', () => {
      expect(gradeCalculationService.calculateLetterGrade(0)).toBe('FF');
      expect(gradeCalculationService.calculateLetterGrade(49)).toBe('FF');
    });

    it('should handle null/undefined', () => {
      expect(gradeCalculationService.calculateLetterGrade(null)).toBe(null);
      expect(gradeCalculationService.calculateLetterGrade(undefined)).toBe(null);
    });

    it('should handle string numbers', () => {
      expect(gradeCalculationService.calculateLetterGrade('90')).toBe('AA');
      expect(gradeCalculationService.calculateLetterGrade('75.5')).toBe('CB');
    });
  });

  describe('getGradePoint', () => {
    it('should return correct grade points', () => {
      expect(gradeCalculationService.getGradePoint('AA')).toBe(4.0);
      expect(gradeCalculationService.getGradePoint('BA')).toBe(3.5);
      expect(gradeCalculationService.getGradePoint('BB')).toBe(3.0);
      expect(gradeCalculationService.getGradePoint('CB')).toBe(2.5);
      expect(gradeCalculationService.getGradePoint('CC')).toBe(2.0);
      expect(gradeCalculationService.getGradePoint('DC')).toBe(1.5);
      expect(gradeCalculationService.getGradePoint('DD')).toBe(1.0);
      expect(gradeCalculationService.getGradePoint('FD')).toBe(0.5);
      expect(gradeCalculationService.getGradePoint('FF')).toBe(0.0);
    });

    it('should return 0 for unknown grades', () => {
      expect(gradeCalculationService.getGradePoint('XY')).toBe(0.0);
      expect(gradeCalculationService.getGradePoint(null)).toBe(0.0);
    });
  });

  describe('calculateAverageGrade', () => {
    it('should calculate average with all components', () => {
      // Default weights: 30% midterm, 50% final, 20% homework
      const average = gradeCalculationService.calculateAverageGrade(80, 70, 90);
      // 80*0.3 + 70*0.5 + 90*0.2 = 24 + 35 + 18 = 77
      expect(average).toBe(77);
    });

    it('should calculate average without homework', () => {
      // Without homework: 40% midterm, 60% final
      const average = gradeCalculationService.calculateAverageGrade(80, 70, null);
      // 80*0.4 + 70*0.6 = 32 + 42 = 74
      expect(average).toBe(74);
    });

    it('should handle zero grades', () => {
      const average = gradeCalculationService.calculateAverageGrade(0, 0, 0);
      expect(average).toBe(0);
    });

    it('should handle perfect scores', () => {
      const average = gradeCalculationService.calculateAverageGrade(100, 100, 100);
      expect(average).toBe(100);
    });

    it('should handle custom weights', () => {
      const customWeights = { midterm: 0.4, final: 0.4, homework: 0.2 };
      const average = gradeCalculationService.calculateAverageGrade(80, 70, 90, customWeights);
      // 80*0.4 + 70*0.4 + 90*0.2 = 32 + 28 + 18 = 78
      expect(average).toBe(78);
    });
  });

  describe('updateGrades', () => {
    it('should be a function', () => {
      expect(typeof gradeCalculationService.updateGrades).toBe('function');
    });
  });

  describe('calculateSemesterGPA', () => {
    it('should be a function', () => {
      expect(typeof gradeCalculationService.calculateSemesterGPA).toBe('function');
    });
  });

  describe('calculateCGPA', () => {
    it('should be a function', () => {
      expect(typeof gradeCalculationService.calculateCGPA).toBe('function');
    });
  });

  describe('getTranscript', () => {
    it('should be a function', () => {
      expect(typeof gradeCalculationService.getTranscript).toBe('function');
    });
  });
});
