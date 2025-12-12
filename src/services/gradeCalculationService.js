const db = require('../models');
const { Enrollment, CourseSection, Course, Student, User, Department } = db;
const { Op } = require('sequelize');

/**
 * GradeCalculationService - Handles GPA/CGPA calculations
 */
class GradeCalculationService {
  /**
   * Grade points mapping (Turkish university system)
   */
  gradePoints = {
    'AA': 4.0,
    'BA': 3.5,
    'BB': 3.0,
    'CB': 2.5,
    'CC': 2.0,
    'DC': 1.5,
    'DD': 1.0,
    'FD': 0.5,
    'FF': 0.0,
    'NA': 0.0, // Not Attended
  };

  /**
   * Calculate letter grade from average grade
   * @param {number} average - Numeric average (0-100)
   * @returns {string} - Letter grade
   */
  calculateLetterGrade(average) {
    if (average === null || average === undefined) return null;
    
    const numAvg = parseFloat(average);
    
    if (numAvg >= 90) return 'AA';
    if (numAvg >= 85) return 'BA';
    if (numAvg >= 80) return 'BB';
    if (numAvg >= 75) return 'CB';
    if (numAvg >= 70) return 'CC';
    if (numAvg >= 65) return 'DC';
    if (numAvg >= 60) return 'DD';
    if (numAvg >= 50) return 'FD';
    return 'FF';
  }

  /**
   * Get grade point from letter grade
   * @param {string} letterGrade - Letter grade
   * @returns {number} - Grade point (0.0 - 4.0)
   */
  getGradePoint(letterGrade) {
    return this.gradePoints[letterGrade] ?? 0.0;
  }

  /**
   * Calculate average grade from component grades
   * @param {number} midterm - Midterm grade (0-100)
   * @param {number} final - Final grade (0-100)
   * @param {number} homework - Homework grade (0-100)
   * @param {Object} weights - Weight percentages (default: 30% midterm, 50% final, 20% homework)
   * @returns {number} - Average grade
   */
  calculateAverageGrade(midterm, final, homework = null, weights = { midterm: 0.3, final: 0.5, homework: 0.2 }) {
    // If homework is not provided, redistribute weights
    if (homework === null || homework === undefined) {
      const midtermWeight = 0.4;
      const finalWeight = 0.6;
      return (midterm || 0) * midtermWeight + (final || 0) * finalWeight;
    }

    return (
      (midterm || 0) * weights.midterm +
      (final || 0) * weights.final +
      (homework || 0) * weights.homework
    );
  }

  /**
   * Update enrollment grades and calculate letter grade / grade point
   * @param {string} enrollmentId - Enrollment ID
   * @param {Object} grades - { midterm, final, homework }
   * @returns {Object} - Updated enrollment
   */
  async updateGrades(enrollmentId, grades) {
    const enrollment = await Enrollment.findByPk(enrollmentId, {
      include: [
        { model: CourseSection, as: 'section', include: [{ model: Course, as: 'course' }] },
      ],
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Update grades
    if (grades.midterm !== undefined) enrollment.midterm_grade = grades.midterm;
    if (grades.final !== undefined) enrollment.final_grade = grades.final;
    if (grades.homework !== undefined) enrollment.homework_grade = grades.homework;

    // Calculate average if both midterm and final are present
    if (enrollment.midterm_grade !== null && enrollment.final_grade !== null) {
      enrollment.average_grade = this.calculateAverageGrade(
        enrollment.midterm_grade,
        enrollment.final_grade,
        enrollment.homework_grade
      );

      // Calculate letter grade and grade point
      enrollment.letter_grade = this.calculateLetterGrade(enrollment.average_grade);
      enrollment.grade_point = this.getGradePoint(enrollment.letter_grade);

      // Update status based on grade
      if (enrollment.grade_point >= 1.0) {
        enrollment.status = 'completed';
      } else {
        enrollment.status = 'failed';
      }
    }

    await enrollment.save();
    return enrollment;
  }

  /**
   * Calculate semester GPA for a student
   * @param {string} studentId - Student ID
   * @param {string} semester - Semester
   * @param {number} year - Year
   * @returns {Object} - { gpa, totalCredits, courses }
   */
  async calculateSemesterGPA(studentId, semester, year) {
    const enrollments = await Enrollment.findAll({
      where: {
        student_id: studentId,
        status: { [Op.in]: ['completed', 'failed'] },
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: { semester, year },
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });

    let totalPoints = 0;
    let totalCredits = 0;
    const courses = [];

    for (const enrollment of enrollments) {
      if (enrollment.grade_point !== null) {
        const credits = enrollment.section.course.credits;
        totalPoints += enrollment.grade_point * credits;
        totalCredits += credits;

        courses.push({
          code: enrollment.section.course.code,
          name: enrollment.section.course.name,
          credits,
          letterGrade: enrollment.letter_grade,
          gradePoint: enrollment.grade_point,
        });
      }
    }

    const gpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

    return { gpa, totalCredits, courses };
  }

  /**
   * Calculate cumulative GPA (CGPA) for a student
   * @param {string} studentId - Student ID
   * @returns {Object} - { cgpa, totalCredits, semesters }
   */
  async calculateCGPA(studentId) {
    const enrollments = await Enrollment.findAll({
      where: {
        student_id: studentId,
        status: { [Op.in]: ['completed', 'failed'] },
        grade_point: { [Op.ne]: null },
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });

    let totalPoints = 0;
    let totalCredits = 0;
    const semesterMap = new Map();

    for (const enrollment of enrollments) {
      const credits = enrollment.section.course.credits;
      const semesterKey = `${enrollment.section.year}-${enrollment.section.semester}`;

      // For repeat courses, only count the best grade
      if (!enrollment.is_repeat || enrollment.grade_point > 0) {
        totalPoints += enrollment.grade_point * credits;
        totalCredits += credits;
      }

      // Group by semester
      if (!semesterMap.has(semesterKey)) {
        semesterMap.set(semesterKey, {
          semester: enrollment.section.semester,
          year: enrollment.section.year,
          courses: [],
          totalPoints: 0,
          totalCredits: 0,
        });
      }

      const semData = semesterMap.get(semesterKey);
      semData.courses.push({
        code: enrollment.section.course.code,
        name: enrollment.section.course.name,
        credits,
        letterGrade: enrollment.letter_grade,
        gradePoint: parseFloat(enrollment.grade_point),
      });
      semData.totalPoints += enrollment.grade_point * credits;
      semData.totalCredits += credits;
    }

    // Calculate GPA for each semester
    const semesters = Array.from(semesterMap.values()).map((sem) => ({
      ...sem,
      gpa: sem.totalCredits > 0 ? parseFloat((sem.totalPoints / sem.totalCredits).toFixed(2)) : 0,
    }));

    // Sort semesters chronologically
    semesters.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const semOrder = { spring: 1, summer: 2, fall: 3 };
      return semOrder[a.semester] - semOrder[b.semester];
    });

    const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

    return { cgpa, totalCredits, semesters };
  }

  /**
   * Update student's GPA and CGPA in student record
   * @param {string} studentId - Student ID
   */
  async updateStudentGPA(studentId) {
    const { cgpa, totalCredits } = await this.calculateCGPA(studentId);

    await Student.update(
      {
        cgpa,
        total_credits: totalCredits,
      },
      { where: { id: studentId } }
    );

    return { cgpa, totalCredits };
  }

  /**
   * Get transcript data for a student
   * @param {string} studentId - Student ID
   * @returns {Object} - Full transcript data
   */
  async getTranscript(studentId) {
    const student = await Student.findByPk(studentId, {
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] },
      ],
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const { cgpa, totalCredits, semesters } = await this.calculateCGPA(studentId);

    return {
      student: {
        studentNumber: student.student_number,
        firstName: student.user.first_name,
        lastName: student.user.last_name,
        email: student.user.email,
        department: student.department?.name,
        departmentCode: student.department?.code,
        enrollmentDate: student.enrollment_date,
        status: student.status,
      },
      academic: {
        cgpa,
        totalCredits,
        currentSemester: student.current_semester,
      },
      semesters,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new GradeCalculationService();

