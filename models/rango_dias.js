const { DataTypes } = require('sequelize');

const options = {
    tableName: 'rango_dias',
    comment: '',
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
};

module.exports = (sequelize) => {
    const RangoDias = sequelize.define('rango_dias', {
        id_rango_dias: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
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
    }, options);

    return RangoDias;
};