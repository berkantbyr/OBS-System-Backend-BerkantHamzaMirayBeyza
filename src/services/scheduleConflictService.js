const db = require('../models');
const { Enrollment, CourseSection, Student } = db;
const { Op } = require('sequelize');

/**
 * ScheduleConflictService - Handles time overlap detection
 */
class ScheduleConflictService {
  /**
   * Check if a student has schedule conflicts with a new section
   * @param {string} studentId - Student ID
   * @param {string} newSectionId - Section ID to check
   * @returns {Object} - { hasConflict: boolean, conflicts: Array }
   */
  async checkScheduleConflict(studentId, newSectionId) {
    // Get new section schedule
    const newSection = await CourseSection.findByPk(newSectionId, {
      include: [{ model: db.Course, as: 'course', attributes: ['code', 'name'] }],
    });

    if (!newSection || !newSection.schedule_json) {
      return { hasConflict: false, conflicts: [] };
    }

    // Get student's current enrolled sections
    const currentEnrollments = await Enrollment.findAll({
      where: {
        student_id: studentId,
        status: 'enrolled',
        section_id: { [Op.ne]: newSectionId },
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: {
            semester: newSection.semester,
            year: newSection.year,
          },
          include: [{ model: db.Course, as: 'course', attributes: ['code', 'name'] }],
        },
      ],
    });

    const newSchedule = this.parseSchedule(newSection.schedule_json);
    const conflicts = [];

    for (const enrollment of currentEnrollments) {
      const existingSchedule = this.parseSchedule(enrollment.section.schedule_json);

      for (const newSlot of newSchedule) {
        for (const existingSlot of existingSchedule) {
          if (this.timeSlotsOverlap(newSlot, existingSlot)) {
            conflicts.push({
              existingCourse: {
                code: enrollment.section.course.code,
                name: enrollment.section.course.name,
                sectionNumber: enrollment.section.section_number,
              },
              newCourse: {
                code: newSection.course.code,
                name: newSection.course.name,
                sectionNumber: newSection.section_number,
              },
              conflictDay: newSlot.day,
              existingTime: `${existingSlot.start_time} - ${existingSlot.end_time}`,
              newTime: `${newSlot.start_time} - ${newSlot.end_time}`,
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Parse schedule JSON into array of time slots
   * @param {any} scheduleJson - Schedule in JSON format
   * @returns {Array} - Array of { day, start_time, end_time }
   */
  parseSchedule(scheduleJson) {
    if (!scheduleJson) return [];

    // If already array, return as is
    if (Array.isArray(scheduleJson)) {
      return scheduleJson;
    }

    // If string, parse it
    if (typeof scheduleJson === 'string') {
      try {
        return JSON.parse(scheduleJson);
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Check if two time slots overlap
   * @param {Object} slot1 - { day, start_time, end_time }
   * @param {Object} slot2 - { day, start_time, end_time }
   * @returns {boolean}
   */
  timeSlotsOverlap(slot1, slot2) {
    // Different days - no conflict
    if (slot1.day.toLowerCase() !== slot2.day.toLowerCase()) {
      return false;
    }

    const start1 = this.timeToMinutes(slot1.start_time);
    const end1 = this.timeToMinutes(slot1.end_time);
    const start2 = this.timeToMinutes(slot2.start_time);
    const end2 = this.timeToMinutes(slot2.end_time);

    // Check overlap: slot1 starts before slot2 ends AND slot1 ends after slot2 starts
    return start1 < end2 && end1 > start2;
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeStr - Time in HH:MM format
   * @returns {number} - Minutes since midnight
   */
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  /**
   * Get student's weekly schedule
   * @param {string} studentId - Student ID
   * @param {string} semester - Semester (fall, spring, summer)
   * @param {number} year - Year
   * @returns {Array} - Array of schedule items
   */
  async getStudentSchedule(studentId, semester, year) {
    const enrollments = await Enrollment.findAll({
      where: {
        student_id: studentId,
        status: 'enrolled',
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: { semester, year },
          required: false,
          include: [
            { model: db.Course, as: 'course', attributes: ['code', 'name'], required: false },
            { model: db.Faculty, as: 'instructor', required: false, include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'], required: false }] },
            { model: db.Classroom, as: 'classroom', attributes: ['building', 'room_number'], required: false },
          ],
        },
      ],
    });

    const schedule = [];

    for (const enrollment of enrollments) {
      const section = enrollment.section;
      // Skip if no section data
      if (!section || !section.course) continue;
      
      const slots = this.parseSchedule(section.schedule_json);

      for (const slot of slots) {
        schedule.push({
          day: slot.day,
          start_time: slot.start_time,
          end_time: slot.end_time,
          course: {
            code: section.course?.code || 'N/A',
            name: section.course?.name || 'N/A',
          },
          sectionNumber: section.section_number,
          instructor: section.instructor?.user
            ? `${section.instructor.user.first_name} ${section.instructor.user.last_name}`
            : null,
          classroom: section.classroom
            ? `${section.classroom.building} ${section.classroom.room_number}`
            : null,
        });
      }
    }

    // Sort by day and time
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    schedule.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day.toLowerCase()) - dayOrder.indexOf(b.day.toLowerCase());
      if (dayDiff !== 0) return dayDiff;
      return this.timeToMinutes(a.start_time) - this.timeToMinutes(b.start_time);
    });

    return schedule;
  }
}

module.exports = new ScheduleConflictService();


