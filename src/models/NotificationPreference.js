module.exports = (sequelize, DataTypes) => {
    const NotificationPreference = sequelize.define('NotificationPreference', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Email preferences
        email_academic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        email_attendance: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        email_meal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        email_event: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        email_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        email_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // Push preferences
        push_academic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_attendance: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_meal: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_event: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // SMS preferences
        sms_attendance: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        sms_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'notification_preferences',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return NotificationPreference;
};
