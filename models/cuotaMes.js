const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CuotaMes = sequelize.define('cuotaMes', {
        id_cuotaMes: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            field: 'id_cuotaMes'
        },
        cuota_mes: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: 'cuota_mes'
        },
        fecha_inicio: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'fecha_inicio'
        },
        fecha_fin: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'fecha_fin'
        },
        id_usuario: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'id_usuario'
        }
    }, {
        tableName: 'cuotaMes',
        comment: '',
        indexes: [],
        timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema: 'public'
    });

    CuotaMes.associate = (models) => {
        CuotaMes.belongsTo(models.usuario, {
            foreignKey: 'id_usuario',
            as: 'usuario',
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        });
    };

    return CuotaMes;
};