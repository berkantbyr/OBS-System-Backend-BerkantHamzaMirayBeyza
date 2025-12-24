module.exports = (sequelize, DataTypes) => {
    const SensorData = sequelize.define('SensorData', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        sensor_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'sensors',
                key: 'id',
            },
        },
        value: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        unit: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        quality: {
            type: DataTypes.ENUM('good', 'uncertain', 'bad'),
            defaultValue: 'good',
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName: 'sensor_data',
        timestamps: false,
        indexes: [
            { fields: ['sensor_id'] },
            { fields: ['timestamp'] },
            { fields: ['sensor_id', 'timestamp'] },
        ],
    });

    return SensorData;
};
