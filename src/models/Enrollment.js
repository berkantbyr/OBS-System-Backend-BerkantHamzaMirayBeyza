module.exports = (sequelize, DataTypes) => {
  const Enrollment = sequelize.define('Enrollment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    section_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'course_sections',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'enrolled', 'dropped', 'completed', 'failed', 'withdrawn', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    // Rejection reason when faculty rejects enrollment
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Faculty approval date
    approval_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Faculty who approved/rejected
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'faculty',
        key: 'id',
      },
    },
    enrollment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    drop_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    midterm_grade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    final_grade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    homework_grade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Calculated: (midterm * 0.3) + (final * 0.5) + (homework * 0.2)
    average_grade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    letter_grade: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    grade_point: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 4,
      },
    },
    // For repeating courses
    is_repeat: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'enrollments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['student_id'],
      },
      {
        fields: ['section_id'],
      },
      {
        fields: ['status'],
      },
      {
        unique: true,
        fields: ['student_id', 'section_id'],
      },
    ],
  });

  return Enrollment;
};

