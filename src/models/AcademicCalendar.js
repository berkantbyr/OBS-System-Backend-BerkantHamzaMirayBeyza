module.exports = (sequelize, DataTypes) => {
    const AcademicCalendar = sequelize.define('AcademicCalendar', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        event_type: {
            type: DataTypes.ENUM(
                'semester_start',
                'semester_end',
                'registration',
                'drop_period',
                'midterm',
                'final',
                'holiday',
                'makeup_exam',
                'graduation',
                'other'
            ),
            allowNull: false,
            defaultValue: 'other',
        },
        semester: {
            type: DataTypes.ENUM('fall', 'spring', 'summer'),
            allowNull: true,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    }, {
        tableName: 'academic_calendar',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['start_date'],
            },
            {
                fields: ['event_type'],
            },
            {
                fields: ['semester', 'year'],
            },
        ],
    });

    return AcademicCalendar;
};
