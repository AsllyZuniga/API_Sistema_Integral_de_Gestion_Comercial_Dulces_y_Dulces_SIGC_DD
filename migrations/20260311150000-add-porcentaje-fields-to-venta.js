module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        // Agregar campos a venta si no existen
        queryInterface.describeTable('venta', { transaction: t }).then(attributes => {
          const promises = [];

          if (!attributes.porcentaje_descuentos) {
            promises.push(
              queryInterface.addColumn('venta', 'porcentaje_descuentos', {
                type: Sequelize.DOUBLE,
                allowNull: true,
                defaultValue: null
              }, { transaction: t })
            );
          }

          if (!attributes.porcentaje_impuesto) {
            promises.push(
              queryInterface.addColumn('venta', 'porcentaje_impuesto', {
                type: Sequelize.DOUBLE,
                allowNull: true,
                defaultValue: null
              }, { transaction: t })
            );
          }

          return Promise.all(promises);
        })
      ]);
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.describeTable('venta', { transaction: t }).then(attributes => {
          const promises = [];

          if (attributes.porcentaje_descuentos) {
            promises.push(
              queryInterface.removeColumn('venta', 'porcentaje_descuentos', { transaction: t })
            );
          }

          if (attributes.porcentaje_impuesto) {
            promises.push(
              queryInterface.removeColumn('venta', 'porcentaje_impuesto', { transaction: t })
            );
          }

          return Promise.all(promises);
        })
      ]);
    });
  }
};
