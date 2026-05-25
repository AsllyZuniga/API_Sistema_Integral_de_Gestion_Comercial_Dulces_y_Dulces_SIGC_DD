require('dotenv').config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var authRouter = require("./routes/authRouter");
var indexRouter = require("./routes/index");

var barrioRouter = require("./routes/barrioRouter");
var canalRouter = require("./routes/canalRouter");
var categoriaRouter = require("./routes/categoriaRouter");
var ciudadRouter = require("./routes/ciudadRouter");
var clienteRouter = require("./routes/clienteRouter");
var cuotaDiaRouter = require("./routes/cuotaDiaRouter");
var cuotaCategoriaRouter = require("./routes/cuotaCategoriaRouter");
var cuotaCategoriaImportRouter = require("./routes/cuotaCategoriaImportRouter");
var cuotaMesRouter = require("./routes/cuotaMesRouter");
var cuotaSemanaRouter = require("./routes/cuotaSemanaRouter");
var cuotaProveedorRouter = require("./routes/cuotaProveedorRouter");
var detalle_ventaRouter = require("./routes/detalle_ventaRouter");
var itemRouter = require("./routes/itemRouter");
var megacategoriaRouter = require("./routes/megacategoriaRouter");
var obsequioRouter = require("./routes/obsequioRouter");
var proveedorRouter = require("./routes/proveedorRouter");
var rolRouter = require("./routes/rolRouter");
var subcanalRouter = require("./routes/subcanalRouter");
var subcategoriaRouter = require("./routes/subcategoriaRouter");
var tipo_documentoRouter = require("./routes/tipo_documentoRouter");
var tipo_negocioRouter = require("./routes/tipo_negocioRouter");
var usuarioRouter = require("./routes/usuarioRouter");
var vendedorRouter = require("./routes/vendedorRouter");
var ventaRouter = require("./routes/ventaRouter");
var rango_diasRouter = require("./routes/rango_diasRouter");
var cumplimientoMesRouter = require("./routes/cumplimientoMesRouter");
var cumplimientoSemanaRouter = require("./routes/cumplimientoSemanaRouter");
const importRouter = require('./routes/importRouter');
const vendedorCuotaProveedorRouter = require('./routes/vendedorCuotaProveedorRouter');
const vendedorCuotaCategoriaRouter = require('./routes/vendedorCuotaCategoriaRouter');
const adminVentasRouter = require('./routes/adminVentasRouter');
const { startRangoDiasScheduler } = require('./services/rangoDiasSchedulerService');
const exportRoutes = require('./routes/exportRoutes');


var cors = require('cors');
var app = express();

startRangoDiasScheduler();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Configuración de CORS para producción
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response']
};

app.use(cors(corsOptions));

// Configuración para archivos gigantes y timeouts
app.use(express.json({ limit: '6gb' }));
app.use(express.urlencoded({ extended: false, limit: '6gb' }));

// Timeout global para requests largos (4 horas para archivos gigantes)
app.use((req, res, next) => {
  req.setTimeout(4 * 60 * 60 * 1000); // 4 horas
  res.setTimeout(4 * 60 * 60 * 1000); // 4 horas
  next();
});

app.use(logger("dev"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Evita respuestas 304 con datos stale en reportes de cumplimiento.
app.use(["/mes/cumplimiento", "/semana/cumplimiento", "/cuota-categoria"], (req, res, next) => {
  delete req.headers["if-none-match"];
  delete req.headers["if-modified-since"];
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.use("/api/auth", authRouter);
app.use("/", indexRouter);
app.use("/barrio", barrioRouter);
app.use("/canale", canalRouter);
app.use("/categoria", categoriaRouter);
app.use("/ciudad", ciudadRouter);
app.use("/cliente", clienteRouter);
app.use("/cuota-dia", cuotaDiaRouter);
app.use("/cuota-categoria", cuotaCategoriaRouter);
app.use("/cuota-categoria-import", cuotaCategoriaImportRouter);
app.use("/cuota-mes", cuotaMesRouter);
app.use("/cuota-semana", cuotaSemanaRouter);
app.use("/cuota-proveedor", cuotaProveedorRouter);
app.use("/detalle_venta", detalle_ventaRouter);
app.use("/items", itemRouter);
app.use("/megacategoria", megacategoriaRouter);
app.use("/obsequio", obsequioRouter);
app.use("/proveedor", proveedorRouter);
app.use("/roles", rolRouter);
app.use("/subcanale", subcanalRouter);
app.use("/subcategoria", subcategoriaRouter);
app.use("/tipos_documento", tipo_documentoRouter);
app.use("/tipos_negocio", tipo_negocioRouter);
app.use("/usuario", usuarioRouter);
app.use("/vendedor", vendedorRouter);
app.use("/venta", ventaRouter);
app.use("/rango-dias", rango_diasRouter);
app.use('/mes/cumplimiento', cumplimientoMesRouter);
app.use('/semana/cumplimiento', cumplimientoSemanaRouter);
app.use('/import', importRouter);
app.use('/vendedor-cuota-proveedor', vendedorCuotaProveedorRouter);
app.use('/vendedor-cuota-categoria', vendedorCuotaCategoriaRouter);
app.use('/admin', adminVentasRouter);
app.use('/export', exportRoutes);
app.use("/", exportRoutes);


app.get('/health', (req, res) => {
  const pkg = require('./package.json');
  res.json({
    status: 'OK',
    version_code: pkg.version,
    version_name: pkg.config?.version_name || process.env.VERSION_NAME || 'unknown'
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
