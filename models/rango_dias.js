const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Ajusta la ruta según tu estructura

const RangoDias = sequelize.define('RangoDias', {
    id_rango_dias: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    dias_corridos: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    dias_habiles: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    fecha_fin: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'rango_dias',
    schema: 'public',
    timestamps: false,
    underscored: true
});

module.exports = RangoDias;