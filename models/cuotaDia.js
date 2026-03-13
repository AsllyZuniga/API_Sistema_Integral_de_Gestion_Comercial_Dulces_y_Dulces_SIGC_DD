const { DataTypes } = require('sequelize');

const options = {
    tableName: 'cuotaDia',
    comment: '',
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
};

module.exports = (sequelize) => {
    const CuotaDia = sequelize.define('cuotaDia', {
        id_cuotaDia: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        cuota_dia: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        fecha_inicio: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        fecha_fin: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        id_usuario: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'usuario',
                key: 'id_usuario'
            }
        }
    }, options);

    CuotaDia.associate = function(models) {
        CuotaDia.belongsTo(models.usuario, {
            foreignKey: 'id_usuario',
            targetKey: 'id_usuario',
            as: 'usuario'
        });
    };

    return CuotaDia;
};