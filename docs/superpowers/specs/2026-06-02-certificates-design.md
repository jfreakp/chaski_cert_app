# Fase 3 — Certificados

## Contexto

Completar la Fase 3 añadiendo la emisión de certificados dentro de un evento. Un certificado vincula un estudiante a un evento y genera un PDF descargable. El `dataHash` (SHA-256) se precalcula al emitir el certificado y se usará en Fase 4 para el registro en blockchain.

## Modelo

```prisma
model Certificate {
  id        String            @id @default(uuid())
  status    CertificateStatus @default(PENDING)
  dataHash  String            @unique
  issuedAt  DateTime?
  createdAt DateTime          @default(now())

  eventId    String
  event      Event             @relation(fields: [eventId], references: [id])

  studentId  String
  student    Student           @relation(fields: [studentId], references: [id])

  careerId   String?
  career     Career?           @relation(fields: [careerId], references: [id])

  issuedById String
  issuedBy   User              @relation(fields: [issuedById], references: [id])

  @@unique([eventId, studentId])
}

enum CertificateStatus {
  PENDING
  ISSUED
  REGISTERED
}
```

### Relaciones a actualizar

- `Event` añade `certificates Certificate[]`
- `Student` añade `certificates Certificate[]`
- `Career` añade `certificates Certificate[]`
- `User` añade `issuedCertificates Certificate[]`

## dataHash

SHA-256 de la concatenación canónica:

```
{certificate.id}|{student.name}|{student.dni}|{career.name}|{event.name}|{event.date.toISOString()}|{issuedAt.toISOString()}|{institution.name}|{certificateType.name}
```

`career.name` se reemplaza por cadena vacía si `careerId` es null.

## Flujo de estados

```
PENDING  →  ISSUED  →  REGISTERED
           (PDF)       (Blockchain — Fase 4)
```

- `PENDING`: certificado creado, aún sin PDF generado.
- `ISSUED`: PDF generado, `issuedAt` y `dataHash` calculados.
- `REGISTERED`: registrado en Polygon (Fase 4).

## Páginas y rutas

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/dashboard/events/[id]` | Detalle del evento + tabla de certificados | UNIVERSITY |
| `/dashboard/events/[id]/certificates/new` | Emitir certificado a un estudiante | UNIVERSITY |
| `/api/certificates/[id]/pdf` | Genera y descarga PDF | UNIVERSITY |

## Acceso y seguridad

- Solo el usuario UNIVERSITY cuya institución es dueña del evento puede crear/ver certificados del evento.
- `requireInstitution()` en todas las server actions y route handlers.
- El selector de estudiantes muestra solo los matriculados en la institución del usuario.

## Server actions (`app/actions/certificates.ts`)

- `createCertificate(state, formData)` — crea el certificado en estado PENDING, calcula `dataHash` con `issuedAt = now()` y actualiza a ISSUED.
- `deleteCertificate(id)` — solo si status es PENDING o ISSUED (no REGISTERED).

## PDF (`app/api/certificates/[id]/pdf/route.ts`)

- Genera HTML con los datos del certificado y lo convierte a PDF.
- Datos: nombre estudiante, DNI, carrera, nombre evento, fecha, institución, tipo de certificado, ID del certificado.

## Migración

Una migración Prisma que añade la tabla `Certificate` y el enum `CertificateStatus`.

## Fuera de alcance (Fase 4)

- Registro en blockchain (Polygon / MetaMask).
- `BlockchainRecord` model (se añade al schema en Fase 4).
- Página pública de verificación `/verify/[id]`.
