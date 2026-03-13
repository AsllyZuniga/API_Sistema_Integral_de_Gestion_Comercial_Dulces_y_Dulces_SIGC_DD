const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CuotaProveedor = sequelize.define('CuotaProveedor', {
        id_cuotaProveedor: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        cuota: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        fecha_inicio: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        fecha_fin: {
            type: DataTypes.DATEONLY,
            allowNull: false
        }
    }, {
        tableName: 'cuotaProveedor',
        schema: 'public',
        timestamps: false
    });

    CuotaProveedor.associate = (models) => {
        CuotaProveedor.hasMany(models.VendedorCuotaProveedor, {
            foreignKey: 'id_cuotaProveedor',
            as: 'asignaciones'
        });
    };

    return CuotaProveedor;
};