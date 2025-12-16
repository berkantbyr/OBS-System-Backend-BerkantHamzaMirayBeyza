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
    Enrollment: { ...mockFuncs },
    CourseSection: { ...mockFuncs },
    Course: { ...mockFuncs },
    Faculty: { ...mockFuncs },
    Classroom: { ...mockFuncs },
    User: { ...mockFuncs },
    sequelize: {
      transaction: jest.fn(cb => cb ? cb({}) : Promise.resolve())
    }
  };
});

const db = require('../../src/models');
const scheduleConflictService = require('../../src/services/scheduleConflictService');

describe('ScheduleConflictService', () => {
  describe('timeToMinutes', () => {
    it('should convert time string to minutes since midnight', () => {
      expect(scheduleConflictService.timeToMinutes('00:00')).toBe(0);
      expect(scheduleConflictService.timeToMinutes('01:00')).toBe(60);
      expect(scheduleConflictService.timeToMinutes('12:30')).toBe(750);
      expect(scheduleConflictService.timeToMinutes('23:59')).toBe(1439);
    });

    it('should handle edge cases', () => {
      expect(scheduleConflictService.timeToMinutes(null)).toBe(0);
      expect(scheduleConflictService.timeToMinutes(undefined)).toBe(0);
      expect(scheduleConflictService.timeToMinutes('')).toBe(0);
    });

    it('should handle different time formats', () => {
      expect(scheduleConflictService.timeToMinutes('9:00')).toBe(540);
      expect(scheduleConflictService.timeToMinutes('09:00')).toBe(540);
    });
  });

  describe('timeSlotsOverlap', () => {
    it('should detect overlapping time slots on same day', () => {
      const slot1 = { day: 'Monday', start_time: '09:00', end_time: '10:30' };
      const slot2 = { day: 'Monday', start_time: '10:00', end_time: '11:30' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should detect non-overlapping time slots on same day', () => {
      const slot1 = { day: 'Monday', start_time: '09:00', end_time: '10:00' };
      const slot2 = { day: 'Monday', start_time: '10:00', end_time: '11:00' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(false);
    });

    it('should return false for different days', () => {
      const slot1 = { day: 'Monday', start_time: '09:00', end_time: '10:30' };
      const slot2 = { day: 'Tuesday', start_time: '09:00', end_time: '10:30' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(false);
    });

    it('should handle case-insensitive day comparison', () => {
      const slot1 = { day: 'MONDAY', start_time: '09:00', end_time: '10:30' };
      const slot2 = { day: 'monday', start_time: '10:00', end_time: '11:30' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should detect complete overlap (one slot inside another)', () => {
      const slot1 = { day: 'Monday', start_time: '09:00', end_time: '12:00' };
      const slot2 = { day: 'Monday', start_time: '10:00', end_time: '11:00' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should detect exact same time slot', () => {
      const slot1 = { day: 'Monday', start_time: '09:00', end_time: '10:30' };
      const slot2 = { day: 'Monday', start_time: '09:00', end_time: '10:30' };
      
      expect(scheduleConflictService.timeSlotsOverlap(slot1, slot2)).toBe(true);
    });
  });

  describe('parseSchedule', () => {
    it('should return empty array for null/undefined', () => {
      expect(scheduleConflictService.parseSchedule(null)).toEqual([]);
      expect(scheduleConflictService.parseSchedule(undefined)).toEqual([]);
    });

    it('should return array as is', () => {
      const schedule = [{ day: 'Monday', start_time: '09:00', end_time: '10:30' }];
      expect(scheduleConflictService.parseSchedule(schedule)).toEqual(schedule);
    });

    it('should parse JSON string', () => {
      const schedule = [{ day: 'Monday', start_time: '09:00', end_time: '10:30' }];
      const jsonString = JSON.stringify(schedule);
      expect(scheduleConflictService.parseSchedule(jsonString)).toEqual(schedule);
    });

    it('should handle invalid JSON string', () => {
      expect(scheduleConflictService.parseSchedule('invalid json')).toEqual([]);
    });
  });

  describe('checkScheduleConflict', () => {
    it('should return no conflict when new section has no schedule', async () => {
      const { CourseSection, Enrollment } = db;

      CourseSection.findByPk.mockResolvedValue({
        id: 1,
        semester: 'fall',
        year: 2024,
        schedule_json: null,
        course: { code: 'CS101', name: 'Programlama' }
      });

      Enrollment.findAll.mockResolvedValue([]);

      const result = await scheduleConflictService.checkScheduleConflict('student-1', 1);

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('should detect conflict with existing enrolled section in same semester', async () => {
      const { CourseSection, Enrollment, Course } = db;

      // New section
      CourseSection.findByPk.mockResolvedValue({
        id: 2,
        semester: 'fall',
        year: 2024,
        section_number: '2',
        schedule_json: JSON.stringify([
          { day: 'monday', start_time: '09:00', end_time: '10:30' }
        ]),
        course: { code: 'CS101', name: 'Programlama I' }
      });

      // Existing enrollment with overlapping schedule
      Enrollment.findAll.mockResolvedValue([{
        section: {
          section_number: '1',
          semester: 'fall',
          year: 2024,
          schedule_json: JSON.stringify([
            { day: 'monday', start_time: '09:30', end_time: '11:00' }
          ]),
          course: { code: 'MATH101', name: 'Matematik I' }
        }
      }]);

      const result = await scheduleConflictService.checkScheduleConflict('student-1', 2);

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        conflictDay: 'monday',
        existingCourse: expect.objectContaining({ code: 'MATH101' }),
        newCourse: expect.objectContaining({ code: 'CS101' })
      });
    });
  });

  describe('getStudentSchedule', () => {
    it('should return sorted weekly schedule for student', async () => {
      const { Enrollment, CourseSection } = db;

      Enrollment.findAll.mockResolvedValue([
        {
          section: {
            section_number: '1',
            semester: 'fall',
            year: 2024,
            schedule_json: JSON.stringify([
              { day: 'wednesday', start_time: '13:00', end_time: '14:30' },
              { day: 'monday', start_time: '09:00', end_time: '10:30' }
            ]),
            course: { code: 'CS101', name: 'Programlamaya Giriş' },
            instructor: {
              user: { first_name: 'Ali', last_name: 'Yılmaz' }
            },
            classroom: { building: 'A', room_number: '101' }
          }
        }
      ]);

      const schedule = await scheduleConflictService.getStudentSchedule('student-1', 'fall', 2024);

      expect(schedule).toHaveLength(2);
      // Should be sorted: Monday first, then Wednesday
      expect(schedule[0].day.toLowerCase()).toBe('monday');
      expect(schedule[1].day.toLowerCase()).toBe('wednesday');
      expect(schedule[0].course.code).toBe('CS101');
      expect(schedule[0].instructor).toBe('Ali Yılmaz');
      expect(schedule[0].classroom).toBe('A 101');
    });
  });
});
