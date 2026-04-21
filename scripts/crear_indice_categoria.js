#!/usr/bin/env node

const { sequelize } = require('./models');

async function crearIndiceUnico() {
	try {
		console.log('🔧 Creando índice UNIQUE en categoria(nombre)...\n');

		// Primero verificar si el índice ya existe
		const indices = await sequelize.query(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'categoria' 
			AND indexname = 'uk_categoria_nombre'
		`, { type: sequelize.QueryTypes.SELECT });

		if (indices.length > 0) {
			console.log('✅ Índice UNIQUE ya existe en categoria(nombre)');
			return;
		}

		// Crear el índice
		await sequelize.query(`
			CREATE UNIQUE INDEX uk_categoria_nombre 
			ON categoria(nombre)
		`);

		console.log('✅ Índice UNIQUE creado exitosamente en categoria(nombre)');
		console.log('\n📋 Este índice previene:');
		console.log('   - Categorías con nombres duplicados');
		console.log('   - Futuras corrupción de datos de categorías');
		console.log('\n💡 Si intenta crear una categoría con nombre duplicado, BD rechazará la operación');

	} catch (error) {
		// Si es MariaDB/MySQL en lugar de PostgreSQL
		if (error.message.includes('pg_indexes') || error.message.includes('does not exist')) {
			console.log('🔧 Usando sintaxis MySQL/MariaDB...\n');

			try {
				// Para MySQL/MariaDB
				await sequelize.query(`
					CREATE UNIQUE INDEX uk_categoria_nombre 
					ON categoria(nombre)
				`);

				console.log('✅ Índice UNIQUE creado exitosamente en categoria(nombre)');
				console.log('\n📋 Este índice previene:');
				console.log('   - Categorías con nombres duplicados');
				console.log('   - Futuras corrupción de datos de categorías');

			} catch (mysqlError) {
				if (mysqlError.message.includes('Duplicate key') || mysqlError.message.includes('already exists')) {
					console.log('✅ Índice ya existe en categoria(nombre)');
				} else {
					console.error('❌ Error creando índice:', mysqlError.message);
					throw mysqlError;
				}
			}
		} else {
			console.error('❌ Error:', error.message);
			throw error;
		}
	} finally {
		await sequelize.close();
	}
}

crearIndiceUnico().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
