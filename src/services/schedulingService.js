const db = require('../models');
const { Schedule, CourseSection, Classroom, Enrollment } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * SchedulingService - Handles automatic course scheduling using CSP (Constraint Satisfaction Problem)
 */
class SchedulingService {
  /**
   * Generate automatic schedule
   * @param {Object} constraints - Scheduling constraints
   * @returns {Object} - Generated schedule
   */
  async generateSchedule(constraints) {
    logger.info('Starting schedule generation...');

    const {
      sections, // Array of { course_id, instructor_id, capacity, course_requirements }
      classrooms, // Array of { id, capacity, features }
      timeSlots, // Array of { day_of_week, start_time, end_time }
      instructorPreferences, // Optional: { instructor_id: { preferred_times: [...] } }
    } = constraints;

    // Get all sections with course info
    const sectionData = await CourseSection.findAll({
      where: {
        id: { [Op.in]: sections.map(s => s.id) },
      },
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Faculty, as: 'instructor' },
      ],
    });

    // Get all classrooms
    const classroomData = await Classroom.findAll({
      where: {
        id: { [Op.in]: classrooms.map(c => c.id) },
        is_active: true,
      },
    });

    // Get all enrollments to check student conflicts
    const enrollments = await Enrollment.findAll({
      where: {
        section_id: { [Op.in]: sections.map(s => s.id) },
        status: 'enrolled',
      },
      include: [{ model: CourseSection, as: 'section' }],
    });

    // Build student enrollment map
    const studentEnrollments = {};
    enrollments.forEach(enrollment => {
      if (!studentEnrollments[enrollment.student_id]) {
        studentEnrollments[enrollment.student_id] = [];
      }
      studentEnrollments[enrollment.student_id].push(enrollment.section_id);
    });

    // Run CSP algorithm
    const schedule = this.solveCSP(
      sectionData,
      classroomData,
      timeSlots,
      instructorPreferences,
      studentEnrollments
    );

    if (!schedule) {
      throw new Error('Uygun ders programı oluşturulamadı. Kısıtlamaları gevşetmeyi deneyin.');
    }

    // Save schedule to database
    const savedSchedules = [];
    for (const assignment of schedule.assignments) {
      const scheduleRecord = await Schedule.create({
        section_id: assignment.sectionId,
        day_of_week: assignment.dayOfWeek,
        start_time: assignment.startTime,
        end_time: assignment.endTime,
        classroom_id: assignment.classroomId,
      });
      savedSchedules.push(scheduleRecord);
    }

    logger.info(`Schedule generated successfully: ${savedSchedules.length} assignments`);

    return {
      success: true,
      schedule: savedSchedules,
      stats: schedule.stats,
    };
  }

  /**
   * CSP Solver using backtracking with heuristics
   * @param {Array} sections - Section data
   * @param {Array} classrooms - Classroom data
   * @param {Array} timeSlots - Time slot data
   * @param {Object} instructorPreferences - Instructor preferences
   * @param {Object} studentEnrollments - Student enrollment map
   * @returns {Object|null} - Schedule assignments or null if no solution
   */
  solveCSP(sections, classrooms, timeSlots, instructorPreferences = {}, studentEnrollments = {}) {
    const assignments = [];
    const usedSlots = {}; // { instructor_id: Set of slots, classroom_id: Set of slots, student_id: Set of slots }

    // Initialize used slots
    sections.forEach(section => {
      if (!usedSlots[section.instructor_id]) {
        usedSlots[section.instructor_id] = new Set();
      }
    });

    classrooms.forEach(classroom => {
      if (!usedSlots[classroom.id]) {
        usedSlots[classroom.id] = new Set();
      }
    });

    // Sort sections by priority (required courses first, then by capacity)
    const sortedSections = [...sections].sort((a, b) => {
      // Priority: required courses first
      const aRequired = a.course?.is_required || false;
      const bRequired = b.course?.is_required || false;
      if (aRequired !== bRequired) return bRequired - aRequired;
      // Then by capacity (larger first)
      return b.capacity - a.capacity;
    });

    // Backtracking function
    const backtrack = (index) => {
      if (index >= sortedSections.length) {
        return true; // All sections assigned
      }

      const section = sortedSections[index];
      const sectionId = section.id;
      const instructorId = section.instructor_id;
      const sectionCapacity = section.capacity || section.enrolled_count || 30;

      // Get valid classrooms (capacity >= section capacity, features match)
      const validClassrooms = classrooms.filter(classroom => {
        if (classroom.capacity < sectionCapacity) return false;
        // Check features match (if course requires specific features)
        // TODO: Implement feature matching logic
        return true;
      });

      // Sort classrooms by preference (prefer larger capacity, then by availability)
      validClassrooms.sort((a, b) => {
        const aUsed = usedSlots[a.id]?.size || 0;
        const bUsed = usedSlots[b.id]?.size || 0;
        if (aUsed !== bUsed) return aUsed - bUsed; // Less used first
        return b.capacity - a.capacity; // Larger capacity first
      });

      // Try each valid classroom
      for (const classroom of validClassrooms) {
        // Try each time slot
        for (const slot of timeSlots) {
          const slotKey = `${slot.day_of_week}_${slot.start_time}_${slot.end_time}`;

          // Check hard constraints
          if (!this.checkHardConstraints(
            section,
            classroom,
            slot,
            instructorId,
            usedSlots,
            studentEnrollments
          )) {
            continue;
          }

          // Assign
          assignments.push({
            sectionId,
            classroomId: classroom.id,
            dayOfWeek: slot.day_of_week,
            startTime: slot.start_time,
            endTime: slot.end_time,
          });

          // Mark slots as used
          usedSlots[instructorId].add(slotKey);
          usedSlots[classroom.id].add(slotKey);

          // Mark for students enrolled in this section
          Object.keys(studentEnrollments).forEach(studentId => {
            if (studentEnrollments[studentId].includes(sectionId)) {
              if (!usedSlots[studentId]) usedSlots[studentId] = new Set();
              usedSlots[studentId].add(slotKey);
            }
          });

          // Recursive call
          if (backtrack(index + 1)) {
            return true;
          }

          // Backtrack: remove assignment
          assignments.pop();
          usedSlots[instructorId].delete(slotKey);
          usedSlots[classroom.id].delete(slotKey);
          Object.keys(studentEnrollments).forEach(studentId => {
            if (studentEnrollments[studentId].includes(sectionId)) {
              usedSlots[studentId]?.delete(slotKey);
            }
          });
        }
      }

      return false; // No valid assignment found
    };

    if (backtrack(0)) {
      // Calculate stats
      const stats = {
        totalSections: sections.length,
        assignedSections: assignments.length,
        unassignedSections: sections.length - assignments.length,
        averageClassroomUsage: this.calculateAverageUsage(usedSlots, classrooms),
      };

      return { assignments, stats };
    }

    return null; // No solution found
  }

  /**
   * Check hard constraints
   * @param {Object} section - Section
   * @param {Object} classroom - Classroom
   * @param {Object} slot - Time slot
   * @param {string} instructorId - Instructor ID
   * @param {Object} usedSlots - Used slots map
   * @param {Object} studentEnrollments - Student enrollments
   * @returns {boolean} - True if constraints satisfied
   */
  checkHardConstraints(section, classroom, slot, instructorId, usedSlots, studentEnrollments) {
    const slotKey = `${slot.day_of_week}_${slot.start_time}_${slot.end_time}`;

    // 1. No instructor double-booking
    if (usedSlots[instructorId]?.has(slotKey)) {
      return false;
    }

    // 2. No classroom double-booking
    if (usedSlots[classroom.id]?.has(slotKey)) {
      return false;
    }

    // 3. No student schedule conflict
    const sectionStudents = Object.keys(studentEnrollments).filter(
      studentId => studentEnrollments[studentId].includes(section.id)
    );

    for (const studentId of sectionStudents) {
      if (usedSlots[studentId]?.has(slotKey)) {
        return false; // Student has conflict
      }
    }

    // 4. Classroom capacity >= section capacity
    if (classroom.capacity < (section.capacity || section.enrolled_count || 30)) {
      return false;
    }

    // 5. Classroom features match course requirements
    // TODO: Implement feature matching

    return true;
  }

  /**
   * Calculate average classroom usage
   * @param {Object} usedSlots - Used slots map
   * @param {Array} classrooms - Classrooms
   * @returns {number} - Average usage percentage
   */
  calculateAverageUsage(usedSlots, classrooms) {
    if (classrooms.length === 0) return 0;

    const totalUsage = classrooms.reduce((sum, classroom) => {
      return sum + (usedSlots[classroom.id]?.size || 0);
    }, 0);

    return totalUsage / classrooms.length;
  }

  /**
   * Get schedule by ID
   * @param {string} scheduleId - Schedule ID (not used, returns all schedules)
   * @returns {Array} - Array of schedules
   */
  async getSchedule(scheduleId = null) {
    const where = {};
    if (scheduleId) {
      where.id = scheduleId;
    }

    const schedules = await Schedule.findAll({
      where,
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [
            { model: db.Course, as: 'course' },
            { model: db.Faculty, as: 'instructor', include: [{ model: db.User, as: 'user' }] },
          ],
        },
        {
          model: Classroom,
          as: 'classroom',
        },
      ],
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
    });

    return schedules;
  }

  /**
   * Get raw user schedule data (for iCal export)
   * @param {string} userId - User ID
   * @param {string} userRole - User role ('student' or 'faculty')
   * @returns {Array} - Array of schedule records with full relations
   */
  async getRawUserSchedule(userId, userRole) {
    let schedules = [];

    if (userRole === 'student') {
      const student = await db.Student.findOne({ where: { user_id: userId } });
      if (!student) return [];

      const enrollments = await Enrollment.findAll({
        where: {
          student_id: student.id,
          status: 'enrolled',
        },
        include: [{ model: CourseSection, as: 'section' }],
      });

      const sectionIds = enrollments.map(e => e.section_id);

      schedules = await Schedule.findAll({
        where: {
          section_id: { [Op.in]: sectionIds },
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [
              { model: db.Course, as: 'course' },
            ],
          },
          {
            model: Classroom,
            as: 'classroom',
          },
        ],
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
      });
    } else if (userRole === 'faculty') {
      const faculty = await db.Faculty.findOne({ where: { user_id: userId } });
      if (!faculty) return [];

      const sections = await CourseSection.findAll({
        where: { instructor_id: faculty.id },
      });

      const sectionIds = sections.map(s => s.id);

      schedules = await Schedule.findAll({
        where: {
          section_id: { [Op.in]: sectionIds },
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [
              { model: db.Course, as: 'course' },
            ],
          },
          {
            model: Classroom,
            as: 'classroom',
          },
        ],
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
      });
    }

    return schedules;
  }

  /**
   * Get user's schedule (student or instructor)
   * @param {string} userId - User ID
   * @param {string} userRole - User role ('student' or 'faculty')
   * @returns {Object} - Weekly schedule
   */
  async getUserSchedule(userId, userRole) {
    let schedules = [];

    if (userRole === 'student') {
      // Get student's enrolled sections
      const student = await db.Student.findOne({ where: { user_id: userId } });
      if (!student) return { schedule: [] };

      const enrollments = await Enrollment.findAll({
        where: {
          student_id: student.id,
          status: 'enrolled',
        },
        include: [{ model: CourseSection, as: 'section' }],
      });

      const sectionIds = enrollments.map(e => e.section_id);

      schedules = await Schedule.findAll({
        where: {
          section_id: { [Op.in]: sectionIds },
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [
              { model: db.Course, as: 'course' },
            ],
          },
          {
            model: Classroom,
            as: 'classroom',
          },
        ],
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
      });
    } else if (userRole === 'faculty') {
      // Get faculty's sections
      const faculty = await db.Faculty.findOne({ where: { user_id: userId } });
      if (!faculty) return { schedule: [] };

      const sections = await CourseSection.findAll({
        where: { instructor_id: faculty.id },
      });

      const sectionIds = sections.map(s => s.id);

      schedules = await Schedule.findAll({
        where: {
          section_id: { [Op.in]: sectionIds },
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [
              { model: db.Course, as: 'course' },
            ],
          },
          {
            model: Classroom,
            as: 'classroom',
          },
        ],
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
      });
    }

    // Format as weekly schedule
    const weeklySchedule = this.formatWeeklySchedule(schedules);

    return { schedule: weeklySchedule };
  }

  /**
   * Format schedules as weekly schedule
   * @param {Array} schedules - Array of schedule records
   * @returns {Object} - Weekly schedule by day
   */
  formatWeeklySchedule(schedules) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekly = {};

    days.forEach(day => {
      weekly[day] = schedules
        .filter(s => s.day_of_week.toLowerCase() === day)
        .map(s => ({
          id: s.id,
          course: s.section?.course?.code || 'N/A',
          courseName: s.section?.course?.name || 'N/A',
          startTime: s.start_time,
          endTime: s.end_time,
          classroom: s.classroom ? `${s.classroom.building} ${s.classroom.room_number}` : 'TBA',
          instructor: s.section?.instructor?.user
            ? `${s.section.instructor.user.first_name} ${s.section.instructor.user.last_name}`
            : 'TBA',
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return weekly;
  }

  /**
   * Generate iCal export
   * @param {Array} schedules - Array of schedule records
   * @param {Date} startDate - Start date for the schedule (defaults to current week's Monday)
   * @returns {string} - iCal file content
   */
  generateICal(schedules, startDate = null) {
    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//University OBS//Schedule//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';
    ical += 'METHOD:PUBLISH\n';

    // Calculate start date (Monday of current week if not provided)
    if (!startDate) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      startDate = new Date(today.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    }

    // Map day names to day offsets
    const dayOffsets = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };

    schedules.forEach(schedule => {
      const course = schedule.section?.course;
      const classroom = schedule.classroom;
      const dayOffset = dayOffsets[schedule.day_of_week.toLowerCase()] || 0;
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + dayOffset);
      
      const startDateTime = this.formatDateTimeForICal(eventDate, schedule.start_time);
      const endDateTime = this.formatDateTimeForICal(eventDate, schedule.end_time);

      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${schedule.id}@university-obs\n`;
      ical += `DTSTART:${startDateTime}\n`;
      ical += `DTEND:${endDateTime}\n`;
      ical += `SUMMARY:${course?.code || 'Course'} - ${course?.name || 'N/A'}\n`;
      ical += `DESCRIPTION:${course?.name || ''}\n`;
      ical += `LOCATION:${classroom ? `${classroom.building} ${classroom.room_number}` : 'TBA'}\n`;
      ical += `RRULE:FREQ=WEEKLY;BYDAY=${this.getICalDay(schedule.day_of_week)}\n`;
      ical += 'END:VEVENT\n';
    });

    ical += 'END:VCALENDAR\n';

    return ical;
  }

  /**
   * Format date and time for iCal
   * @param {Date} date - Date
   * @param {string} time - Time string (HH:mm)
   * @returns {string} - Formatted datetime
   */
  formatDateTimeForICal(date, time) {
    const d = new Date(date);
    const [hours, minutes] = time.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0);

    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Get iCal day abbreviation
   * @param {string} dayOfWeek - Day of week
   * @returns {string} - iCal day abbreviation
   */
  getICalDay(dayOfWeek) {
    const days = {
      monday: 'MO',
      tuesday: 'TU',
      wednesday: 'WE',
      thursday: 'TH',
      friday: 'FR',
      saturday: 'SA',
      sunday: 'SU',
    };

    return days[dayOfWeek.toLowerCase()] || 'MO';
  }
}

module.exports = new SchedulingService();

