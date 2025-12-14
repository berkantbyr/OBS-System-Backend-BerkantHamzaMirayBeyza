const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AttendanceSession = sequelize.define('AttendanceSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    section_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'course_sections',
        key: 'id',
      },
    },
    instructor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'faculty',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
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
    // GPS center point for geofence
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    // Radius in meters
    geofence_radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
    },
    // QR code for alternative check-in
    qr_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    // Session status
    status: {
      type: DataTypes.ENUM('active', 'closed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    // Session expiry time
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // QR code expiration time (for 5-second refresh)
    qr_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'attendance_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['section_id'],
      },
      {
        fields: ['instructor_id'],
      },
      {
        fields: ['date'],
      },
      {
        fields: ['status'],
      },
    ],
    hooks: {
      beforeCreate: (session) => {
        // Generate unique QR code
        if (!session.qr_code) {
          session.qr_code = `ATT-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;
        }
        // Set QR expiration time (15 seconds from now)
        if (!session.qr_expires_at) {
          session.qr_expires_at = new Date(Date.now() + 15000);
        }
      },
    },
  });

  return AttendanceSession;
};

