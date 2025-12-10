module.exports = (sequelize, DataTypes) => {
  const Faculty = sequelize.define('Faculty', {
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
    employee_number: {
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
    title: {
      type: DataTypes.ENUM('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'research_assistant'),
      allowNull: false,
      defaultValue: 'lecturer',
    },
    office_location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    office_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'on_leave', 'retired', 'terminated'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'faculty',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_number'],
      },
      {
        unique: true,
        fields: ['user_id'],
      },
      {
        fields: ['department_id'],
      },
      {
        fields: ['title'],
      },
    ],
  });

  return Faculty;
};

