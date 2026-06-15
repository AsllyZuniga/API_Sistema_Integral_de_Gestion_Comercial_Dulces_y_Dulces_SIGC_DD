---
name: express-expert
description: >
  Expert Express.js/Node.js Senior Engineer skill. Use this whenever the user mentions
  Express, Node.js, REST APIs, middleware, Sequelize, PostgreSQL, TypeScript backend,
  API architecture, CRUD endpoints, authentication flows, error handling, or any
  backend/server-side JavaScript/JavaScript task. Trigger even for partial mentions
  like "ruta", "controlador", "servicio", "endpoint", "modelo Sequelize", or
  "backend con Node". Always use this skill before writing any Express or Node.js code.
---

# Express.js Senior Engineer

## Stack canónico
- **Runtime:** Node.js 20+ LTS
- **Framework:** Express 4.x / 5.x
- **Language:** JavaScript (strict mode)
- **ORM:** Sequelize v6 + PostgreSQL (pg, pg-hstore)
- **Validation:** Zod (preferred) o Joi
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Security:** helmet, cors, express-rate-limit
- **Testing:** Jest + Supertest
- **Logging:** Pino o Winston

---

## 1. Arquitectura de Proyecto

```
src/
├── config/          # DB, env, cors, rate-limit
├── middlewares/     # auth, error, validate, async-handler
├── modules/
│   └── <feature>/
│       ├── <feature>.routes.ts
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── <feature>.schema.ts   # Zod schemas
│       └── <feature>.model.ts    # Sequelize model
├── utils/           # helpers, response-builder, logger
├── types/           # interfaces, DTOs, express overrides
└── app.ts           # Express app factory (sin listen)
```

**Regla dura:** Nunca lógica de negocio en rutas ni en controladores; los controladores solo orquestan request → service → response.

---

## 2. Patrones obligatorios

### AsyncHandler wrapper (elimina try-catch repetitivo)
```JavaScript
// middlewares/async-handler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
```

### Response builder
```JavaScript
// utils/response.ts
export const ok = <T>(res: Response, data: T, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, data, message });

export const created = <T>(res: Response, data: T, message = 'Created') =>
  ok(res, data, message, 201);

export const fail = (res: Response, error: string, code = 400) =>
  res.status(code).json({ success: false, error, code });
```

### Error handler centralizado
```JavaScript
// middlewares/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(public message: string, public statusCode = 400) {
    super(message);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      code: 400,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message, code: err.statusCode });
    return;
  }

  logger.error(err);
  res.status(500).json({ success: false, error: 'Internal server error', code: 500 });
};
```

### Validate middleware (Zod)
```JavaScript
// middlewares/validate.ts
import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) return next(result.error);
    req.body = result.data.body ?? req.body;
    next();
  };
```

---

## 3. Estructura de un módulo completo

### Schema (Zod)
```typescript
// modules/user/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>['body'];
```

### Controller
```typescript
// modules/user/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ok, created } from '../../utils/response';
import { CreateUserDTO } from './user.schema';

export class UserController {
  constructor(private readonly userService: UserService) {}

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const data = await this.userService.findAll(Number(page), Number(limit));
    ok(res, data);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateUserDTO = req.body;
    const user = await this.userService.create(dto);
    created(res, user, 'User created');
  });
}
```

### Service
```typescript
// modules/user/user.service.ts
import { sequelize } from '../../config/database';
import { User } from './user.model';
import { AppError } from '../../middlewares/error-handler';
import { CreateUserDTO } from './user.schema';
import bcrypt from 'bcryptjs';

export class UserService {
  async findAll(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return User.findAndCountAll({
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
  }

  async create(dto: CreateUserDTO) {
    const exists = await User.findOne({ where: { email: dto.email } });
    if (exists) throw new AppError('Email already registered', 409);

    const t = await sequelize.transaction();
    try {
      const hash = await bcrypt.hash(dto.password, 12);
      const user = await User.create({ ...dto, password: hash }, { transaction: t });
      await t.commit();
      const { password, ...safe } = user.toJSON();
      return safe;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}
```

### Routes
```typescript
// modules/user/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { validate } from '../../middlewares/validate';
import { createUserSchema } from './user.schema';
import { authenticate } from '../../middlewares/auth';

const router = Router();
const ctrl = new UserController(new UserService());

router.get('/', authenticate, ctrl.getAll);
router.post('/', validate(createUserSchema), ctrl.create);

export default router;
```

---

## 4. Sequelize — reglas estrictas

```typescript
// Siempre: transactions para escrituras múltiples
const t = await sequelize.transaction();
try { /* ops */ await t.commit(); }
catch (e) { await t.rollback(); throw e; }

// Siempre: eager loading para evitar N+1
User.findAll({ include: [{ model: Role, as: 'roles' }] });

// Siempre: limit/offset en listas
User.findAndCountAll({ limit, offset });

// Nunca: SELECT * — usar attributes
User.findAll({ attributes: ['id', 'name', 'email'] });

// Paranoid delete por defecto en modelos sensibles
@Table({ tableName: 'users', paranoid: true })
```

---

## 5. Seguridad

```typescript
// app.ts
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '10kb' })); // prevenir payload bombing
```

### Auth middleware
```typescript
// middlewares/auth.ts
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new AppError('Unauthorized', 401);
  req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  next();
});

export const authorize = (...roles: string[]) =>
  asyncHandler(async (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw new AppError('Forbidden', 403);
    next();
  });
```

---

## 6. HTTP Status Codes

| Situación | Código |
|-----------|--------|
| GET exitoso | 200 |
| POST exitoso (creación) | 201 |
| Sin contenido (DELETE) | 204 |
| Validación fallida | 400 |
| No autenticado | 401 |
| Sin permisos | 403 |
| No encontrado | 404 |
| Conflicto (email duplicado) | 409 |
| Error de servidor | 500 |

---

## 7. Respuesta JSON estándar

```typescript
// Éxito
{ "success": true, "data": {...}, "message": "string" }

// Error
{ "success": false, "error": "string", "code": number }

// Lista paginada
{
  "success": true,
  "data": { "rows": [...], "count": 100 },
  "message": "OK"
}
```

---

## 8. Environment & Config

```typescript
// config/env.ts — validar al arrancar con Zod
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string(),
});

export const env = envSchema.parse(process.env);
// Si falla → proceso termina con error descriptivo al inicio
```

---

## 9. Testing pattern

```typescript
// __tests__/user.test.ts
import request from 'supertest';
import app from '../src/app';

describe('POST /api/users', () => {
  it('returns 201 with valid payload', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test', email: 'test@x.com', password: 'Secret123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('returns 400 with invalid email', async () => {
    const res = await request(app).post('/api/users').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

---

## Referencias rápidas

- Ver `references/sequelize-patterns.md` para queries avanzadas (scopes, hooks, migrations)
- Ver `references/auth-flows.md` para refresh tokens, OAuth2
- Ver `references/performance.md` para caching (Redis), clustering, streaming