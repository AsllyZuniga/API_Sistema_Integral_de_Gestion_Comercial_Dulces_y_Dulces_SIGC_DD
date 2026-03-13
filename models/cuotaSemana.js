const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CuotaSemana = sequelize.define('cuotaSemana', {
        id_cuotaSemana: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        cuota_semana: {
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
            allowNull: false
        }
    }, {
        tableName: 'cuotaSemana',
        comment: '',
        indexes: [],
        timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema: 'public'
    });

    CuotaSemana.associate = (models) => {
        CuotaSemana.belongsTo(models.usuario, {
            foreignKey: 'id_usuario',
            targetKey: 'id_usuario',
            as: 'usuario'
        });
    };

    return CuotaSemana;
};