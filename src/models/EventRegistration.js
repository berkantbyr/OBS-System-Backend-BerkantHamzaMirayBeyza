module.exports = (sequelize, DataTypes) => {
  const EventRegistration = sequelize.define('EventRegistration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    registration_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    qr_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    checked_in: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checked_in_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    custom_fields_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20), // registered, cancelled, waitlisted
      allowNull: false,
      defaultValue: 'registered',
    },
  }, {
    tableName: 'event_registrations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['event_id'] },
      { fields: ['user_id'] },
      { fields: ['qr_code'], unique: true },
    ],
  });

  return EventRegistration;
};


