const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🔨 CREANDO TABLA vendedor_cuota_categoria...\n');
    
    // Crear la tabla con SQL puro
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendedor_cuota_categoria (
        id BIGSERIAL PRIMARY KEY,
        id_vendedor INTEGER NOT NULL,
        id_categoria INTEGER NOT NULL,
        cuota BIGINT NOT NULL DEFAULT 0,
        fecha_inicio DATE,
        fecha_fin DATE,
        FOREIGN KEY (id_vendedor) REFERENCES vendedor(id_vendedor) ON DELETE CASCADE,
        FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria) ON DELETE CASCADE,
        UNIQUE (id_vendedor, id_categoria, fecha_inicio, fecha_fin)
      );
    `);
    
    console.log('✅ Tabla vendedor_cuota_categoria creada\n');
    
    // Verificar que se creó
    const tabla = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'vendedor_cuota_categoria'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (tabla.length > 0) {
      console.log('✅ Verificación OK: tabla existe\n');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
