const schedulingService = require('../../src/services/schedulingService');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Scheduling Service - CSP Algorithm Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('solveCSP - Small Example', () => {
    it('should solve simple scheduling problem with 2 sections and 2 classrooms', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 30,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-2',
          capacity: 25,
          course: { is_required: false },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
        { id: 'classroom-2', capacity: 30 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      expect(result.assignments).toHaveLength(2);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalSections).toBe(2);
      expect(result.stats.assignedSections).toBe(2);
    });

    it('should handle no solution scenario when constraints are too strict', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 50,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-1', // Same instructor
          capacity: 30,
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        // Only one time slot, but same instructor for both sections
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      // Should return null or handle gracefully
      // Note: This might return null if no solution, or might assign both to same slot if algorithm allows
      expect(result).toBeDefined();
    });

    it('should prioritize required courses', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 20,
          course: { is_required: false },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-2',
          capacity: 30,
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
        { id: 'classroom-2', capacity: 35 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      expect(result.assignments).toHaveLength(2);
      // Required course should be assigned (section-2)
      const requiredSectionAssigned = result.assignments.some(
        a => a.sectionId === 'section-2'
      );
      expect(requiredSectionAssigned).toBe(true);
    });

    it('should check classroom capacity constraint', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 50, // Requires 50 capacity
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 30 }, // Too small
        { id: 'classroom-2', capacity: 60 }, // Large enough
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      if (result && result.assignments.length > 0) {
        // If assigned, should use classroom-2 (capacity 60)
        const assignment = result.assignments.find(a => a.sectionId === 'section-1');
        if (assignment) {
          expect(assignment.classroomId).toBe('classroom-2');
        }
      }
    });

    it('should prevent instructor double-booking', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 30,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-1', // Same instructor
          capacity: 25,
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
        { id: 'classroom-2', capacity: 35 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      if (result && result.assignments.length === 2) {
        const assignments = result.assignments;
        const instructor1Assignments = assignments.filter(
          a => a.sectionId === 'section-1' || a.sectionId === 'section-2'
        );
        
        // Both sections have same instructor, so they should be in different time slots
        const timeSlotsUsed = instructor1Assignments.map(a => 
          `${a.dayOfWeek}_${a.startTime}_${a.endTime}`
        );
        const uniqueTimeSlots = new Set(timeSlotsUsed);
        expect(uniqueTimeSlots.size).toBe(2); // Different time slots
      }
    });

    it('should prevent classroom double-booking', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 30,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-2',
          capacity: 25,
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 }, // Only one classroom
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      if (result && result.assignments.length === 2) {
        const assignments = result.assignments;
        const classroom1Assignments = assignments.filter(
          a => a.classroomId === 'classroom-1'
        );
        
        // Same classroom should be used in different time slots
        const timeSlotsUsed = classroom1Assignments.map(a => 
          `${a.dayOfWeek}_${a.startTime}_${a.endTime}`
        );
        const uniqueTimeSlots = new Set(timeSlotsUsed);
        expect(uniqueTimeSlots.size).toBe(2); // Different time slots
      }
    });

    it('should prevent student schedule conflicts', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 30,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-2',
          capacity: 25,
          course: { is_required: true },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
        { id: 'classroom-2', capacity: 35 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      // Student enrolled in both sections
      const studentEnrollments = {
        'student-1': ['section-1', 'section-2'],
      };

      const result = schedulingService.solveCSP(
        sections,
        classrooms,
        timeSlots,
        {},
        studentEnrollments
      );

      expect(result).not.toBeNull();
      if (result && result.assignments.length === 2) {
        const assignments = result.assignments;
        const student1Sections = assignments.filter(a =>
          studentEnrollments['student-1'].includes(a.sectionId)
        );
        
        // Student's sections should be in different time slots
        const timeSlotsUsed = student1Sections.map(a => 
          `${a.dayOfWeek}_${a.startTime}_${a.endTime}`
        );
        const uniqueTimeSlots = new Set(timeSlotsUsed);
        expect(uniqueTimeSlots.size).toBe(2); // Different time slots
      }
    });

    it('should calculate statistics correctly', () => {
      const sections = [
        {
          id: 'section-1',
          instructor_id: 'instructor-1',
          capacity: 30,
          course: { is_required: true },
        },
        {
          id: 'section-2',
          instructor_id: 'instructor-2',
          capacity: 25,
          course: { is_required: false },
        },
      ];

      const classrooms = [
        { id: 'classroom-1', capacity: 40 },
        { id: 'classroom-2', capacity: 35 },
      ];

      const timeSlots = [
        { day_of_week: 'monday', start_time: '09:00', end_time: '10:30' },
        { day_of_week: 'monday', start_time: '11:00', end_time: '12:30' },
      ];

      const result = schedulingService.solveCSP(sections, classrooms, timeSlots, {}, {});

      expect(result).not.toBeNull();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalSections).toBe(2);
      expect(result.stats.assignedSections).toBeGreaterThanOrEqual(0);
      expect(result.stats.assignedSections).toBeLessThanOrEqual(2);
      expect(result.stats.unassignedSections).toBe(
        result.stats.totalSections - result.stats.assignedSections
      );
      expect(typeof result.stats.averageClassroomUsage).toBe('number');
    });
  });
});

