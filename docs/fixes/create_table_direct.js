const { sequelize } = require('../../models');

(async () => {
  try {
    console.log('\n🔨 CREANDO TABLA vendedor_cuota_categoria...\n');

    // Crear la tabla
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "vendedor_cuota_categoria" (
        "id_vendedor_cuota_categoria" BIGSERIAL PRIMARY KEY,
        "id_vendedor" INTEGER NOT NULL REFERENCES "vendedor"("id_vendedor") ON DELETE CASCADE,
        "id_categoria" INTEGER NOT NULL REFERENCES "categoria"("id_categoria") ON DELETE CASCADE,
        "cuota" BIGINT NOT NULL DEFAULT 0,
        "fecha_inicio" DATE,
        "fecha_fin" DATE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Tabla creada');

    // Crear índice único
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_vendedor_categoria_periodo
      ON "vendedor_cuota_categoria"(id_vendedor, id_categoria, fecha_inicio, fecha_fin);
    `);

    console.log('✅ Índice creado\n');

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
