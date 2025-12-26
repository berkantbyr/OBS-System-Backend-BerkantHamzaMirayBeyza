const db = require('../models');
const logger = require('../utils/logger');
const { Op, fn, col } = require('sequelize');

const { Sensor, SensorData } = db;

/**
 * Get All Sensors
 * GET /api/v1/sensors
 */
const getAllSensors = async (req, res) => {
    try {
        const {
            type,
            status,
            building,
            page = 1,
            limit = 50
        } = req.query;

        const where = {};

        if (type) where.type = type;
        if (status) where.status = status;
        if (building) where.building = building;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: sensors } = await Sensor.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: {
                sensors,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            }
        });

    } catch (error) {
        logger.error('Error getting sensors:', error);
        res.status(500).json({
            success: false,
            message: 'Sensörler alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Sensor by ID
 * GET /api/v1/sensors/:id
 */
const getSensorById = async (req, res) => {
    try {
        const { id } = req.params;

        const sensor = await Sensor.findByPk(id);

        if (!sensor) {
            return res.status(404).json({
                success: false,
                message: 'Sensör bulunamadı'
            });
        }

        res.json({
            success: true,
            data: sensor
        });

    } catch (error) {
        logger.error('Error getting sensor:', error);
        res.status(500).json({
            success: false,
            message: 'Sensör alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Sensor Data
 * GET /api/v1/sensors/:id/data
 */
const getSensorData = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            startDate,
            endDate,
            aggregation, // 'hour' | 'day' | 'raw'
            limit = 100
        } = req.query;

        const sensor = await Sensor.findByPk(id);
        if (!sensor) {
            return res.status(404).json({
                success: false,
                message: 'Sensör bulunamadı'
            });
        }

        const where = { sensor_id: id };

        if (startDate) {
            where.timestamp = { [Op.gte]: new Date(startDate) };
        }
        if (endDate) {
            where.timestamp = { ...where.timestamp, [Op.lte]: new Date(endDate) };
        }

        let data;

        if (aggregation === 'hour') {
            data = await db.sequelize.query(`
        SELECT 
          DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as period,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as reading_count
        FROM sensor_data
        WHERE sensor_id = :sensorId
        ${startDate ? 'AND timestamp >= :startDate' : ''}
        ${endDate ? 'AND timestamp <= :endDate' : ''}
        GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
        ORDER BY period DESC
        LIMIT :limit
      `, {
                replacements: {
                    sensorId: id,
                    startDate,
                    endDate,
                    limit: parseInt(limit)
                },
                type: db.Sequelize.QueryTypes.SELECT
            });
        } else if (aggregation === 'day') {
            data = await db.sequelize.query(`
        SELECT 
          DATE(timestamp) as period,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as reading_count
        FROM sensor_data
        WHERE sensor_id = :sensorId
        ${startDate ? 'AND timestamp >= :startDate' : ''}
        ${endDate ? 'AND timestamp <= :endDate' : ''}
        GROUP BY DATE(timestamp)
        ORDER BY period DESC
        LIMIT :limit
      `, {
                replacements: {
                    sensorId: id,
                    startDate,
                    endDate,
                    limit: parseInt(limit)
                },
                type: db.Sequelize.QueryTypes.SELECT
            });
        } else {
            // Raw data
            data = await SensorData.findAll({
                where,
                order: [['timestamp', 'DESC']],
                limit: parseInt(limit)
            });
        }

        res.json({
            success: true,
            data: {
                sensor: {
                    id: sensor.id,
                    name: sensor.name,
                    type: sensor.type,
                    unit: sensor.unit
                },
                readings: data,
                aggregation: aggregation || 'raw'
            }
        });

    } catch (error) {
        logger.error('Error getting sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Sensör verisi alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Latest Readings for All Sensors
 * GET /api/v1/sensors/latest
 */
const getLatestReadings = async (req, res) => {
    try {
        const sensors = await Sensor.findAll({
            where: { status: 'active' },
            attributes: ['id', 'sensor_id', 'name', 'type', 'location', 'building', 'room', 'unit', 'last_reading', 'last_reading_at', 'threshold_low', 'threshold_high'],
            order: [['name', 'ASC']]
        });

        // Check for alerts
        const sensorsWithAlerts = sensors.map(sensor => {
            let alertStatus = 'normal';
            if (sensor.last_reading !== null && sensor.last_reading !== undefined) {
                if (sensor.threshold_low !== null && sensor.last_reading < sensor.threshold_low) {
                    alertStatus = 'low';
                } else if (sensor.threshold_high !== null && sensor.last_reading > sensor.threshold_high) {
                    alertStatus = 'high';
                }
            }
            return {
                ...sensor.toJSON(),
                alertStatus
            };
        });

        res.json({
            success: true,
            data: sensorsWithAlerts
        });

    } catch (error) {
        logger.error('Error getting latest readings:', error);
        res.status(500).json({
            success: false,
            message: 'Son okumalar alınamadı',
            error: error.message
        });
    }
};

/**
 * Create Sensor (Admin only)
 * POST /api/v1/sensors
 */
const createSensor = async (req, res) => {
    try {
        const {
            sensor_id, name, type, location, building, room,
            unit, min_value, max_value, threshold_low, threshold_high
        } = req.body;

        const existingSensor = await Sensor.findOne({ where: { sensor_id } });
        if (existingSensor) {
            return res.status(400).json({
                success: false,
                message: 'Bu sensör ID zaten kullanılıyor'
            });
        }

        const sensor = await Sensor.create({
            sensor_id,
            name,
            type,
            location,
            building,
            room,
            unit,
            min_value,
            max_value,
            threshold_low,
            threshold_high,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Sensör oluşturuldu',
            data: sensor
        });

    } catch (error) {
        logger.error('Error creating sensor:', error);
        res.status(500).json({
            success: false,
            message: 'Sensör oluşturulamadı',
            error: error.message
        });
    }
};

/**
 * Record Sensor Data (IoT endpoint)
 * POST /api/v1/sensors/:id/data
 */
const recordSensorData = async (req, res) => {
    try {
        const { id } = req.params;
        const { value, unit, quality = 'good', metadata } = req.body;

        const sensor = await Sensor.findByPk(id);
        if (!sensor) {
            return res.status(404).json({
                success: false,
                message: 'Sensör bulunamadı'
            });
        }

        const reading = await SensorData.create({
            sensor_id: id,
            value,
            unit: unit || sensor.unit,
            quality,
            metadata,
            timestamp: new Date()
        });

        // Update sensor's last reading
        await sensor.update({
            last_reading: value,
            last_reading_at: new Date()
        });

        // TODO: Emit via WebSocket for real-time updates
        // socketService.emitToRoom('sensors', 'sensorUpdate', { sensorId: id, reading });

        res.status(201).json({
            success: true,
            data: reading
        });

    } catch (error) {
        logger.error('Error recording sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Sensör verisi kaydedilemedi',
            error: error.message
        });
    }
};

/**
 * Simulate Sensor Data (for demo purposes)
 * POST /api/v1/sensors/simulate
 */
const simulateSensorData = async (req, res) => {
    try {
        let sensors = await Sensor.findAll({ where: { status: 'active' } });

        // If no sensors exist, create demo sensors first
        if (sensors.length === 0) {
            const demoSensors = [
                {
                    sensor_id: 'TEMP-A101',
                    name: 'A101 Sıcaklık Sensörü',
                    type: 'temperature',
                    location: 'Mühendislik Fakültesi A101',
                    building: 'Mühendislik Fakültesi',
                    room: 'A101',
                    unit: '°C',
                    min_value: 15,
                    max_value: 30,
                    threshold_low: 18,
                    threshold_high: 26,
                    status: 'active',
                },
                {
                    sensor_id: 'HUM-A101',
                    name: 'A101 Nem Sensörü',
                    type: 'humidity',
                    location: 'Mühendislik Fakültesi A101',
                    building: 'Mühendislik Fakültesi',
                    room: 'A101',
                    unit: '%',
                    min_value: 20,
                    max_value: 80,
                    threshold_low: 30,
                    threshold_high: 70,
                    status: 'active',
                },
                {
                    sensor_id: 'OCC-LIB',
                    name: 'Kütüphane Doluluk Sensörü',
                    type: 'occupancy',
                    location: 'Merkez Kütüphane - Giriş',
                    building: 'Merkez Kütüphane',
                    room: 'Giriş',
                    unit: 'kişi',
                    min_value: 0,
                    max_value: 500,
                    threshold_high: 450,
                    status: 'active',
                },
                {
                    sensor_id: 'ENERGY-MAIN',
                    name: 'Ana Bina Enerji Sayacı',
                    type: 'energy',
                    location: 'Ana Kampüs - Trafo',
                    building: 'Ana Kampüs',
                    unit: 'kWh',
                    status: 'active',
                },
                {
                    sensor_id: 'AIR-CAF',
                    name: 'Yemekhane Hava Kalitesi',
                    type: 'air_quality',
                    location: 'Merkez Yemekhane',
                    building: 'Merkez Yemekhane',
                    unit: 'AQI',
                    min_value: 0,
                    max_value: 500,
                    threshold_high: 100,
                    status: 'active',
                },
                {
                    sensor_id: 'LIGHT-A201',
                    name: 'A201 Işık Sensörü',
                    type: 'light',
                    location: 'Mühendislik Fakültesi A201',
                    building: 'Mühendislik Fakültesi',
                    room: 'A201',
                    unit: 'lux',
                    min_value: 0,
                    max_value: 1500,
                    threshold_low: 300,
                    status: 'active',
                },
            ];

            for (const sensorData of demoSensors) {
                const [sensor] = await Sensor.findOrCreate({
                    where: { sensor_id: sensorData.sensor_id },
                    defaults: sensorData
                });
            }

            // Fetch the newly created sensors
            sensors = await Sensor.findAll({ where: { status: 'active' } });
        }

        for (const sensor of sensors) {
            let value;

            switch (sensor.type) {
                case 'temperature':
                    value = 18 + Math.random() * 10; // 18-28°C
                    break;
                case 'humidity':
                    value = 30 + Math.random() * 40; // 30-70%
                    break;
                case 'occupancy':
                    value = Math.floor(Math.random() * (sensor.max_value || 100));
                    break;
                case 'energy':
                    value = 100 + Math.random() * 400; // 100-500 kWh
                    break;
                case 'air_quality':
                    value = Math.floor(Math.random() * 150); // AQI 0-150
                    break;
                case 'light':
                    value = Math.floor(Math.random() * 1000); // 0-1000 lux
                    break;
                default:
                    value = Math.random() * 100;
            }

            await SensorData.create({
                sensor_id: sensor.id,
                value: Math.round(value * 100) / 100,
                unit: sensor.unit,
                quality: 'good',
                timestamp: new Date()
            });

            await sensor.update({
                last_reading: Math.round(value * 100) / 100,
                last_reading_at: new Date()
            });
        }

        res.json({
            success: true,
            message: `${sensors.length} sensör için simüle veri oluşturuldu`
        });

    } catch (error) {
        logger.error('Error simulating sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Sensör verisi simüle edilemedi',
            error: error.message
        });
    }
};

module.exports = {
    getAllSensors,
    getSensorById,
    getSensorData,
    getLatestReadings,
    createSensor,
    recordSensorData,
    simulateSensorData
};
