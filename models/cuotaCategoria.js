const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const attributes = {
        id_cuota_categoria: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: null,
            comment: null,
            primaryKey: true,
            field: 'id_cuota_categoria',
            autoIncrement: true
        },
        cuota: {
            type: DataTypes.DECIMAL,
            allowNull: true,
            defaultValue: null,
            comment: null,
            primaryKey: false,
            field: 'cuota',
            autoIncrement: false
        },
        fecha_inicio: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            comment: null,
            primaryKey: false,
            field: 'fecha_inicio',
            autoIncrement: false
        },
        fecha_fin: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            comment: null,
            primaryKey: false,
            field: 'fecha_fin',
            autoIncrement: false
        }
    };

    const options = {
        tableName: 'cuotaCategoria',
        comment: '',
        indexes: [],
        timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema: 'public'
    };

    const CuotaCategoriaModel = sequelize.define('cuotaCategoria_model', attributes, options);
    return CuotaCategoriaModel;
};