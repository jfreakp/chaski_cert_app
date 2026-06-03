# Auditoría de Operaciones — Spec de Diseño

**Fecha:** 2026-06-03

---

## Objetivo

Registrar quién hizo qué y cuándo en las operaciones críticas de la plataforma, visible solo para ADMIN desde `/dashboard/audit`.

---

## Modelo de datos

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String
  entityType String
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())

  userId String?
  user   User?   @relation(fields: [userId], references: [id])
}
```

Migration: `prisma/migrations/20260603000002_add_audit_log/migration.sql`

---

## Eventos auditados

| `action` | `entityType` | Disparado en | `metadata` |
|----------|-------------|-------------|-----------|
| `CERTIFICATES_ISSUED` | `CertificateProcess` | `generateCertificates` | `{ processId, processName, count }` |
| `BLOCKCHAIN_REGISTERED` | `CertificateProcess` | `markCertificatesRegistered` | `{ processId, txHash, count }` |
| `STUDENT_CREATED` | `Student` | `createStudent` | `{ studentName, studentDni }` |
| `STUDENT_UPDATED` | `Student` | `updateStudent` | `{ studentName, studentDni }` |
| `USER_LOGIN` | `User` | `login` | `{ email }` |

- `entityId`: processId para eventos de certificado, studentId para estudiante, userId para login.
- `userId`: ID del usuario autenticado. Para `USER_LOGIN` se guarda el ID del usuario que acaba de autenticarse.

---

## Función utilitaria

**Archivo:** `app/lib/audit.ts`

```ts
import 'server-only'
import { prisma } from './prisma'

interface AuditLogData {
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
  userId?: string
}

export function createAuditLog(data: AuditLogData): void {
  // fire-and-forget — no await, no bloquear el server action
  prisma.auditLog.create({ data }).catch(() => {})
}
```

---

## Instrumentación de server actions

### `app/actions/processes.ts`

En `generateCertificates`, agregar un contador `let newCount = 0` antes del loop e incrementar con `newCount++` después de cada `prisma.certificate.create`. Después del loop, antes de `revalidatePath`:
```ts
createAuditLog({
  action: 'CERTIFICATES_ISSUED',
  entityType: 'CertificateProcess',
  entityId: processId,
  metadata: { processId, processName: proc.name, count: newCount },
  userId: session.userId,
})
```

En `markCertificatesRegistered`, después del `updateMany` exitoso:
```ts
createAuditLog({
  action: 'BLOCKCHAIN_REGISTERED',
  entityType: 'CertificateProcess',
  entityId: processId,
  metadata: { processId, txHash, count: registered.length },
  userId: session.userId,
})
```
`registered.length` se obtiene del array que ya se consulta para enviar emails.

### `app/actions/students.ts`

En `createStudent`, agregar `const session = await verifySession()` al inicio (el resultado de `getInstitutionId()` ya lo llama internamente con cache, sin doble query). Luego, antes del `redirect`:
```ts
createAuditLog({
  action: 'STUDENT_CREATED',
  entityType: 'Student',
  entityId: student.id,
  metadata: { studentName: name, studentDni: dni },
  userId: session.userId,
})
```

En `updateStudent`, cambiar `await verifySession()` por `const session = await verifySession()` al inicio. Antes del `return { success: true }`:
```ts
createAuditLog({
  action: 'STUDENT_UPDATED',
  entityType: 'Student',
  entityId: enrollment.studentId,
  metadata: { studentName: name, studentDni: dni },
  userId: session.userId,
})
```

### `app/actions/auth.ts`

En `login`, después de `createSession`:
```ts
createAuditLog({
  action: 'USER_LOGIN',
  entityType: 'User',
  entityId: user.id,
  metadata: { email },
  userId: user.id,
})
```

---

## Página de auditoría

**Ruta:** `app/(dashboard)/dashboard/audit/page.tsx`

- Solo accesible para ADMIN (redirigir si `role !== 'ADMIN'`)
- Tabla con columnas: **Fecha/hora**, **Acción**, **Usuario**, **Detalles**
- 50 registros por página, ordenados por `createdAt DESC`
- Paginación via `?page=N` en la URL (query param)
- Sin filtros por ahora

Formato de "Detalles" por acción:
- `CERTIFICATES_ISSUED`: `N certificados — <processName>`
- `BLOCKCHAIN_REGISTERED`: `txHash corto (primeros 10 chars) — N certs`
- `STUDENT_CREATED` / `STUDENT_UPDATED`: `<studentName> (DNI: <dni>)`
- `USER_LOGIN`: `<email>`

---

## Navegación

En `app/(dashboard)/components/admin-menu.tsx`, agregar a `adminLinks`:
```ts
{ href: '/dashboard/audit', icon: ScrollText, label: 'Auditoría' },
```

---

## Archivos modificados/creados

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` |
| Crear | `prisma/migrations/20260603000002_add_audit_log/migration.sql` |
| Crear | `app/lib/audit.ts` |
| Modificar | `app/actions/processes.ts` |
| Modificar | `app/actions/students.ts` |
| Modificar | `app/actions/auth.ts` |
| Crear | `app/(dashboard)/dashboard/audit/page.tsx` |
| Modificar | `app/(dashboard)/components/admin-menu.tsx` |
