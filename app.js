var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var indexRouter = require("./routes/index");

var barrioRouter = require("./routes/barrioRouter");
var canalRouter = require("./routes/canalRouter");
var categoriaRouter = require("./routes/categoriaRouter");
var clienteRouter = require("./routes/clienteRouter");
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
const importRouter = require('./routes/importRouter');






var cors = require('cors');
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());

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

app.use("/", indexRouter);
app.use("/barrio", barrioRouter);
app.use("/canale", canalRouter);
app.use("/categoria", categoriaRouter);
app.use("/cliente", clienteRouter);
app.use("/detalle_venta", detalle_ventaRouter);
app.use("/items", itemRouter);
app.use("/megacategoria", megacategoriaRouter);
app.use("/obsequio", obsequioRouter);
app.use("/proveedore", proveedorRouter);
app.use("/roles", rolRouter);
app.use("/subcanale", subcanalRouter);
app.use("/subcategoria", subcategoriaRouter);
app.use("/tipos_documento", tipo_documentoRouter);
app.use("/tipos_negocio", tipo_negocioRouter);
app.use("/usuario", usuarioRouter);
app.use("/vendedor", vendedorRouter);
app.use("/venta", ventaRouter);
app.use('/import', importRouter);




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
