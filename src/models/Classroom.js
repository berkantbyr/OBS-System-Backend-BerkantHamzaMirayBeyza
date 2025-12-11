module.exports = (sequelize, DataTypes) => {
  const Classroom = sequelize.define('Classroom', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    building: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    room_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    // GPS coordinates for attendance
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    // JSON: ["projector", "whiteboard", "computer", "air_conditioning"]
    features_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'classrooms',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['building'],
      },
      {
        unique: true,
        fields: ['building', 'room_number'],
      },
    ],
  });

  return Classroom;
};

