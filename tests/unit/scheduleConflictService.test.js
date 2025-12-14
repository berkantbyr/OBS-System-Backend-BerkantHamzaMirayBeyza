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
    it('should be a function', () => {
      expect(typeof scheduleConflictService.checkScheduleConflict).toBe('function');
    });
  });

  describe('getStudentSchedule', () => {
    it('should be a function', () => {
      expect(typeof scheduleConflictService.getStudentSchedule).toBe('function');
    });
  });
});
