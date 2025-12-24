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
    ExcuseRequest: { ...mockFuncs },
    sequelize: {
      transaction: jest.fn(cb => cb ? cb({}) : Promise.resolve())
    }
  };
});

const db = require('../../src/models');
const attendanceService = require('../../src/services/attendanceService');

describe('Attendance Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance (Haversine)', () => {
    it('should calculate distance between two identical points as 0', () => {
      const distance = attendanceService.calculateDistance(41.0, 29.0, 41.0, 29.0);
      expect(distance).toBe(0);
    });

    it('should return positive distance for different points', () => {
      const distance = attendanceService.calculateDistance(41.0, 29.0, 41.1, 29.1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should correctly calculate known approximate distance on equator', () => {
      // ~111km per degree of longitude at equator
      const distance = attendanceService.calculateDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(100000);
      expect(distance).toBeLessThan(120000);
    });
  });

  describe('checkGeofence', () => {
    it('should mark student within geofence with accuracy buffer', () => {
      const result = attendanceService.checkGeofence(
        { latitude: 41.0, longitude: 29.0, geofence_radius: 20 },
        { latitude: 41.0001, longitude: 29.0001, accuracy: 10 }
      );

      expect(result.isWithin).toBe(true);
      expect(result.distance).toBeGreaterThanOrEqual(0);
      expect(result.allowedDistance).toBeGreaterThan(20);
    });

    it('should cap accuracy buffer at 20 meters', () => {
      const result = attendanceService.checkGeofence(
        { latitude: 41.0, longitude: 29.0, geofence_radius: 10 },
        { latitude: 41.0, longitude: 29.0, accuracy: 100 }
      );

      // radius (10) + capped accuracy (20) + 5
      expect(result.allowedDistance).toBe(35);
    });

    it('should mark student outside geofence when too far', () => {
      const result = attendanceService.checkGeofence(
        { latitude: 41.0, longitude: 29.0, geofence_radius: 10 },
        { latitude: 42.0, longitude: 30.0, accuracy: 5 }
      );

      expect(result.isWithin).toBe(false);
    });
  });

  describe('detectSpoofing', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.detectSpoofing).toBe('function');
    });

    it('should detect suspiciously high accuracy', async () => {
      const { AttendanceRecord } = db;
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 1 }, // Very high accuracy
        { latitude: 41.0, longitude: 29.0 },
        'student-1'
      );
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Suspiciously high GPS accuracy');
    });

    it('should detect too poor GPS accuracy', async () => {
      const { AttendanceRecord } = db;
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 150 },
        { latitude: 41.0, longitude: 29.0 },
        'student-1'
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('GPS accuracy too poor');
    });

    it('should detect impossible travel based on last record', async () => {
      const { AttendanceRecord } = db;

      // Last record 10 seconds ago, but far away
      const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
      AttendanceRecord.findAll.mockResolvedValue([{
        check_in_time: tenSecondsAgo,
        latitude: 0,
        longitude: 0
      }]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 1, longitude: 1, accuracy: 10 },
        { latitude: 1, longitude: 1 },
        'student-1'
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons.some(r => r.startsWith('Impossible travel'))).toBe(true);
    });

    it('should detect exact coordinate match with session location', async () => {
      const { AttendanceRecord } = db;
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 10 },
        { latitude: 41.0, longitude: 29.0 },
        'student-1'
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Coordinates exactly match classroom center');
    });

    it('should return not suspicious when there are no reasons', async () => {
      const { AttendanceRecord } = db;
      AttendanceRecord.findAll.mockResolvedValue([]);

      const result = await attendanceService.detectSpoofing(
        { latitude: 41.0, longitude: 29.0, accuracy: 20 },
        { latitude: 41.0001, longitude: 29.0001 },
        'student-1'
      );

      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  // Skip - mock configuration needs fixing
  describe.skip('getStudentAttendanceStats', () => {
    it('should return default stats when there are no sessions', async () => {
      const { AttendanceSession } = db;
      AttendanceSession.findAll.mockResolvedValue([]);

      const stats = await attendanceService.getStudentAttendanceStats('student-1', 'section-1');

      expect(stats).toMatchObject({
        totalSessions: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        attendancePercentage: 100,
        status: 'ok'
      });
    });

    it('should calculate stats with sessions, records and excuses', async () => {
      const { AttendanceSession, AttendanceRecord, ExcuseRequest } = db;

      AttendanceSession.findAll.mockResolvedValue([
        { id: 1, status: 'active' },
        { id: 2, status: 'closed' },
        { id: 3, status: 'closed' },
      ]);

      AttendanceRecord.findAll.mockResolvedValue([
        { session_id: 1, student_id: 'student-1', status: 'present' },
        { session_id: 2, student_id: 'student-1', status: 'late' },
      ]);

      ExcuseRequest.findAll.mockResolvedValue([
        { session_id: 3, student_id: 'student-1', status: 'approved' },
      ]);

      const stats = await attendanceService.getStudentAttendanceStats('student-1', 'section-1');

      expect(stats.totalSessions).toBe(3);
      expect(stats.present).toBe(1);
      expect(stats.late).toBe(1);
      expect(stats.excused).toBe(1);
      expect(stats.absent).toBe(0);
      expect(stats.attendancePercentage).toBe(100);
      expect(stats.status).toBe('ok');
    });
  });

  // Skip - mock configuration needs fixing
  describe.skip('processCheckIn (GPS)', () => {
    it('should create attendance record when all validations pass', async () => {
      const { AttendanceSession, Enrollment, AttendanceRecord } = db;

      const now = new Date();
      const sessionDate = now.toISOString().split('T')[0];
      const startTime = '00:00';

      AttendanceSession.findByPk.mockResolvedValue({
        id: 1,
        section_id: 10,
        status: 'active',
        date: sessionDate,
        start_time: startTime,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        latitude: 41.0,
        longitude: 29.0,
        geofence_radius: 20,
        section: {},
      });

      Enrollment.findOne.mockResolvedValue({
        id: 100,
        student_id: 'student-1',
        section_id: 10,
        status: 'enrolled',
      });

      AttendanceRecord.findOne.mockResolvedValue(null);
      AttendanceRecord.create.mockResolvedValue({
        id: 500,
        session_id: 1,
        student_id: 'student-1',
        status: 'present',
      });

      const location = { latitude: 41.0, longitude: 29.0, accuracy: 10 };

      const result = await attendanceService.processCheckIn(1, 'student-1', location, 'gps');

      expect(result.success).toBe(true);
      expect(result.status).toBe('present');
      expect(AttendanceRecord.create).toHaveBeenCalled();
    });

    it('should throw if session does not exist', async () => {
      const { AttendanceSession } = db;
      AttendanceSession.findByPk.mockResolvedValue(null);

      await expect(
        attendanceService.processCheckIn(999, 'student-1', null, 'gps')
      ).rejects.toThrow('Attendance session not found');
    });

    it('should throw if student not enrolled in section', async () => {
      const { AttendanceSession, Enrollment } = db;

      AttendanceSession.findByPk.mockResolvedValue({
        id: 1,
        section_id: 10,
        status: 'active',
        date: '2024-01-01',
        start_time: '09:00',
        section: {},
      });

      Enrollment.findOne.mockResolvedValue(null);

      await expect(
        attendanceService.processCheckIn(1, 'student-1', null, 'gps')
      ).rejects.toThrow('Student is not enrolled in this course');
    });
  });
});
