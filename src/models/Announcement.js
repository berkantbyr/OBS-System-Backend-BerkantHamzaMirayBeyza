module.exports = (sequelize, DataTypes) => {
    const Announcement = sequelize.define('Announcement', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        author_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM('info', 'warning', 'success', 'urgent'),
            allowNull: false,
            defaultValue: 'info',
        },
        target_audience: {
            type: DataTypes.ENUM('all', 'students', 'faculty', 'admin'),
            allowNull: false,
            defaultValue: 'all',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        tableName: 'announcements',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['is_active'],
            },
            {
                fields: ['target_audience'],
            },
            {
                fields: ['created_at'],
            },
            {
                fields: ['priority'],
            },
        ],
    });

    return Announcement;
};
