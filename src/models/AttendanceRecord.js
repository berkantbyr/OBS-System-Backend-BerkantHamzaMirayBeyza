module.exports = (sequelize, DataTypes) => {
  const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'attendance_sessions',
        key: 'id',
      },
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    check_in_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // Student's GPS location at check-in
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    // GPS accuracy in meters
    accuracy: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Calculated distance from classroom center
    distance_from_center: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Check-in method
    check_in_method: {
      type: DataTypes.ENUM('gps', 'qr_code', 'manual'),
      allowNull: false,
      defaultValue: 'gps',
    },
    // Flag for suspicious activity (e.g., GPS spoofing)
    is_flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    flag_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Status
    status: {
      type: DataTypes.ENUM('present', 'late', 'excused', 'absent'),
      allowNull: false,
      defaultValue: 'present',
    },
    // Client IP address for audit trail
    client_ip: {
      type: DataTypes.STRING(45), // IPv6 addresses can be up to 45 chars
      allowNull: true,
    },
  }, {
    tableName: 'attendance_records',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['session_id'],
      },
      {
        fields: ['student_id'],
      },
      {
        fields: ['is_flagged'],
      },
      {
        unique: true,
        fields: ['session_id', 'student_id'],
      },
    ],
  });

  return AttendanceRecord;
};




