module.exports = (sequelize, DataTypes) => {
    const Sensor = sequelize.define('Sensor', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        sensor_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('temperature', 'humidity', 'occupancy', 'energy', 'air_quality', 'light'),
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        building: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        room: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        min_value: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        max_value: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        threshold_low: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        threshold_high: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
            defaultValue: 'active',
        },
        last_reading: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        last_reading_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName: 'sensors',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['sensor_id'] },
            { fields: ['type'] },
            { fields: ['status'] },
            { fields: ['building'] },
        ],
    });

    return Sensor;
};
