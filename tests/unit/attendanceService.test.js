// Mock Sequelize models with native Jest mocks (no sequelize-mock)
jest.mock('../../src/models', () => {
  const mockFuncs = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  };

  return {
    User: { ...mockFuncs },
    Student: { ...mockFuncs },
    AttendanceSession: { ...mockFuncs },
    AttendanceRecord: { ...mockFuncs, findAll: jest.fn().mockResolvedValue([]) },
    CourseSection: { ...mockFuncs },
    Classroom: { ...mockFuncs },
    Enrollment: { ...mockFuncs },
    sequelize: {
      transaction: jest.fn(cb => cb ? cb({}) : Promise.resolve())
    }
  };
});

const attendanceService = require('../../src/services/attendanceService');

describe('Attendance Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance (Haversine)', () => {
    it('should calculate distance between two points', () => {
      // Same point should return 0
      const distance = attendanceService.calculateDistance(41.0, 29.0, 41.0, 29.0);
      expect(distance).toBe(0);
    });

    it('should return positive distance for different points', () => {
      const distance = attendanceService.calculateDistance(41.0, 29.0, 41.1, 29.1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should correctly calculate known distance', () => {
      // ~111km per degree at equator
      const distance = attendanceService.calculateDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(100000); // Should be roughly 111km
    });
  });

  describe('checkGeofence', () => {
    it('should handle geofence check', () => {
      // Just verify the function exists and returns an object
      const result = attendanceService.checkGeofence(
        { latitude: 41.0, longitude: 29.0, accuracy: 10 },
        { latitude: 41.0, longitude: 29.0, geofence_radius: 100 }
      );
      expect(result).toHaveProperty('isWithin');
      expect(result).toHaveProperty('distance');
    });
  });

  describe('detectSpoofing', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.detectSpoofing).toBe('function');
    });

    it('should detect suspiciously high accuracy', async () => {
      const { AttendanceRecord } = require('../../src/models');
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 1 }, // Very high accuracy
        { latitude: 41.0, longitude: 29.0 },
        'student-1'
      );
      expect(result.isSuspicious).toBe(true);
    });

    it('should return object with isSuspicious property', async () => {
      const { AttendanceRecord } = require('../../src/models');
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 50 },
        { latitude: 41.0, longitude: 29.0 },
        'student-1'
      );
      expect(result).toHaveProperty('isSuspicious');
      expect(result).toHaveProperty('reasons');
    });
  });

  describe('processCheckIn', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.processCheckIn).toBe('function');
    });
  });

  describe('getStudentAttendanceStats', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.getStudentAttendanceStats).toBe('function');
    });
  });
});
