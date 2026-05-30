# Chaski Cert App

Plataforma de emisión de certificados digitales en blockchain (Polygon), con gestión de instituciones, usuarios y roles, construida con Next.js 16, Prisma 7 y PostgreSQL.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Base de datos:** PostgreSQL 16 (via Docker)
- **ORM:** Prisma 7 (cliente generado en `app/generated/prisma`)
- **Autenticación:** Sesiones con JWT (`jose`) + bcrypt
- **Estilos:** Tailwind CSS 4
- **Lenguaje:** TypeScript
- **Package manager:** pnpm

## Estructura

```
app/
├── (auth)/                  # Login, forgot-password, reset-password
├── (dashboard)/
│   ├── dashboard/
│   │   ├── institutions/    # CRUD de instituciones (solo ADMIN)
│   │   ├── users/           # CRUD de usuarios (solo ADMIN)
│   │   ├── students/        # Gestión de estudiantes
│   │   └── profile/         # Perfil del usuario
│   └── components/          # Sidebar, dropdown, admin-menu
├── actions/                 # Server actions (auth, usuarios, instituciones)
├── api/auth/                # Route handlers (clear-session)
└── lib/                     # Prisma client, sesión, DAL, email, config
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

## Modelos

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios de la plataforma |
| `Institution` | Universidades e instituciones habilitadas |

## Roles

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Gestión completa: usuarios, instituciones y configuración |
| `UNIVERSITY` | Emisión de certificados vinculado a una institución |

## Requisitos

- Node.js 20+
- pnpm
- Docker y Docker Compose

## Instalación

```bash
# 1. Instalar dependencias (aprobar build scripts la primera vez)
pnpm approve-builds   # seleccionar todos con 'a' y Enter
pnpm install

# 2. Levantar la base de datos
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correspondientes

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Generar el cliente Prisma
pnpm prisma generate

# 6. Poblar la base de datos con datos iniciales
pnpm db:seed
```

## Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://chaskicert:chaskicert_pass@localhost:5432/chaskicert

# Sesión (JWT) — mínimo 32 caracteres, generar con: openssl rand -hex 32
SESSION_SECRET=

# URL pública de la app
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Nombre de la plataforma (aparece en UI, emails y títulos de página)
NEXT_PUBLIC_APP_NAME=NombreDeTuPlataforma

# Email (Gmail con App Password)
GMAIL_USER=tu-cuenta@gmail.com
GMAIL_APP_PASSWORD=       # App Password de Google (no la contraseña de la cuenta)
```

## Comandos

```bash
pnpm dev           # Servidor de desarrollo
pnpm build         # Build de producción
pnpm start         # Servidor de producción

pnpm db:migrate    # Ejecutar migraciones
pnpm db:seed       # Poblar base de datos
pnpm db:reset      # Resetear base de datos (borra todo y re-aplica migraciones + seed)
pnpm db:studio     # Abrir Prisma Studio
```

## Base de datos (Docker)

```bash
docker compose up -d      # Iniciar PostgreSQL
docker compose down       # Detener
docker compose down -v    # Detener y eliminar volúmenes
```

## Seed inicial

Tras correr `pnpm db:seed` se crean los siguientes datos de prueba:

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@chaskicert.com | Admin123! |
| UNIVERSITY (UTPL) | utpl@universidad.edu.ec | University123! |
| UNIVERSITY (UNL) | unl@universidad.edu.ec | University123! |

Instituciones: **UTPL** y **UNL** (Ecuador).
