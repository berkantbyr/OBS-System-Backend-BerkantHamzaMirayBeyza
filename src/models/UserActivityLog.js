module.exports = (sequelize, DataTypes) => {
  const UserActivityLog = sequelize.define('UserActivityLog', {
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
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Examples: login, logout, profile_update, password_change, course_enroll, etc.
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      // Examples: user, course, attendance, event, etc.
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45), // IPv6 addresses can be up to 45 chars
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Additional context about the action
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'pending'),
      defaultValue: 'success',
      allowNull: false,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'user_activity_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['resource_type', 'resource_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['user_id', 'created_at'],
      },
    ],
  });

  return UserActivityLog;
};

