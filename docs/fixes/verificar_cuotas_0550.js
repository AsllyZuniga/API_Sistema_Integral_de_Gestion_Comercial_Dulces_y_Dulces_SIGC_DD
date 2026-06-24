/**
 * Verificación: Confirmar que vendedor 0550 tiene 33 proveedores con cuota
 */

const models = require('../../models');
const { sequelize } = require('../../models');

async function verificar() {
    try {
        console.log('🔍 Verificando cuotas de vendedor 0550 en enero 2026...\n');

        // Buscar vendedor 0550
        const vendedor = await models.vendedor_model.findOne({
            where: { codigo_vendedor: '0550' },
            attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
        });

        if (!vendedor) {
            console.log('❌ Vendedor 0550 no encontrado');
            process.exit(1);
        }

        console.log(`✅ Vendedor encontrado: ${vendedor.nombre} (ID: ${vendedor.id_vendedor})\n`);

        // Obtener asignaciones de cuota para este vendedor en enero 2026
        const asignaciones = await models.vendedorCuotaProveedor_model.findAll({
            where: { id_vendedor: vendedor.id_vendedor },
            include: [
                {
                    model: models.cuotaProveedor_model,
                    as: 'cuotaProveedor',
                    required: true,
                    where: {
                        fecha_inicio: '2026-01-01',
                        fecha_fin: '2026-01-31'
                    },
                    attributes: ['id_cuotaProveedor', 'cuota', 'fecha_inicio', 'fecha_fin']
                },
                {
                    model: models.proveedor_model,
                    as: 'proveedor',
                    required: true,
                    attributes: ['id_proveedor', 'nombre', 'codigo']
                }
            ],
            attributes: ['id_vendedor_cuota_proveedor', 'estado'],
            order: [[sequelize.literal('proveedor.nombre'), 'ASC']],
            raw: false
        });

        console.log(`📊 Asignaciones encontradas: ${asignaciones.length}\n`);

        if (asignaciones.length === 0) {
            console.log('❌ No hay asignaciones para este vendedor en enero 2026');
            process.exit(1);
        }

        // Mostrar cada asignación
        let totalCuota = 0;
        asignaciones.forEach((a, idx) => {
            const cuota = Number(a.cuotaProveedor.cuota) || 0;
            totalCuota += cuota;
            console.log(`${idx + 1}. ${a.proveedor.nombre.padEnd(40)} | $${cuota.toLocaleString('es-CO')}`);
        });

        console.log(`\n${'='.repeat(70)}`);
        console.log(`✅ TOTAL CUOTA: $${totalCuota.toLocaleString('es-CO')}`);
        console.log(`📊 Proveedores asignados: ${asignaciones.length}`);
        console.log(`${'='.repeat(70)}`);

        // Comparar con el esperado de CSV
        const esperado = 206293580;
        const diferencia = esperado - totalCuota;
        const porcentaje = ((totalCuota / esperado) * 100).toFixed(1);

        console.log(`\n📋 COMPARACIÓN CON CSV:`);
        console.log(`   Esperado:   $${esperado.toLocaleString('es-CO')}`);
        console.log(`   Actual:     $${totalCuota.toLocaleString('es-CO')}`);
        console.log(`   Diferencia: $${Math.abs(diferencia).toLocaleString('es-CO')} ${diferencia < 0 ? '❌' : '✅'}`);
        console.log(`   Cobertura:  ${porcentaje}%`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

verificar();
