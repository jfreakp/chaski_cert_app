# Portal del Estudiante — Spec de Diseño

**Fecha:** 2026-06-03
**Feature:** Portal receptor para estudiantes con magic link

---

## Objetivo

Dar a los estudiantes un portal propio donde puedan ver y descargar sus certificados emitidos, sin depender de que alguien les pase el link de verificación individualmente.

---

## Autenticación — Magic Link (JWT stateless)

### Flujo

1. Estudiante va a `/portal/login` e ingresa su email.
2. Server action `sendMagicLink(email)`:
   - Busca `Student` por email.
   - Responde siempre con el mismo mensaje genérico ("Si tu email está registrado, recibirás un link") — no revela si el email existe.
   - Si existe: genera JWT con payload `{ studentId, email, type: 'magic-link' }`, firmado con `SESSION_SECRET`, expiración configurable via `MAGIC_LINK_MINUTES` (default 15).
   - Envía email con link a `/portal/login/verify?token=<jwt>`.
3. Page server en `/portal/login/verify`:
   - Extrae y valida el JWT (firma + expiración + `type === 'magic-link'`).
   - Si inválido/expirado: muestra error "El link expiró o es inválido. Solicitá uno nuevo."
   - Si válido: llama `createStudentSession(studentId, email, name)`, redirect a `/portal`.
4. Sesión: cookie `student-session` con JWT de duración configurable via `STUDENT_SESSION_DAYS` (default 7). Payload: `{ studentId, email, name, role: 'STUDENT' }`.
5. Al cerrar sesión: elimina cookie `student-session`, redirect a `/portal/login`.

### Re-ingreso

- Dentro del período de sesión activa: el estudiante accede a `/portal` directamente (la cookie lo autentica).
- Sesión expirada o cerrada: repite el flujo desde el paso 1.

### Variables de entorno

```env
STUDENT_SESSION_DAYS=7     # duración de la cookie de sesión del estudiante
MAGIC_LINK_MINUTES=15      # tiempo de vida del JWT del magic link
```

Ambas con defaults en código si no están definidas.

---

## Modelo de datos

### Student.email — pasa a requerido

`email String?` → `email String`

**Migration:**
```sql
ALTER TABLE "Student" ALTER COLUMN "email" SET NOT NULL;
```

Precondición: todos los registros existentes deben tener email antes de aplicar la migración. El seed ya cumple esto.

**Impacto en formularios:** los forms de crear/editar estudiante pasan a requerir email en validación (Zod).

---

## Rutas

```
app/
├── (portal)/
│   ├── layout.tsx                    # Header: nombre del estudiante + "Cerrar sesión"
│   └── portal/
│       ├── login/
│       │   ├── page.tsx              # Formulario de email
│       │   └── verify/
│       │       └── page.tsx          # Valida token → crea sesión → redirect
│       ├── page.tsx                  # Lista de certificados
│       └── profile/
│           └── page.tsx              # Perfil (solo lectura)
app/lib/
└── student-session.ts                # createStudentSession / getStudentSession / deleteStudentSession
app/actions/
└── student-portal.ts                 # sendMagicLink, getMyCertificates, getMyProfile
```

El grupo de ruta `(portal)` es completamente independiente de `(dashboard)` — sin sidebar, sin menú admin.

---

## Páginas del portal

### `/portal/login`
- Campo email + botón "Enviar link de acceso".
- Tras enviar: mensaje "Si tu email está registrado, recibirás un link en los próximos minutos." (sin distinción entre email existente/inexistente).
- Si ya tiene sesión activa: redirect directo a `/portal`.

### `/portal/login/verify`
- Page server component: lee `?token` de searchParams, valida, crea sesión, redirect.
- No renderiza UI propia — solo redirige o muestra error con link a `/portal/login`.

### `/portal` (home — lista de certificados)
- Muestra todos los certificados del estudiante con `status IN (ISSUED, REGISTERED)`.
- Cada certificado muestra: institución, tipo, nombre del proceso, fecha de emisión, estado.
- **Botón "Descargar PDF"** → `GET /api/certificates/[id]/pdf` (autenticado con `student-session`).
- **Botón "Copiar link"** → copia `NEXT_PUBLIC_APP_URL/verify/[id]` al clipboard (client component).
- Si no tiene certificados: mensaje "Aún no tenés certificados emitidos."

### `/portal/profile`
- Muestra nombre, DNI, email del estudiante autenticado — solo lectura.
- Sin formulario de edición. El email lo gestiona la institución desde el dashboard.

---

## Protección de rutas

- `app/lib/student-session.ts` expone `requireStudentSession()`: lee cookie `student-session`, si no existe o expiró hace redirect a `/portal/login`.
- Todas las páginas del portal (excepto `/portal/login` y `/portal/login/verify`) llaman `requireStudentSession()`.
- `GET /api/certificates/[id]/pdf`: acepta tanto sesión de usuario (ADMIN/UNIVERSITY) como `student-session`. El estudiante solo puede descargar sus propios certificados.

---

## Servicio de email

Reutiliza la infraestructura existente (`GMAIL_USER` / `GMAIL_APP_PASSWORD`). La función `sendMagicLink` llama al servicio de email existente con un template simple: asunto "Tu link de acceso a [APP_NAME]" + el link.

---

## Archivos modificados / creados

| Acción | Archivo |
|--------|---------|
| Crear | `app/(portal)/layout.tsx` |
| Crear | `app/(portal)/portal/login/page.tsx` |
| Crear | `app/(portal)/portal/login/verify/page.tsx` |
| Crear | `app/(portal)/portal/page.tsx` |
| Crear | `app/(portal)/portal/profile/page.tsx` |
| Crear | `app/lib/student-session.ts` |
| Crear | `app/actions/student-portal.ts` |
| Modificar | `app/api/certificates/[id]/pdf/route.ts` |
| Modificar | `prisma/schema.prisma` (email requerido) |
| Crear | `prisma/migrations/20260603000000_student_email_required/migration.sql` |
| Modificar | `app/actions/students.ts` (email requerido en Zod) |
| Modificar | Formularios de crear/editar estudiante (email pasa a required visualmente) |
| Modificar | `README.md` (nuevas vars de entorno + ruta del portal) |
