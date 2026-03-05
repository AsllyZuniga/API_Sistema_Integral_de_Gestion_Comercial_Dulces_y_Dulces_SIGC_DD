#!/usr/bin/env bash
set -euo pipefail

MODELS_DIR="./models"
CONTROLLERS_DIR="./controllers"
ROUTES_DIR="./routes"

if [[ ! -d "$MODELS_DIR" ]]; then
  echo "❌ No existe $MODELS_DIR. Ejecuta el script desde la raíz del proyecto."
  exit 1
fi

mkdir -p "$CONTROLLERS_DIR" "$ROUTES_DIR"

shopt -s nullglob
files=("$MODELS_DIR"/*.js)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "❌ No encontré archivos .js en $MODELS_DIR"
  exit 1
fi

for f in "${files[@]}"; do
  name="$(basename "$f" .js)"

  # Controllers
  if [[ "$name" == "index" ]]; then
    ctrl_file="$CONTROLLERS_DIR/index.js"
  else
    ctrl_file="$CONTROLLERS_DIR/${name}Controller.js"
  fi

  # Routes
  if [[ "$name" == "index" ]]; then
    route_file="$ROUTES_DIR/index.js"
  else
    route_file="$ROUTES_DIR/${name}Router.js"
  fi

  # Crear archivos vacíos si no existen (no sobreescribe)
  if [[ ! -f "$ctrl_file" ]]; then
    : > "$ctrl_file"
    echo "✅ creado: $ctrl_file"
  else
    echo "⏭️  existe: $ctrl_file"
  fi

  if [[ ! -f "$route_file" ]]; then
    : > "$route_file"
    echo "✅ creado: $route_file"
  else
    echo "⏭️  existe: $route_file"
  fi
done

echo ""
echo "🎉 Listo. Archivos vacíos creados en:"
echo " - $CONTROLLERS_DIR"
echo " - $ROUTES_DIR"