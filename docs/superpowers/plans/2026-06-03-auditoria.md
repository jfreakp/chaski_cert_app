# Auditoría de Operaciones — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar en una tabla `AuditLog` las operaciones críticas de la plataforma y mostrarlas en `/dashboard/audit` solo para ADMIN.

**Architecture:** Nueva tabla Prisma con función utilitaria `createAuditLog` (fire-and-forget). Se instrumentan 5 server actions existentes. Página de auditoría como Server Component con paginación de 50 registros.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Tailwind CSS 4.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

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

---

## Task 1: Schema + Migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260603000002_add_audit_log/migration.sql`

- [ ] **Paso 1: Agregar modelo AuditLog a schema.prisma**

Agregar antes del modelo `User`:

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

- [ ] **Paso 2: Agregar relación auditLogs al modelo User**

En el modelo `User`, agregar después de `issuedCertificates Certificate[]`:

```prisma
  auditLogs  AuditLog[]
```

- [ ] **Paso 3: Crear migración**

```bash
mkdir -p prisma/migrations/20260603000002_add_audit_log
```

Crear `prisma/migrations/20260603000002_add_audit_log/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Paso 4: Aplicar migración y regenerar cliente**

```bash
pnpm prisma migrate deploy && pnpm prisma generate
```

Salida esperada: `Your database is now in sync with your schema.`

- [ ] **Paso 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Salida esperada: sin errores.

---

## Task 2: Crear app/lib/audit.ts

**Files:**
- Create: `app/lib/audit.ts`

- [ ] **Paso 1: Crear el archivo**

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
  prisma.auditLog.create({ data }).catch(() => {})
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "audit" | head -5
```

Salida esperada: sin errores.

---

## Task 3: Instrumentar processes.ts

**Files:**
- Modify: `app/actions/processes.ts`

- [ ] **Paso 1: Agregar import de createAuditLog**

En el bloque de imports al inicio del archivo, agregar:

```ts
import { createAuditLog } from '@/app/lib/audit'
```

- [ ] **Paso 2: Agregar contador y audit call en generateCertificates**

Reemplazar la función `generateCertificates` completa:

```ts
export async function generateCertificates(processId: string) {
  const { session, institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    include: {
      institution:     { select: { name: true } },
      certificateType: { select: { name: true } },
    },
  })
  if (!proc || proc.institutionId !== institutionId) return

  const participants = await prisma.processParticipant.findMany({
    where: { processId },
    include: { student: { select: { name: true, dni: true } } },
  })

  let newCount = 0

  for (const p of participants) {
    const existing = await prisma.certificate.findUnique({
      where: { processId_studentId: { processId, studentId: p.studentId } },
    })
    if (existing) continue

    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { studentId_institutionId: { studentId: p.studentId, institutionId: institutionId! } },
      include: { career: { select: { name: true } } },
    })

    const issuedAt = new Date()
    const id       = crypto.randomUUID()
    const dataHash = computeDataHash({
      id,
      studentName:         p.student.name,
      studentDni:          p.student.dni,
      careerName:          enrollment?.career?.name ?? null,
      processName:         proc.name,
      processDate:         proc.date,
      issuedAt,
      institutionName:     proc.institution.name,
      certificateTypeName: proc.certificateType.name,
    })

    await prisma.certificate.create({
      data: {
        id,
        status: 'ISSUED',
        dataHash,
        issuedAt,
        processId,
        studentId:  p.studentId,
        careerId:   enrollment?.careerId ?? null,
        issuedById: session.userId,
      },
    })

    newCount++
  }

  createAuditLog({
    action: 'CERTIFICATES_ISSUED',
    entityType: 'CertificateProcess',
    entityId: processId,
    metadata: { processId, processName: proc.name, count: newCount },
    userId: session.userId,
  })

  revalidatePath(`/dashboard/processes/${processId}`)
}
```

- [ ] **Paso 3: Agregar audit call en markCertificatesRegistered**

Reemplazar la función `markCertificatesRegistered` completa:

```ts
export async function markCertificatesRegistered(processId: string, txHash: string): Promise<{ message?: string }> {
  const { session } = await requireInstitution()
  if (session.role !== 'ADMIN') return { message: 'Solo administradores.' }

  try {
    await prisma.certificate.updateMany({
      where: { processId, status: 'ISSUED' },
      data: { status: 'REGISTERED', txHash, registeredAt: new Date() },
    })
  } catch {
    return { message: `Transacción confirmada (${txHash}) pero falló la actualización en DB. Guardá este txHash.` }
  }

  const registered = await prisma.certificate.findMany({
    where: { processId, txHash },
    include: {
      student: { select: { name: true, email: true } },
      process: {
        include: {
          institution:     { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const isAmoy         = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
  const polygonscanUrl = isAmoy
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`

  createAuditLog({
    action: 'BLOCKCHAIN_REGISTERED',
    entityType: 'CertificateProcess',
    entityId: processId,
    metadata: { processId, txHash, count: registered.length },
    userId: session.userId,
  })

  await Promise.allSettled(
    registered.map(cert =>
      sendCertificateRegisteredEmail(cert.student.email, cert.student.name, {
        certificateTypeName: cert.process.certificateType.name,
        processName:         cert.process.name,
        institutionName:     cert.process.institution.name,
        portalUrl:           `${appUrl}/portal`,
        polygonscanUrl,
      })
    )
  )

  revalidatePath(`/dashboard/processes/${processId}`)
  return {}
}
```

- [ ] **Paso 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "processes.ts" | head -5
```

Salida esperada: sin errores.

---

## Task 4: Instrumentar students.ts

**Files:**
- Modify: `app/actions/students.ts`

- [ ] **Paso 1: Agregar import de createAuditLog**

```ts
import { createAuditLog } from '@/app/lib/audit'
```

- [ ] **Paso 2: Capturar session y agregar audit en createStudent**

Reemplazar la función `createStudent` completa:

```ts
export async function createStudent(
  state: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session      = await verifySession()
  const institutionId = await getInstitutionId()
  const careerId = (formData.get('careerId') as string) || null

  const validated = StudentSchema.safeParse({
    name:  formData.get('name'),
    dni:   formData.get('dni'),
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; dni?: string[]; email?: string[] } }
  }

  const { name, dni, email } = validated.data

  const student = await prisma.student.upsert({
    where: { dni },
    update: { name, email },
    create: { name, dni, email },
  })

  const existing = await prisma.studentEnrollment.findUnique({
    where: { studentId_institutionId: { studentId: student.id, institutionId } },
  })

  if (existing) {
    return { errors: { dni: ['Este estudiante ya está matriculado en tu institución.'] } }
  }

  await prisma.studentEnrollment.create({
    data: { studentId: student.id, institutionId, careerId: careerId || null },
  })

  createAuditLog({
    action: 'STUDENT_CREATED',
    entityType: 'Student',
    entityId: student.id,
    metadata: { studentName: name, studentDni: dni },
    userId: session.userId,
  })

  revalidatePath('/dashboard/students')
  redirect('/dashboard/students')
}
```

- [ ] **Paso 3: Capturar session y agregar audit en updateStudent**

Reemplazar la función `updateStudent` completa:

```ts
export async function updateStudent(
  enrollmentId: string,
  state: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session = await verifySession()
  const careerId = (formData.get('careerId') as string) || null

  const validated = StudentSchema.safeParse({
    name:  formData.get('name'),
    dni:   formData.get('dni'),
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; dni?: string[]; email?: string[] } }
  }

  const { name, dni, email } = validated.data

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { studentId: true },
  })
  if (!enrollment) return { message: 'Matrícula no encontrada.' }

  const existing = await prisma.student.findUnique({ where: { dni } })
  if (existing && existing.id !== enrollment.studentId) {
    return { errors: { dni: ['Esta cédula ya pertenece a otro estudiante.'] } }
  }

  await Promise.all([
    prisma.student.update({
      where: { id: enrollment.studentId },
      data: { name, dni, email },
    }),
    prisma.studentEnrollment.update({
      where: { id: enrollmentId },
      data: { careerId: careerId || null },
    }),
  ])

  createAuditLog({
    action: 'STUDENT_UPDATED',
    entityType: 'Student',
    entityId: enrollment.studentId,
    metadata: { studentName: name, studentDni: dni },
    userId: session.userId,
  })

  revalidatePath('/dashboard/students')
  return { success: true }
}
```

- [ ] **Paso 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "students.ts" | head -5
```

Salida esperada: sin errores.

---

## Task 5: Instrumentar auth.ts (USER_LOGIN)

**Files:**
- Modify: `app/actions/auth.ts`

- [ ] **Paso 1: Agregar import de createAuditLog**

```ts
import { createAuditLog } from '@/app/lib/audit'
```

- [ ] **Paso 2: Agregar audit call en login después de createSession**

En la función `login`, reemplazar las últimas líneas del bloque exitoso:

```ts
  await createSession(user.id, user.role, user.email, user.name)

  createAuditLog({
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    metadata: { email },
    userId: user.id,
  })

  redirect('/dashboard')
```

- [ ] **Paso 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "auth.ts" | head -5
```

Salida esperada: sin errores.

---

## Task 6: Página de auditoría + link en AdminMenu

**Files:**
- Create: `app/(dashboard)/dashboard/audit/page.tsx`
- Modify: `app/(dashboard)/components/admin-menu.tsx`

- [ ] **Paso 1: Crear la página de auditoría**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata = { title: `${PROJECT_NAME} — Auditoría` }

const PAGE_SIZE = 50

const actionLabels: Record<string, string> = {
  CERTIFICATES_ISSUED:   'Emisión',
  BLOCKCHAIN_REGISTERED: 'Blockchain',
  STUDENT_CREATED:       'Estudiante creado',
  STUDENT_UPDATED:       'Estudiante editado',
  USER_LOGIN:            'Login',
}

const actionColors: Record<string, string> = {
  CERTIFICATES_ISSUED:   'bg-emerald-50 text-emerald-700',
  BLOCKCHAIN_REGISTERED: 'bg-blue-50 text-blue-700',
  STUDENT_CREATED:       'bg-amber-50 text-amber-700',
  STUDENT_UPDATED:       'bg-orange-50 text-orange-700',
  USER_LOGIN:            'bg-surface-container text-secondary',
}

function formatDetails(action: string, metadata: unknown): string {
  const m = metadata as Record<string, unknown> | null
  if (!m) return '—'
  switch (action) {
    case 'CERTIFICATES_ISSUED':
      return `${m.count} certificado(s) — ${m.processName}`
    case 'BLOCKCHAIN_REGISTERED':
      return `${String(m.txHash).slice(0, 10)}… — ${m.count} cert(s)`
    case 'STUDENT_CREATED':
    case 'STUDENT_UPDATED':
      return `${m.studentName} (DNI: ${m.studentDni})`
    case 'USER_LOGIN':
      return `${m.email}`
    default:
      return '—'
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') redirect('/dashboard')

  const { page: pageParam } = await searchParams
  const page  = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip  = (page - 1) * PAGE_SIZE

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.count(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Administración
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter flex items-center gap-3">
          <ScrollText size={32} strokeWidth={1.5} />
          Auditoría
        </h1>
        <p className="text-secondary mt-2 text-sm">{total} operaciones registradas</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-lowest">
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Acción</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Usuario</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-secondary">
                  No hay operaciones registradas aún.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4 text-xs text-secondary whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${actionColors[log.action] ?? 'bg-surface-container text-secondary'}`}>
                    {actionLabels[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden md:table-cell">
                  {log.user?.name ?? log.user?.email ?? '—'}
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell font-mono text-xs">
                  {formatDetails(log.action, log.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-secondary">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/audit?page=${page - 1}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-secondary hover:text-on-surface bg-white border border-surface-container rounded-lg transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={2} />
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/audit?page=${page + 1}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-secondary hover:text-on-surface bg-white border border-surface-container rounded-lg transition-colors"
              >
                Siguiente
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Agregar link de Auditoría en AdminMenu**

Reemplazar el array `adminLinks` en `app/(dashboard)/components/admin-menu.tsx`:

```ts
import { ShieldCheck, Users, Building2, BadgeCheck, ChevronDown, ScrollText } from 'lucide-react'

const adminLinks = [
  { href: '/dashboard/institutions', icon: Building2, label: 'Instituciones' },
  { href: '/dashboard/users', icon: Users, label: 'Usuarios' },
  { href: '/dashboard/certificate-types', icon: BadgeCheck, label: 'Tipos de Certificado' },
  { href: '/dashboard/audit', icon: ScrollText, label: 'Auditoría' },
]
```

- [ ] **Paso 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Salida esperada: sin errores.

---

## Verificación final

- [ ] `pnpm dev`
- [ ] Iniciar sesión como ADMIN → sidebar muestra "Auditoría" bajo Administración
- [ ] Ir a `/dashboard/audit` → tabla vacía inicialmente
- [ ] Hacer login nuevamente → aparece registro `USER_LOGIN`
- [ ] Crear o editar un estudiante → aparece `STUDENT_CREATED` o `STUDENT_UPDATED`
- [ ] Emitir certificados en un proceso → aparece `CERTIFICATES_ISSUED` con el count correcto
- [ ] Como UNIVERSITY, intentar acceder a `/dashboard/audit` → redirige a `/dashboard`
