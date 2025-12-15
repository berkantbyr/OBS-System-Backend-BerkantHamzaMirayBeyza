module.exports = (sequelize, DataTypes) => {
  const CoursePrerequisite = sequelize.define('CoursePrerequisite', {
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
    prerequisite_course_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    // Minimum grade required to satisfy prerequisite (e.g., 'DD', 'CC')
    min_grade: {
      type: DataTypes.STRING(2),
      allowNull: true,
      defaultValue: 'DD',
    },
  }, {
    tableName: 'course_prerequisites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['prerequisite_course_id'],
      },
      {
        unique: true,
        fields: ['course_id', 'prerequisite_course_id'],
      },
    ],
  });

  return CoursePrerequisite;
};


