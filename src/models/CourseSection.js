module.exports = (sequelize, DataTypes) => {
  const CourseSection = sequelize.define('CourseSection', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    course_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    section_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    semester: {
      type: DataTypes.ENUM('fall', 'spring', 'summer'),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    instructor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'faculty',
        key: 'id',
      },
    },
    classroom_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'classrooms',
        key: 'id',
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    enrolled_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // JSON format: [{"day": "monday", "start_time": "09:00", "end_time": "10:30"}]
    schedule_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'course_sections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['instructor_id'],
      },
      {
        fields: ['semester', 'year'],
      },
      {
        unique: true,
        fields: ['course_id', 'section_number', 'semester', 'year'],
      },
    ],
  });

  return CourseSection;
};






