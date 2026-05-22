# Copilot instructions for SIGC DD API

## Idioma
- Responde en español en este repositorio.

## Build, test, lint
- Install dependencies: `npm install`
- Start server: `npm start` (bin/www) or `npm run dev` (nodemon)
- DB migrations: `npx sequelize-cli db:migrate`, `npx sequelize-cli db:migrate:undo`, `npx sequelize-cli db:migrate:status`
- Tests: no npm test script. Targeted checks: `node scripts/testMethods.js` (single-method sanity checks) and `node scripts/testImportacion.js` (import dry-run; expects `ventastest.txt` in repo root).
- Lint/build: no scripts defined in `package.json`.

## High-level architecture
- Express app is wired in `app.js` and bootstrapped by `bin/www`. Global settings include 6GB JSON/body limits and 4-hour request timeouts for large imports.
- Sequelize models live in `models/` with schema changes in `migrations/`. Connection config comes from `config/config.json` (seeded from `config/config.example.json`) and optional `.env` values.
- Routes in `routes/` map to controllers in `controllers/`. Core modules cover masters (clientes, vendedores, items, categorias), ventas/detalle_venta, and cuotas/cumplimiento.
- Auth lives under `/api/auth`; most other entity routes are mounted at the root (see `app.js`).
- The TSV bulk-import pipeline is implemented in `services/` (notably `importventas`) and surfaced via `/import`; exports are under `/export`. Uploads land in `uploads/`, and ops workflows run via `scripts/*.js`.
- A background scheduler (`startRangoDiasScheduler` in `services/rangoDiasSchedulerService`) is started at app boot for range-of-days maintenance.

## Key conventions
- Controller shape is consistent: `findAll`, `findById`, `create`, `update`, `delete`.
- Standard response envelope: success `{ success: true, data, message }` and error `{ success: false, error, statusCode }`.
- JWT auth uses `Authorization: Bearer <token>` and the `requireAuthJWT` middleware (decoded claims on `req.auth`).
- Schema changes must go through reversible Sequelize migrations, and multi-table writes should use transactions.
