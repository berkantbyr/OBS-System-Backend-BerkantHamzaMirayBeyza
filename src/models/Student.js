module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    student_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    enrollment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    graduation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gpa: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0.00,
        max: 4.00,
      },
    },
    cgpa: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0.00,
        max: 4.00,
      },
    },
    total_credits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    current_semester: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM('active', 'graduated', 'suspended', 'withdrawn'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'students',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['student_number'],
      },
      {
        unique: true,
        fields: ['user_id'],
      },
      {
        fields: ['department_id'],
      },
      {
        fields: ['status'],
      },
    ],
  });

  return Student;
};

