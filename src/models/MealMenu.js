module.exports = (sequelize, DataTypes) => {
  const MealMenu = sequelize.define('MealMenu', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cafeteria_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    meal_type: {
      type: DataTypes.STRING(20), // breakfast, lunch, dinner
      allowNull: false,
    },
    items_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    nutrition_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    meal_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'meal_menus',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['cafeteria_id', 'date', 'meal_type'],
        unique: true,
      },
    ],
  });

  return MealMenu;
};


