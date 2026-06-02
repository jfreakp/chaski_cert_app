# Fase 3 (Rediseño) — Proceso de Certificación

## Contexto

El modelo `Event` se reemplaza por `CertificateProcess`. El concepto central deja de ser el evento y pasa a ser la **lista de estudiantes que reciben certificados**. El proceso agrupa un lote de estudiantes, se construye la lista primero (participantes), y luego se generan todos los certificados de una sola vez. Esto también prepara el terreno para el registro en blockchain por lote (Fase 4).

## Modelos

### `CertificateProcess` (renombrado desde `Event`)

```prisma
model CertificateProcess {
  id                String   @id @default(uuid())
  name              String
  description       String?
  date              DateTime
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())

  institutionId     String
  institution       Institution     @relation(fields: [institutionId], references: [id])

  certificateTypeId String
  certificateType   CertificateType @relation(fields: [certificateTypeId], references: [id])

  participants  ProcessParticipant[]
  certificates  Certificate[]
}
```

Cambios respecto a `Event`: se elimina `location`, se renombra la tabla.

### `ProcessParticipant` (nuevo)

```prisma
model ProcessParticipant {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  processId String
  process   CertificateProcess @relation(fields: [processId], references: [id], onDelete: Cascade)

  studentId String
  student   Student            @relation(fields: [studentId], references: [id])

  @@unique([processId, studentId])
}
```

### `Certificate` (actualización)

- Renombrar `eventId` → `processId`
- Relación apunta a `CertificateProcess`

### Relaciones inversas a actualizar

- `Institution` añade `processes CertificateProcess[]`
- `CertificateType` añade `processes CertificateProcess[]`
- `Student` añade `participations ProcessParticipant[]`

## Flujo de estados

```
ProcessParticipant[] (lista en construcción)
         ↓  generateCertificates(processId)
    Certificate (ISSUED, dataHash calculado)
         ↓  Fase 4
    Certificate (REGISTERED, txHash en blockchain)
```

- Participantes se pueden agregar/eliminar libremente antes de generar.
- Una vez generados los certificados, los participantes ya no se pueden eliminar.
- `generateCertificates` es idempotente: si un participante ya tiene certificado, lo omite.

## dataHash

Sin cambios respecto al diseño anterior. Usa `processId` como `eventId` en la función `computeDataHash`. Los campos del hash son los mismos: `id|studentName|studentDni|careerName|eventName|eventDate|issuedAt|institutionName|certificateTypeName` (el campo `eventName` pasa a ser `processName`).

## Páginas y rutas

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/dashboard/processes` | Lista de procesos de certificación | UNIVERSITY |
| `/dashboard/processes/new` | Crear nuevo proceso | UNIVERSITY |
| `/dashboard/processes/[id]/edit` | Editar proceso | UNIVERSITY |
| `/dashboard/processes/[id]` | Detalle: participantes + generar | UNIVERSITY |
| `/dashboard/processes/[id]/participants/new` | Agregar un estudiante | UNIVERSITY |
| `/dashboard/processes/[id]/participants/import` | Importar lista CSV/Excel | UNIVERSITY |
| `/api/certificates/[id]/pdf` | Descarga PDF del certificado | UNIVERSITY |

## Flujo UX del detalle del proceso

```
/dashboard/processes/[id]
  ├── Header: nombre, tipo, fecha, descripción
  ├── Botones: [Agregar estudiante] [Importar CSV]
  ├── Tabla de participantes
  │     └── Columnas: Nombre, DNI, Carrera, Fecha ingreso, [Eliminar]
  ├── [Generar Certificados] (habilitado si hay participantes sin certificado)
  └── Tabla de certificados (visible tras generar)
        └── Columnas: Nombre, DNI, Estado, Fecha emisión, [PDF]
```

## Server actions (`app/actions/processes.ts`)

- `createProcess(state, formData)` — crea proceso, requireInstitution + UNIVERSITY
- `updateProcess(id, state, formData)` — edita proceso
- `toggleProcessStatus(id)` — activa/desactiva
- `deleteProcess(id)` — elimina si no tiene certificados generados
- `addParticipant(processId, state, formData)` — agrega un estudiante por studentId
- `removeParticipant(id)` — elimina participante (solo si el proceso no tiene certificados)
- `importParticipants(processId, state, formData)` — procesa CSV: por cada fila con DNI+Nombre, upsert Student, upsert StudentEnrollment, agrega ProcessParticipant
- `generateCertificates(processId)` — por cada participante sin certificado: crea Certificate (ISSUED) con dataHash

## CSV import

Columnas del archivo:
| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| `DNI` | ✅ | Cédula de identidad — clave única |
| `Nombre` | ✅ si el estudiante no existe | Nombre completo |
| `Email` | ❌ | Correo electrónico |

Lógica:
1. Por cada fila: buscar Student por `dni`
2. Si existe → usar el existente
3. Si no existe → crear Student con `name` + `dni` + `email?`
4. Upsert `StudentEnrollment` (institutionId del proceso, careerId null)
5. Upsert `ProcessParticipant` (ignorar duplicados)
6. Reportar: creados, vinculados, errores

## Migración de DB

1. Renombrar tabla `Event` → `CertificateProcess`
2. Eliminar columna `location` de `CertificateProcess`
3. Renombrar columna `eventId` → `processId` en `Certificate`
4. Crear tabla `ProcessParticipant`
5. Actualizar relaciones inversas

## Cambios de navegación

- Sidebar: reemplazar link "Eventos" (`/dashboard/events`, icono `CalendarDays`) por "Procesos" (`/dashboard/processes`, icono `ClipboardList` o `FileText`)
- `proxy.ts`: reemplazar rutas `/dashboard/events/new` por `/dashboard/processes/new` y `/dashboard/processes/*/participants/new` y `/dashboard/processes/*/participants/import` en `universityRoutes`

## Archivos eliminados

- `app/(dashboard)/dashboard/events/` (todo el directorio)
- `app/actions/events.ts`

## Archivos nuevos / modificados

| Acción | Archivo |
|--------|---------|
| Crear | `app/actions/processes.ts` |
| Crear | `app/(dashboard)/dashboard/processes/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/process-table.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/new/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/new/process-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participant-table.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/new/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/new/participant-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/import/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/import/import-form.tsx` |
| Modificar | `prisma/schema.prisma` |
| Modificar | `app/lib/certificate-hash.ts` |
| Modificar | `app/(dashboard)/layout.tsx` |
| Modificar | `proxy.ts` |

## Fuera de alcance

- Registro en blockchain (Fase 4)
- Verificación pública de certificados (Fase 4)
- No se modifican los archivos de admin (certificate-types, institutions, users)
