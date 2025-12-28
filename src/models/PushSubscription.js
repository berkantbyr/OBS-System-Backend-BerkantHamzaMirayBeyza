module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'push_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['endpoint'],
        unique: true,
      },
    ],
  });

  // Instance method to get subscription object for web-push
  PushSubscription.prototype.toWebPushSubscription = function() {
    return {
      endpoint: this.endpoint,
      keys: {
        p256dh: this.p256dh,
        auth: this.auth,
      },
    };
  };

  return PushSubscription;
};

