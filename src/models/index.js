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

// Define associations
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

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

