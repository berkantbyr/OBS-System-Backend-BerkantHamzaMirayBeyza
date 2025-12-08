const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Cloud SQL socket path kontrolü
const isCloudSQL = process.env.DB_HOST && process.env.DB_HOST.startsWith('/cloudsql');

// Production config oluştur
const productionConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
};

// Cloud SQL ise socket kullan, değilse normal host/port
if (isCloudSQL) {
  productionConfig.dialectOptions = {
    socketPath: process.env.DB_HOST,
  };
} else {
  productionConfig.host = process.env.DB_HOST || 'localhost';
  productionConfig.port = process.env.DB_PORT || 3306;
}

module.exports = {
  development: {
    username: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'campus_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
    },
  },
  test: {
    username: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    database: (process.env.DB_NAME || 'campus_db') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  },
  production: productionConfig,
};

