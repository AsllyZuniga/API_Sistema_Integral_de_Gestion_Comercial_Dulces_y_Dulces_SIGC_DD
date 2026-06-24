const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const isSsl = process.env.DB_SSL === 'true';

const baseConfig = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    dialectOptions: isSsl ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
};

module.exports = {
    development: { ...baseConfig },
    test: { ...baseConfig },
    production: { ...baseConfig }
};
