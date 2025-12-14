const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions,
  }
);

const db = {};

// Import models
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.Student = require('./Student')(sequelize, Sequelize.DataTypes);
db.Faculty = require('./Faculty')(sequelize, Sequelize.DataTypes);
db.Department = require('./Department')(sequelize, Sequelize.DataTypes);
db.RefreshToken = require('./RefreshToken')(sequelize, Sequelize.DataTypes);
db.PasswordReset = require('./PasswordReset')(sequelize, Sequelize.DataTypes);
db.EmailVerification = require('./EmailVerification')(sequelize, Sequelize.DataTypes);

// Part 2 - Academic Management Models
db.Course = require('./Course')(sequelize, Sequelize.DataTypes);
db.Classroom = require('./Classroom')(sequelize, Sequelize.DataTypes);
db.CourseSection = require('./CourseSection')(sequelize, Sequelize.DataTypes);
db.CoursePrerequisite = require('./CoursePrerequisite')(sequelize, Sequelize.DataTypes);
db.Enrollment = require('./Enrollment')(sequelize, Sequelize.DataTypes);
db.AttendanceSession = require('./AttendanceSession')(sequelize, Sequelize.DataTypes);
db.AttendanceRecord = require('./AttendanceRecord')(sequelize, Sequelize.DataTypes);
db.ExcuseRequest = require('./ExcuseRequest')(sequelize, Sequelize.DataTypes);

// Part 3 - Additional Features Models
db.AcademicCalendar = require('./AcademicCalendar')(sequelize, Sequelize.DataTypes);
db.Announcement = require('./Announcement')(sequelize, Sequelize.DataTypes);

// ============================================
// Define associations
// ============================================

// User - Student (One-to-One)
db.User.hasOne(db.Student, {
  foreignKey: 'user_id',
  as: 'student',
  onDelete: 'CASCADE',
});
db.Student.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User - Faculty (One-to-One)
db.User.hasOne(db.Faculty, {
  foreignKey: 'user_id',
  as: 'faculty',
  onDelete: 'CASCADE',
});
db.Faculty.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Department - Student (One-to-Many)
db.Department.hasMany(db.Student, {
  foreignKey: 'department_id',
  as: 'students',
});
db.Student.belongsTo(db.Department, {
  foreignKey: 'department_id',
  as: 'department',
});

// Department - Faculty (One-to-Many)
db.Department.hasMany(db.Faculty, {
  foreignKey: 'department_id',
  as: 'facultyMembers',
});
db.Faculty.belongsTo(db.Department, {
  foreignKey: 'department_id',
  as: 'department',
});

// User - RefreshToken (One-to-Many)
db.User.hasMany(db.RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
  onDelete: 'CASCADE',
});
db.RefreshToken.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User - PasswordReset (One-to-Many)
db.User.hasMany(db.PasswordReset, {
  foreignKey: 'user_id',
  as: 'passwordResets',
  onDelete: 'CASCADE',
});
db.PasswordReset.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User - EmailVerification (One-to-Many)
db.User.hasMany(db.EmailVerification, {
  foreignKey: 'user_id',
  as: 'emailVerifications',
  onDelete: 'CASCADE',
});
db.EmailVerification.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

// ============================================
// Part 2 - Academic Management Associations
// ============================================

// Department - Course (One-to-Many)
db.Department.hasMany(db.Course, {
  foreignKey: 'department_id',
  as: 'courses',
});
db.Course.belongsTo(db.Department, {
  foreignKey: 'department_id',
  as: 'department',
});

// Course - CourseSection (One-to-Many)
db.Course.hasMany(db.CourseSection, {
  foreignKey: 'course_id',
  as: 'sections',
  onDelete: 'CASCADE',
});
db.CourseSection.belongsTo(db.Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// Faculty - CourseSection (One-to-Many)
db.Faculty.hasMany(db.CourseSection, {
  foreignKey: 'instructor_id',
  as: 'sections',
});
db.CourseSection.belongsTo(db.Faculty, {
  foreignKey: 'instructor_id',
  as: 'instructor',
});

// Classroom - CourseSection (One-to-Many)
db.Classroom.hasMany(db.CourseSection, {
  foreignKey: 'classroom_id',
  as: 'sections',
});
db.CourseSection.belongsTo(db.Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom',
});

// Course Prerequisites (Self-referencing Many-to-Many)
db.Course.belongsToMany(db.Course, {
  through: db.CoursePrerequisite,
  as: 'prerequisites',
  foreignKey: 'course_id',
  otherKey: 'prerequisite_course_id',
});
db.Course.belongsToMany(db.Course, {
  through: db.CoursePrerequisite,
  as: 'requiredFor',
  foreignKey: 'prerequisite_course_id',
  otherKey: 'course_id',
});

// Course - CoursePrerequisite (for direct access)
db.Course.hasMany(db.CoursePrerequisite, {
  foreignKey: 'course_id',
  as: 'prerequisiteRecords',
});
db.CoursePrerequisite.belongsTo(db.Course, {
  foreignKey: 'course_id',
  as: 'course',
});
db.CoursePrerequisite.belongsTo(db.Course, {
  foreignKey: 'prerequisite_course_id',
  as: 'prerequisiteCourse',
});

// Student - Enrollment (One-to-Many)
db.Student.hasMany(db.Enrollment, {
  foreignKey: 'student_id',
  as: 'enrollments',
  onDelete: 'CASCADE',
});
db.Enrollment.belongsTo(db.Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// CourseSection - Enrollment (One-to-Many)
db.CourseSection.hasMany(db.Enrollment, {
  foreignKey: 'section_id',
  as: 'enrollments',
  onDelete: 'CASCADE',
});
db.Enrollment.belongsTo(db.CourseSection, {
  foreignKey: 'section_id',
  as: 'section',
});

// CourseSection - AttendanceSession (One-to-Many)
db.CourseSection.hasMany(db.AttendanceSession, {
  foreignKey: 'section_id',
  as: 'attendanceSessions',
  onDelete: 'CASCADE',
});
db.AttendanceSession.belongsTo(db.CourseSection, {
  foreignKey: 'section_id',
  as: 'section',
});

// Faculty - AttendanceSession (One-to-Many)
db.Faculty.hasMany(db.AttendanceSession, {
  foreignKey: 'instructor_id',
  as: 'attendanceSessions',
});
db.AttendanceSession.belongsTo(db.Faculty, {
  foreignKey: 'instructor_id',
  as: 'instructor',
});

// AttendanceSession - AttendanceRecord (One-to-Many)
db.AttendanceSession.hasMany(db.AttendanceRecord, {
  foreignKey: 'session_id',
  as: 'attendanceRecords',
  onDelete: 'CASCADE',
});
db.AttendanceRecord.belongsTo(db.AttendanceSession, {
  foreignKey: 'session_id',
  as: 'session',
});

// Student - AttendanceRecord (One-to-Many)
db.Student.hasMany(db.AttendanceRecord, {
  foreignKey: 'student_id',
  as: 'attendanceRecords',
  onDelete: 'CASCADE',
});
db.AttendanceRecord.belongsTo(db.Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// Student - ExcuseRequest (One-to-Many)
db.Student.hasMany(db.ExcuseRequest, {
  foreignKey: 'student_id',
  as: 'excuseRequests',
  onDelete: 'CASCADE',
});
db.ExcuseRequest.belongsTo(db.Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// AttendanceSession - ExcuseRequest (One-to-Many)
db.AttendanceSession.hasMany(db.ExcuseRequest, {
  foreignKey: 'session_id',
  as: 'excuseRequests',
  onDelete: 'CASCADE',
});
db.ExcuseRequest.belongsTo(db.AttendanceSession, {
  foreignKey: 'session_id',
  as: 'session',
});

// Faculty - ExcuseRequest (reviewer)
db.Faculty.hasMany(db.ExcuseRequest, {
  foreignKey: 'reviewed_by',
  as: 'reviewedExcuses',
});
db.ExcuseRequest.belongsTo(db.Faculty, {
  foreignKey: 'reviewed_by',
  as: 'reviewer',
});

// User - Announcement (author)
db.User.hasMany(db.Announcement, {
  foreignKey: 'author_id',
  as: 'announcements',
});
db.Announcement.belongsTo(db.User, {
  foreignKey: 'author_id',
  as: 'author',
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
