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

    // Try genetic algorithm first for large problems, fallback to CSP
    let schedule = null;
    if (sections.length > 10) {
      logger.info('Using genetic algorithm for large problem...');
      schedule = this.solveWithGeneticAlgorithm(
        sectionData,
        classroomData,
        timeSlots,
        instructorPreferences,
        studentEnrollments
      );
    }

    // Fallback to CSP if genetic algorithm fails or for smaller problems
    if (!schedule) {
      logger.info('Using CSP algorithm...');
      schedule = this.solveCSP(
        sectionData,
        classroomData,
        timeSlots,
        instructorPreferences,
        studentEnrollments
      );
    }

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

  /**
   * Solve scheduling problem using Genetic Algorithm
   * @param {Array} sections - Section data
   * @param {Array} classrooms - Classroom data
   * @param {Array} timeSlots - Time slot data
   * @param {Object} instructorPreferences - Instructor preferences
   * @param {Object} studentEnrollments - Student enrollment map
   * @returns {Object|null} - Schedule assignments or null if no solution
   */
  solveWithGeneticAlgorithm(sections, classrooms, timeSlots, instructorPreferences = {}, studentEnrollments = {}) {
    const POPULATION_SIZE = 50;
    const MAX_GENERATIONS = 100;
    const MUTATION_RATE = 0.1;
    const CROSSOVER_RATE = 0.7;
    const ELITISM_COUNT = 5;

    // Initialize population
    let population = this.initializePopulation(
      POPULATION_SIZE,
      sections,
      classrooms,
      timeSlots,
      studentEnrollments
    );

    let bestFitness = -Infinity;
    let bestIndividual = null;
    let generation = 0;

    while (generation < MAX_GENERATIONS && bestFitness < 1000) {
      // Evaluate fitness
      const fitnessScores = population.map(individual => ({
        individual,
        fitness: this.calculateFitness(individual, sections, classrooms, timeSlots, instructorPreferences, studentEnrollments),
      }));

      // Sort by fitness (higher is better)
      fitnessScores.sort((a, b) => b.fitness - a.fitness);

      // Update best
      if (fitnessScores[0].fitness > bestFitness) {
        bestFitness = fitnessScores[0].fitness;
        bestIndividual = JSON.parse(JSON.stringify(fitnessScores[0].individual));
      }

      // Check if we have a valid solution (fitness >= 1000 means all constraints satisfied)
      if (bestFitness >= 1000) {
        logger.info(`Genetic algorithm found solution in generation ${generation}`);
        break;
      }

      // Create new population
      const newPopulation = [];

      // Elitism: keep best individuals
      for (let i = 0; i < ELITISM_COUNT && i < fitnessScores.length; i++) {
        newPopulation.push(JSON.parse(JSON.stringify(fitnessScores[i].individual)));
      }

      // Generate offspring
      while (newPopulation.length < POPULATION_SIZE) {
        // Selection (tournament selection)
        const parent1 = this.tournamentSelection(fitnessScores, 3);
        const parent2 = this.tournamentSelection(fitnessScores, 3);

        // Crossover
        let offspring1, offspring2;
        if (Math.random() < CROSSOVER_RATE) {
          const offspring = this.crossover(parent1, parent2, sections);
          offspring1 = offspring[0];
          offspring2 = offspring[1];
        } else {
          offspring1 = JSON.parse(JSON.stringify(parent1));
          offspring2 = JSON.parse(JSON.stringify(parent2));
        }

        // Mutation
        if (Math.random() < MUTATION_RATE) {
          offspring1 = this.mutate(offspring1, sections, classrooms, timeSlots, studentEnrollments);
        }
        if (Math.random() < MUTATION_RATE) {
          offspring2 = this.mutate(offspring2, sections, classrooms, timeSlots, studentEnrollments);
        }

        newPopulation.push(offspring1);
        if (newPopulation.length < POPULATION_SIZE) {
          newPopulation.push(offspring2);
        }
      }

      population = newPopulation;
      generation++;
    }

    if (bestIndividual && bestFitness >= 1000) {
      // Convert to assignment format
      const assignments = bestIndividual
        .filter(assignment => assignment.sectionId && assignment.classroomId)
        .map(assignment => ({
          sectionId: assignment.sectionId,
          classroomId: assignment.classroomId,
          dayOfWeek: assignment.dayOfWeek,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
        }));

      const stats = {
        totalSections: sections.length,
        assignedSections: assignments.length,
        unassignedSections: sections.length - assignments.length,
        averageClassroomUsage: this.calculateAverageUsageFromAssignments(assignments, classrooms),
        algorithm: 'genetic',
        generations: generation,
        fitness: bestFitness,
      };

      return { assignments, stats };
    }

    return null;
  }

  /**
   * Initialize population with random assignments
   */
  initializePopulation(size, sections, classrooms, timeSlots, studentEnrollments) {
    const population = [];

    for (let i = 0; i < size; i++) {
      const individual = [];
      const usedSlots = {};

      sections.forEach(section => {
        const validClassrooms = classrooms.filter(c => c.capacity >= (section.capacity || 30));
        const validSlots = [...timeSlots];

        // Try to assign randomly
        if (validClassrooms.length > 0 && validSlots.length > 0) {
          const classroom = validClassrooms[Math.floor(Math.random() * validClassrooms.length)];
          const slot = validSlots[Math.floor(Math.random() * validSlots.length)];
          const slotKey = `${slot.day_of_week}_${slot.start_time}_${slot.end_time}`;

          // Check basic constraints
          const instructorId = section.instructor_id;
          if (!usedSlots[instructorId]) usedSlots[instructorId] = new Set();
          if (!usedSlots[classroom.id]) usedSlots[classroom.id] = new Set();

          // Simple conflict check (can be improved)
          if (!usedSlots[instructorId].has(slotKey) && !usedSlots[classroom.id].has(slotKey)) {
            usedSlots[instructorId].add(slotKey);
            usedSlots[classroom.id].add(slotKey);

            individual.push({
              sectionId: section.id,
              classroomId: classroom.id,
              dayOfWeek: slot.day_of_week,
              startTime: slot.start_time,
              endTime: slot.end_time,
            });
          } else {
            // Unassigned
            individual.push({
              sectionId: section.id,
              classroomId: null,
              dayOfWeek: null,
              startTime: null,
              endTime: null,
            });
          }
        } else {
          individual.push({
            sectionId: section.id,
            classroomId: null,
            dayOfWeek: null,
            startTime: null,
            endTime: null,
          });
        }
      });

      population.push(individual);
    }

    return population;
  }

  /**
   * Calculate fitness of an individual
   * Higher fitness = better solution
   */
  calculateFitness(individual, sections, classrooms, timeSlots, instructorPreferences, studentEnrollments) {
    let fitness = 0;
    const usedSlots = {};
    let hardConstraintViolations = 0;
    let assignedCount = 0;

    individual.forEach((assignment, index) => {
      if (!assignment.sectionId || !assignment.classroomId) {
        return; // Unassigned
      }

      assignedCount++;
      const section = sections.find(s => s.id === assignment.sectionId);
      const classroom = classrooms.find(c => c.id === assignment.classroomId);
      const slot = timeSlots.find(
        s => s.day_of_week === assignment.dayOfWeek &&
        s.start_time === assignment.startTime &&
        s.end_time === assignment.endTime
      );

      if (!section || !classroom || !slot) {
        hardConstraintViolations += 10;
        return;
      }

      const slotKey = `${assignment.dayOfWeek}_${assignment.startTime}_${assignment.endTime}`;
      const instructorId = section.instructor_id;

      // Initialize used slots
      if (!usedSlots[instructorId]) usedSlots[instructorId] = new Set();
      if (!usedSlots[classroom.id]) usedSlots[classroom.id] = new Set();

      // Hard constraints (penalize heavily)
      if (usedSlots[instructorId].has(slotKey)) {
        hardConstraintViolations += 10; // Instructor conflict
      }
      if (usedSlots[classroom.id].has(slotKey)) {
        hardConstraintViolations += 10; // Classroom conflict
      }
      if (classroom.capacity < (section.capacity || 30)) {
        hardConstraintViolations += 10; // Capacity violation
      }

      // Mark as used
      usedSlots[instructorId].add(slotKey);
      usedSlots[classroom.id].add(slotKey);

      // Soft constraints (reward)
      fitness += 100; // Base reward for assignment

      // Preference bonus
      if (instructorPreferences[instructorId]?.preferred_times?.includes(slotKey)) {
        fitness += 20;
      }

      // Capacity utilization bonus
      const utilization = (section.capacity || 30) / classroom.capacity;
      if (utilization > 0.7 && utilization < 0.95) {
        fitness += 10; // Good utilization
      }
    });

    // Penalty for unassigned sections
    const unassignedCount = sections.length - assignedCount;
    fitness -= unassignedCount * 50;

    // Heavy penalty for hard constraint violations
    fitness -= hardConstraintViolations * 100;

    return fitness;
  }

  /**
   * Tournament selection
   */
  tournamentSelection(fitnessScores, tournamentSize) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      tournament.push(fitnessScores[Math.floor(Math.random() * fitnessScores.length)]);
    }
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0].individual;
  }

  /**
   * Crossover (single point)
   */
  crossover(parent1, parent2, sections) {
    const point = Math.floor(Math.random() * sections.length);
    const offspring1 = [...parent1.slice(0, point), ...parent2.slice(point)];
    const offspring2 = [...parent2.slice(0, point), ...parent1.slice(point)];
    return [offspring1, offspring2];
  }

  /**
   * Mutation
   */
  mutate(individual, sections, classrooms, timeSlots, studentEnrollments) {
    const mutated = JSON.parse(JSON.stringify(individual));
    const index = Math.floor(Math.random() * mutated.length);
    const assignment = mutated[index];

    if (assignment && assignment.sectionId) {
      const section = sections.find(s => s.id === assignment.sectionId);
      if (section) {
        const validClassrooms = classrooms.filter(c => c.capacity >= (section.capacity || 30));
        if (validClassrooms.length > 0) {
          assignment.classroomId = validClassrooms[Math.floor(Math.random() * validClassrooms.length)].id;
          const slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          assignment.dayOfWeek = slot.day_of_week;
          assignment.startTime = slot.start_time;
          assignment.endTime = slot.end_time;
        }
      }
    }

    return mutated;
  }

  /**
   * Calculate average usage from assignments
   */
  calculateAverageUsageFromAssignments(assignments, classrooms) {
    if (classrooms.length === 0) return 0;

    const classroomUsage = {};
    classrooms.forEach(c => {
      classroomUsage[c.id] = 0;
    });

    assignments.forEach(a => {
      if (a.classroomId && classroomUsage[a.classroomId] !== undefined) {
        classroomUsage[a.classroomId]++;
      }
    });

    const totalUsage = Object.values(classroomUsage).reduce((sum, usage) => sum + usage, 0);
    return totalUsage / classrooms.length;
  }
}

module.exports = new SchedulingService();

