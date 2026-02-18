var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var categoriasRouter = require("./routes/categorias");
var clientesRouter = require("./routes/clientes");
var cuotas_vendedoresRouter = require("./routes/cuotas_vendedores");
var productosRouter = require("./routes/productos");
var staging_ventasRouter = require("./routes/staging_ventas");
var tipos_documentoRouter = require("./routes/tipos_documento");
var unidades_medidaRouter = require("./routes/unidades_medida");
var vendedoresRouter = require("./routes/vendedores");
var ventasRouter = require("./routes/ventas");
var ventas_detalleRouter = require("./routes/ventas_detalle");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/categorias", categoriasRouter);
app.use("/clientes", clientesRouter);
app.use("/cuotas_vendedores", cuotas_vendedoresRouter);
app.use("/productos", productosRouter);
app.use("/staging_ventas", staging_ventasRouter);
app.use("/tipos_documento", tipos_documentoRouter);
app.use("/unidadades_medida", unidades_medidaRouter);
app.use("/vendedores", vendedoresRouter);
app.use("/ventas", ventasRouter);
app.use("/ventas_detalle", ventas_detalleRouter);
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
