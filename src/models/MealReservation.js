module.exports = (sequelize, DataTypes) => {
  const MealReservation = sequelize.define('MealReservation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    menu_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cafeteria_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    meal_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    qr_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(20), // reserved, cancelled, used
      allowNull: false,
      defaultValue: 'reserved',
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'meal_reservations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id', 'date'],
      },
      {
        fields: ['qr_code'],
        unique: true,
      },
    ],
  });

  return MealReservation;
};


