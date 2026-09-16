# Política de secretos en archivos Postman

No se deben versionar credenciales reales (usuarios, contraseñas, tokens o API keys) en archivos `.yml/.yaml` de Postman.

## Variables recomendadas en Postman

Configura estas variables en tu Environment/Globals antes de ejecutar las solicitudes:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SUPERVISOR_USERNAME`
- `SUPERVISOR_PASSWORD`
- `USERNAME`
- `PASSWORD`
- `DEFAULT_PASSWORD`
- `TOKEN`

Usa siempre placeholders con formato `{{VARIABLE}}` en ejemplos y colecciones compartidas.
