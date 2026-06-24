const { sequelize } = require('../../models');

(async () => {
  try {
    console.log('\n🔨 CREANDO TABLA vendedor_cuota_categoria...\n');

    // 1. Crear la tabla vendedor_cuota_categoria
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendedor_cuota_categoria (
        id BIGSERIAL PRIMARY KEY,
        id_vendedor INTEGER NOT NULL REFERENCES vendedor(id_vendedor) ON DELETE CASCADE,
        id_categoria INTEGER NOT NULL REFERENCES categoria(id_categoria) ON DELETE CASCADE,
        cuota BIGINT NOT NULL DEFAULT 0,
        fecha_inicio DATE,
        fecha_fin DATE,
        UNIQUE (id_vendedor, id_categoria, fecha_inicio, fecha_fin)
      );
    `);

    console.log('✅ Tabla vendedor_cuota_categoria creada');

    // 2. Agregar índice UNIQUE en categoria(nombre) para evitar duplicados
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_categoria_nombre ON categoria(nombre);
    `);

    console.log('✅ Índice UNIQUE en categoria(nombre) creado\n');

    process.exit(0);
  } catch(e) {
    if (e.message.includes('already exists')) {
      console.log('✅ Tabla/índices ya existen');
      process.exit(0);
    }
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
