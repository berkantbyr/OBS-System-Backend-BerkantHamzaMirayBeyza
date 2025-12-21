const db = require('../models');
const { Enrollment, Course, CoursePrerequisite, CourseSection } = db;
const { Op } = require('sequelize');

/**
 * PrerequisiteService - Handles recursive prerequisite checking
 */
class PrerequisiteService {
  /**
   * Get all prerequisites for a course (including nested prerequisites)
   * @param {string} courseId - Course ID to get prerequisites for
   * @param {Set} visited - Set of visited course IDs (for cycle detection)
   * @returns {Array} - Array of prerequisite course objects
   */
  async getAllPrerequisites(courseId, visited = new Set()) {
    if (visited.has(courseId)) {
      return []; // Prevent infinite loop
    }
    visited.add(courseId);

    const prerequisites = await CoursePrerequisite.findAll({
      where: { course_id: courseId },
      include: [
        {
          model: Course,
          as: 'prerequisiteCourse',
          attributes: ['id', 'code', 'name', 'credits'],
        },
      ],
    });

    const allPrerequisites = [];

    for (const prereq of prerequisites) {
      allPrerequisites.push({
        ...prereq.prerequisiteCourse.toJSON(),
        min_grade: prereq.min_grade,
      });

      // Recursive call for nested prerequisites
      const nestedPrereqs = await this.getAllPrerequisites(
        prereq.prerequisite_course_id,
        visited
      );
      allPrerequisites.push(...nestedPrereqs);
    }

    return allPrerequisites;
  }

  /**
   * Check if a student has completed all prerequisites for a course
   * @param {string} studentId - Student ID
   * @param {string} courseId - Course ID to check prerequisites for
   * @returns {Object} - { satisfied: boolean, missing: Array }
   */
  async checkPrerequisites(studentId, courseId) {
    const prerequisites = await this.getAllPrerequisites(courseId);
    const missing = [];

    for (const prereq of prerequisites) {
      const completed = await this.hasCompletedCourse(
        studentId,
        prereq.id,
        prereq.min_grade || 'DD'
      );

      if (!completed) {
        missing.push({
          courseId: prereq.id,
          courseCode: prereq.code,
          courseName: prereq.name,
          minGrade: prereq.min_grade || 'DD',
        });
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Check if a student has completed a specific course with minimum grade
   * @param {string} studentId - Student ID
   * @param {string} courseId - Course ID
   * @param {string} minGrade - Minimum required grade
   * @returns {boolean}
   */
  async hasCompletedCourse(studentId, courseId, minGrade = 'DD') {
    // Get all sections of the course
    const sections = await CourseSection.findAll({
      where: { course_id: courseId },
      attributes: ['id'],
    });

    const sectionIds = sections.map((s) => s.id);

    if (sectionIds.length === 0) {
      return false;
    }

    // Find enrollment with passing grade
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: studentId,
        section_id: { [Op.in]: sectionIds },
        status: 'completed',
        letter_grade: { [Op.ne]: null },
      },
    });

    if (!enrollment) {
      return false;
    }

    // Check if grade meets minimum requirement
    return this.gradeCompare(enrollment.letter_grade, minGrade) >= 0;
  }

  /**
   * Compare two letter grades
   * @param {string} grade1 - First grade
   * @param {string} grade2 - Second grade
   * @returns {number} - positive if grade1 > grade2, negative if grade1 < grade2, 0 if equal
   */
  gradeCompare(grade1, grade2) {
    const gradeOrder = ['FF', 'FD', 'DD', 'DC', 'CC', 'CB', 'BB', 'BA', 'AA'];
    const idx1 = gradeOrder.indexOf(grade1);
    const idx2 = gradeOrder.indexOf(grade2);

    if (idx1 === -1 || idx2 === -1) {
      return 0; // Unknown grade
    }

    return idx1 - idx2;
  }

  /**
   * Get direct prerequisites for a course (not recursive)
   * @param {string} courseId - Course ID
   * @returns {Array} - Array of prerequisite courses
   */
  async getDirectPrerequisites(courseId) {
    const prerequisites = await CoursePrerequisite.findAll({
      where: { course_id: courseId },
      include: [
        {
          model: Course,
          as: 'prerequisiteCourse',
          attributes: ['id', 'code', 'name', 'credits', 'ects'],
        },
      ],
    });

    return prerequisites.map((p) => ({
      ...p.prerequisiteCourse.toJSON(),
      min_grade: p.min_grade,
    }));
  }
}

module.exports = new PrerequisiteService();





