const fs = require('fs');
const service = require('../services/impactosImportService');
const { getVendedorScopeFromAuth } = require('../utils/scopeHelper');

// Mapa: alias de tipo → servicio de importación
const IMPORT_BY_TIPO = {
    cliente: service.importarCliente,
    clientes: service.importarCliente,
    categoria: service.importarCategoria,
    categorias: service.importarCategoria,
    proveedor: service.importarProveedor,
    proveedores: service.importarProveedor
};

// Palabra que DEBE aparecer en el nombre del archivo según el endpoint
const NOMBRE_KEY_BY_TIPO = {
    cliente: 'impactos_cliente',
    clientes: 'impactos_cliente',
    categoria: 'impactos_categoria',
    categorias: 'impactos_categoria',
    proveedor: 'impactos_proveedor',
    proveedores: 'impactos_proveedor'
};

function toArr(val) {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
    return [...new Set(flat)];
}

function getTipo(req) {
    return String(req.params.tipo || '').toLowerCase();
}

async function cargar(req, res) {
    const tipo = getTipo(req);
    const importFn = IMPORT_BY_TIPO[tipo];

    try {
        if (!importFn) {
            return res.status(400).send({
                success: false,
                error: `Tipo inválido: "${tipo}". Use: clientes, categorias o proveedores.`
            });
        }

        if (!req.file) {
            return res.status(400).send({
                success: false,
                error: 'Archivo es requerido (campo multipart "archivo")',
                instrucciones: {
                    endpoint: `POST /api/impactos-import/${tipo}/cargar`,
                    tipo: 'multipart/form-data',
                    campos: {
                        archivo: 'CSV (requerido)'
                    },
                    query_opcionales: {
                        year: 'Año para interpretar periodos (ej: ?year=2026)'
                    }
                }
            });
        }

        const rutaArchivo = req.file.path;
        const nombreOriginal = String(req.file.originalname || '').toLowerCase();
        const palabraClave = NOMBRE_KEY_BY_TIPO[tipo];

        // Validación de nombre: debe contener "impactos" + el tipo del endpoint
        if (!nombreOriginal.includes('impactos')) {
            fs.unlinkSync(rutaArchivo);
            return res.status(400).send({
                success: false,
                error: 'El nombre del archivo debe contener "impactos" (ej: impactos_clientes.csv). Si dice cuotas_vendedor.csv está mal.',
                nombre_archivo: req.file.originalname
            });
        }

        if (!nombreOriginal.includes(palabraClave)) {
            fs.unlinkSync(rutaArchivo);
            return res.status(400).send({
                success: false,
                error: `El archivo para /${tipo}/cargar debe llamarse con "${palabraClave}" en el nombre (ej: ${palabraClave}.csv). Recibiste: "${req.file.originalname}".`,
                nombre_archivo: req.file.originalname
            });
        }

        try {
            const content = fs.readFileSync(rutaArchivo);
            const options = { year: req.query.year ? Number(req.query.year) : undefined };
            const resultado = await importFn(content, options);
            return res.status(200).send(resultado);
        } finally {
            if (fs.existsSync(rutaArchivo)) {
                fs.unlinkSync(rutaArchivo);
            }
        }
    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).send({
            success: false,
            error: error.message
        });
    }
}

async function obtener(req, res) {
    const tipo = getTipo(req);

    try {
        // 1. Scope según rol del JWT:
        //    - admin (rol=1)     → ve TODO
        //    - supervisor (rol=2)→ solo su equipo (id_supervisor = idUsuario)
        //    - vendedor (rol=3)  → solo él mismo (id_usuario = idUsuario)
        const scope = await getVendedorScopeFromAuth(req.auth);

        let idsScope = null;
        if (scope.tipo === 'team') {
            idsScope = scope.idsVendedor || [];
        }
        if (scope.tipo === 'self') {
            idsScope = scope.idVendedor ? [scope.idVendedor] : [];
        }

        // 2. Filtros del front (todos disponibles para todos los roles)
        const q = req.query;
        const filtros = {
            fechaInicio: q.fechaInicio || undefined,
            fechaFin: q.fechaFin || undefined,
            tipoPeriodo: q.tipoPeriodo || q.tipo_periodo || undefined,
            canal: toArr(q.canal || q.codCanal),
            ciudad: toArr(q.ciudad || q.codCiudad),
            categoria: toArr(q.categoria || q.codCategoria),
            proveedor: toArr(q.proveedor || q.codProveedor)
        };

        // 3. Filtro por vendedor: SOLO el admin puede elegir vendedores.
        //    Supervisor/vendedor lo ignoran porque su alcance ya lo restringe.
        if (scope.tipo === 'all') {
            filtros.vendedor = toArr(q.vendedor || q.codVendedor);
        }

        const data = await service.obtenerImpactos(tipo, {
            ...filtros,
            idsScope
        });

        return res.status(200).send(data);
    } catch (error) {
        return res.status(400).send({
            success: false,
            error: error.message
        });
    }
}

async function actualizar(req, res) {
    const tipo = getTipo(req);

    try {
        const resultado = await service.actualizarImpacto(tipo, req.params.id, req.body.cuota);

        if (!resultado.success) {
            return res.status(resultado.status || 400).send(resultado);
        }

        return res.status(200).send(resultado);
    } catch (error) {
        return res.status(400).send({
            success: false,
            error: error.message
        });
    }
}

async function eliminar(req, res) {
    const tipo = getTipo(req);

    try {
        const resultado = await service.eliminarImpacto(tipo, req.params.id);

        if (!resultado.success) {
            return res.status(resultado.status || 400).send(resultado);
        }

        return res.status(200).send(resultado);
    } catch (error) {
        return res.status(400).send({
            success: false,
            error: error.message
        });
    }
}

async function eliminarBulk(req, res) {
    const tipo = getTipo(req);

    try {
        const resultado = await service.eliminarImpactosBulk(tipo, {
            vendedor: req.query.vendedor || req.query.codVendedor,
            vendedor_id: req.query.vendedor_id,
            fechaInicio: req.query.fechaInicio,
            fechaFin: req.query.fechaFin
        });

        if (!resultado.success) {
            return res.status(resultado.status || 400).send(resultado);
        }

        return res.status(200).send(resultado);
    } catch (error) {
        return res.status(400).send({
            success: false,
            error: error.message
        });
    }
}

function getInstrucciones(req, res) {
    return res.status(200).send({
        success: true,
        titulo: 'Importador de Impactos',
        descripcion: 'Carga archivos CSV de impactos (cuotas) por cliente, categoría o proveedor.',
        endpoints: {
            clientes: {
                metodo: 'POST',
                url: '/api/impactos-import/clientes/cargar',
                tipo: 'multipart/form-data',
                campos: { archivo: 'CSV requerido — nombre debe contener "impactos_cliente"' },
                formato: 'ANCHO — periodos en columnas: cod_vendedor, nombre, "1 al 2 de mayo", ..., "CUOTA MES"',
                ejemplo_curl: 'curl -X POST http://localhost:3000/api/impactos-import/clientes/cargar -F "archivo=@impactos_clientes.csv"'
            },
            categorias: {
                metodo: 'POST',
                url: '/api/impactos-import/categorias/cargar',
                tipo: 'multipart/form-data',
                campos: { archivo: 'CSV requerido — nombre debe contener "impactos_categoria"' },
                formato: 'VERTICAL — fila por periodo: cod_vendedor, nombre, periodo, CAFES, GALLETAS, ...',
                ejemplo_curl: 'curl -X POST http://localhost:3000/api/impactos-import/categorias/cargar -F "archivo=@impactos_categoria.csv"'
            },
            proveedores: {
                metodo: 'POST',
                url: '/api/impactos-import/proveedores/cargar',
                tipo: 'multipart/form-data',
                campos: { archivo: 'CSV requerido — nombre debe contener "impactos_proveedor"' },
                formato: 'VERTICAL — fila por periodo: cod_vendedor, nombre, periodo, ARCOR, TONING, ...',
                ejemplo_curl: 'curl -X POST http://localhost:3000/api/impactos-import/proveedores/cargar -F "archivo=@impactos_proveedores.csv"'
            },
            actualizar: {
                metodo: 'PUT',
                url: '/api/impactos-import/:tipo/:id',
                descripcion: 'Actualiza la cuota de un impacto existente (SOLO ADMIN)',
                body: { cuota: 'Número (requerido)' },
                ejemplo_curl: 'curl -X PUT http://localhost:3000/api/impactos-import/clientes/123 -H "Content-Type: application/json" -d \'{"cuota": 50000}\''
            },
            eliminar: {
                metodo: 'DELETE',
                url: '/api/impactos-import/:tipo/:id',
                descripcion: 'Elimina un impacto existente (SOLO ADMIN)',
                ejemplo_curl: 'curl -X DELETE http://localhost:3000/api/impactos-import/clientes/123'
            },
            eliminar_bulk: {
                metodo: 'DELETE',
                url: '/api/impactos-import/:tipo',
                descripcion: 'Elimina impactos en BULK por vendedor + tipo + rango de fechas opcional (SOLO ADMIN)',
                query: {
                    vendedor: 'código de vendedor (obligatorio) — también acepta vendedor_id=id',
                    fechaInicio: 'YYYY-MM-DD (opcional)',
                    fechaFin: 'YYYY-MM-DD (opcional)',
                    nota: 'Si no llegan fechas, borra TODO el histórico del vendedor para ese tipo'
                },
                ejemplo_curl: 'curl -X DELETE "http://localhost:3000/api/impactos-import/clientes?vendedor=150&fechaInicio=2026-05-01&fechaFin=2026-05-31"'
            },
            consultar: {
                metodo: 'GET',
                url: '/api/impactos-import/:tipo',
                descripcion: 'tipo = clientes | categorias | proveedores',
                query: {
                    fechaInicio: 'YYYY-MM-DD (opcional) — impactos cuyo periodo termine desde esta fecha',
                    fechaFin: 'YYYY-MM-DD (opcional) — impactos cuyo periodo inicie hasta esta fecha',
                    tipoPeriodo: 'SEMANAL | MENSUAL (opcional, puede repetirse o ir separado por coma)',
                    vendedor: 'Códigos de vendedor (opcional, SOLO admin lo aplica)',
                    categoria: 'IDs de categoría (opcional, solo tipo=categorias)',
                    proveedor: 'IDs de proveedor (opcional, solo tipo=proveedores)',
                    canal: 'IDs de canal (opcional) — vendedores con ventas en ese canal',
                    ciudad: 'IDs de ciudad (opcional) — vendedores con ventas en esa ciudad'
                }
            }
        },
        permisos: {
            cargar: 'SOLO ADMIN (rol=1) puede importar CSVs',
            actualizar: 'SOLO ADMIN (rol=1) puede actualizar cuotas (PUT)',
            eliminar: 'SOLO ADMIN (rol=1) puede eliminar impactos (DELETE)',
            consultar: [
                'ADMIN (rol=1): ve TODOS los impactos con todos los filtros',
                'SUPERVISOR (rol=2): ve SOLO los impactos de su equipo (filtro vendedor ignorado)',
                'VENDEDOR (rol=3): ve SOLO sus propios impactos (filtro vendedor ignorado)'
            ]
        },
        validacion_nombre: 'El archivo DEBE contener "impactos" + el tipo en su nombre. "cuotas_vendedor.csv" es RECHAZADO.',
        normalizacion: [
            'Vendedores: "150" y "0150" son el mismo código (se prefiere el formato padded de la maestra)',
            'Categorías/Proveedores: "Café", "cafe", "CAFÉ" son lo mismo (sin tildes, UPPERCASE)',
            'LA CORUÑA = LA CORUNA (mismo proveedor)',
            'SOLO LECTURA de maestras: si un vendedor/categoría/proveedor NO existe, la importación se RECHAZA y NO se carga nada'
        ]
    });
}

module.exports = {
    cargar,
    obtener,
    actualizar,
    eliminar,
    eliminarBulk,
    getInstrucciones
};