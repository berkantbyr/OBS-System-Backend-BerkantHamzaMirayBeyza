module.exports = (sequelize, DataTypes) => {
  const ExcuseRequest = sequelize.define('ExcuseRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'attendance_sessions',
        key: 'id',
      },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Excuse type
    excuse_type: {
      type: DataTypes.ENUM('medical', 'family_emergency', 'official', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    // Supporting document URL
    document_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // Request status
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    // Review info
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'faculty',
        key: 'id',
      },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Reviewer notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'excuse_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['student_id'],
      },
      {
        fields: ['session_id'],
      },
      {
        fields: ['status'],
      },
      {
        unique: true,
        fields: ['student_id', 'session_id'],
      },
    ],
  });

  return ExcuseRequest;
};






