module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define('Schedule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    section_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    day_of_week: {
      type: DataTypes.STRING(10), // Monday-Friday
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    classroom_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'schedules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['section_id'] },
      { fields: ['classroom_id', 'day_of_week', 'start_time', 'end_time'] },
    ],
  });

  return Schedule;
};


