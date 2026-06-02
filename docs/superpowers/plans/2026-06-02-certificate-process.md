# Proceso de Certificación — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo `Event` por `CertificateProcess`, centrar la UI en la lista de estudiantes (participantes), y generar certificados en bulk desde el proceso.

**Architecture:** Se renombra `Event` → `CertificateProcess` en schema y código. Se agrega `ProcessParticipant` como lista previa a la generación de certificados. Las acciones de certificados pasan de one-by-one a bulk via `generateCertificates`. La importación CSV crea estudiantes por DNI si no existen.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod 4, Tailwind CSS 4, TypeScript.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` |
| Eliminar | `app/(dashboard)/dashboard/events/` (directorio completo) |
| Eliminar | `app/actions/events.ts` |
| Eliminar | `app/actions/certificates.ts` |
| Modificar | `app/lib/certificate-hash.ts` |
| Modificar | `app/api/certificates/[id]/pdf/route.ts` |
| Crear | `app/actions/processes.ts` |
| Modificar | `app/(dashboard)/layout.tsx` |
| Modificar | `proxy.ts` |
| Crear | `app/(dashboard)/dashboard/processes/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/process-table.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/new/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/new/process-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participant-table.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/new/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/new/participant-form.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/import/page.tsx` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/participants/import/import-form.tsx` |

---

## Task 1: Schema Prisma + Migración

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Paso 1: Reemplazar el modelo `Event` por `CertificateProcess` en schema.prisma**

Eliminar el modelo `Event` completo y reemplazarlo con:

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

- [ ] **Paso 2: Agregar modelo `ProcessParticipant`**

Agregar después de `CertificateProcess`:

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

- [ ] **Paso 3: Actualizar modelo `Certificate` — reemplazar `eventId` por `processId`**

Reemplazar en `Certificate`:
```prisma
  eventId    String
  event      Event            @relation(fields: [eventId], references: [id])
```
por:
```prisma
  processId  String
  process    CertificateProcess @relation(fields: [processId], references: [id])
```

Y reemplazar el constraint único:
```prisma
  @@unique([eventId, studentId])
```
por:
```prisma
  @@unique([processId, studentId])
```

- [ ] **Paso 4: Actualizar relaciones inversas**

En `Institution`: reemplazar `events Event[]` por `processes CertificateProcess[]`

En `CertificateType`: reemplazar `events Event[]` por `processes CertificateProcess[]`

En `Student`: reemplazar `certificates Certificate[]` por:
```prisma
  participations ProcessParticipant[]
  certificates   Certificate[]
```

En `Career`: `certificates Certificate[]` se mantiene igual.

En `User`: `issuedCertificates Certificate[]` se mantiene igual.

- [ ] **Paso 5: Resetear la base de datos y aplicar el nuevo schema**

```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="si" pnpm db:reset
```

Salida esperada: migraciones aplicadas + seed ejecutado sin errores.

- [ ] **Paso 6: Verificar cliente Prisma**

```bash
node -e "const p = require('./app/generated/prisma'); console.log(Object.keys(p).filter(k => k.includes('ertificate') || k.includes('rocess')));"
```

Salida esperada incluye: `CertificateStatus`, `CertificateProcess`, `ProcessParticipant`, etc.

---

## Task 2: Actualizar certificate-hash.ts y pdf/route.ts

**Files:**
- Modify: `app/lib/certificate-hash.ts`
- Modify: `app/api/certificates/[id]/pdf/route.ts`

- [ ] **Paso 1: Renombrar `eventName` → `processName` en CertHashInput**

Reemplazar el contenido completo de `app/lib/certificate-hash.ts`:

```ts
import { createHash } from 'crypto'

export interface CertHashInput {
  id: string
  studentName: string
  studentDni: string
  careerName: string | null
  processName: string
  processDate: Date
  issuedAt: Date
  institutionName: string
  certificateTypeName: string
}

export function computeDataHash(input: CertHashInput): string {
  const canonical = [
    input.id,
    input.studentName,
    input.studentDni,
    input.careerName ?? '',
    input.processName,
    input.processDate.toISOString(),
    input.issuedAt.toISOString(),
    input.institutionName,
    input.certificateTypeName,
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}
```

- [ ] **Paso 2: Actualizar pdf/route.ts — reemplazar `eventId` por `processId`**

Reemplazar el contenido completo de `app/api/certificates/[id]/pdf/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { generateCertificatePdf } from '@/app/lib/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  if (!cert) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  const pdfBytes = await generateCertificatePdf({
    id: cert.id,
    studentName: cert.student.name,
    studentDni: cert.student.dni,
    careerName: cert.career?.name ?? null,
    eventName: cert.process.name,
    eventDate: cert.process.date,
    institutionName: cert.process.institution.name,
    certificateTypeName: cert.process.certificateType.name,
    issuedAt: cert.issuedAt ?? cert.createdAt,
  })

  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const filename = `certificado-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

---

## Task 3: Eliminar código de eventos

**Files:**
- Delete: `app/(dashboard)/dashboard/events/` (directorio completo)
- Delete: `app/actions/events.ts`

- [ ] **Paso 1: Eliminar el directorio de eventos**

```bash
rm -rf "app/(dashboard)/dashboard/events"
```

- [ ] **Paso 2: Eliminar archivos de acciones obsoletas**

```bash
rm "app/actions/events.ts"
rm "app/actions/certificates.ts"
```

`certificates.ts` se elimina porque `createCertificate` y `deleteCertificate` son reemplazados por `generateCertificates` y `removeParticipant` en `processes.ts`. No hay referencias externas a estos archivos una vez eliminado el directorio de events.

- [ ] **Paso 3: Verificar que no quedan referencias rotas**

```bash
grep -r "from.*actions/events\|from.*actions/certificates\|from.*dashboard/events\|prisma\.event\b" app/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || echo "Sin referencias"
```

Salida esperada: `Sin referencias`

---

## Task 4: Server actions — app/actions/processes.ts

**Files:**
- Create: `app/actions/processes.ts`

- [ ] **Paso 1: Crear el archivo completo**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { computeDataHash } from '@/app/lib/certificate-hash'

// ── CRUD ─────────────────────────────────────────────────────────────────────

const ProcessSchema = z.object({
  name:              z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  description:       z.string().trim().optional(),
  date:              z.string().min(1, { error: 'La fecha es requerida.' }),
  certificateTypeId: z.string().min(1, { error: 'Selecciona un tipo de certificado.' }),
})

type ProcessFormState =
  | { errors?: { name?: string[]; description?: string[]; date?: string[]; certificateTypeId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createProcess(state: ProcessFormState, formData: FormData): Promise<ProcessFormState> {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') return { message: 'Solo universidades pueden crear procesos.' }

  const validated = ProcessSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    certificateTypeId: formData.get('certificateTypeId'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as ProcessFormState['errors'] }

  await prisma.certificateProcess.create({
    data: {
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      certificateTypeId: validated.data.certificateTypeId,
      institutionId:     institutionId!,
    },
  })

  revalidatePath('/dashboard/processes')
  redirect('/dashboard/processes')
}

export async function updateProcess(id: string, state: ProcessFormState, formData: FormData): Promise<ProcessFormState> {
  await requireInstitution()

  const validated = ProcessSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    certificateTypeId: formData.get('certificateTypeId'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as ProcessFormState['errors'] }

  await prisma.certificateProcess.update({
    where: { id },
    data: {
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      certificateTypeId: validated.data.certificateTypeId,
    },
  })

  revalidatePath('/dashboard/processes')
  return { success: true }
}

export async function toggleProcessStatus(id: string) {
  await requireInstitution()
  const proc = await prisma.certificateProcess.findUnique({ where: { id }, select: { isActive: true } })
  if (!proc) return
  await prisma.certificateProcess.update({ where: { id }, data: { isActive: !proc.isActive } })
  revalidatePath('/dashboard/processes')
}

export async function deleteProcess(id: string) {
  await requireInstitution()
  const certCount = await prisma.certificate.count({ where: { processId: id } })
  if (certCount > 0) return
  await prisma.certificateProcess.delete({ where: { id } })
  revalidatePath('/dashboard/processes')
}

// ── Participantes ─────────────────────────────────────────────────────────────

const ParticipantSchema = z.object({
  studentId: z.string().min(1, { error: 'Selecciona un estudiante.' }),
})

type ParticipantFormState =
  | { errors?: { studentId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function addParticipant(processId: string, state: ParticipantFormState, formData: FormData): Promise<ParticipantFormState> {
  const { institutionId } = await requireInstitution()

  const validated = ParticipantSchema.safeParse({ studentId: formData.get('studentId') })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { studentId?: string[] } }

  const proc = await prisma.certificateProcess.findUnique({ where: { id: processId }, select: { institutionId: true } })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const existing = await prisma.processParticipant.findUnique({
    where: { processId_studentId: { processId, studentId: validated.data.studentId } },
  })
  if (existing) return { message: 'El estudiante ya está en este proceso.' }

  await prisma.processParticipant.create({
    data: { processId, studentId: validated.data.studentId },
  })

  revalidatePath(`/dashboard/processes/${processId}`)
  redirect(`/dashboard/processes/${processId}`)
}

export async function removeParticipant(id: string) {
  await requireInstitution()
  const participant = await prisma.processParticipant.findUnique({
    where: { id },
    select: { processId: true, studentId: true },
  })
  if (!participant) return

  const hasCert = await prisma.certificate.findUnique({
    where: { processId_studentId: { processId: participant.processId, studentId: participant.studentId } },
  })
  if (hasCert) return

  await prisma.processParticipant.delete({ where: { id } })
  revalidatePath(`/dashboard/processes/${participant.processId}`)
}

// ── Import CSV ────────────────────────────────────────────────────────────────

type ImportResult = {
  created: number
  linked: number
  skipped: number
  errors: { row: number; message: string }[]
}

export async function importParticipants(
  processId: string,
  _: unknown,
  formData: FormData
): Promise<{ result?: ImportResult; message?: string }> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({ where: { id: processId }, select: { institutionId: true } })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const file = formData.get('file') as File | null
  if (!file) return { message: 'Selecciona un archivo.' }

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { message: 'El archivo está vacío o no tiene datos.' }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const dniIdx    = header.findIndex(h => h === 'dni' || h === 'cedula' || h === 'cédula')
  const nombreIdx = header.findIndex(h => h.includes('nombre') || h.includes('name'))
  const emailIdx  = header.findIndex(h => h.includes('email') || h.includes('correo'))

  if (dniIdx === -1) return { message: 'El archivo debe tener una columna "DNI".' }

  const result: ImportResult = { created: 0, linked: 0, skipped: 0, errors: [] }

  for (let i = 1; i < lines.length; i++) {
    const cols  = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''))
    const dni   = cols[dniIdx]?.trim()
    const name  = nombreIdx !== -1 ? cols[nombreIdx]?.trim() : undefined
    const email = emailIdx  !== -1 ? cols[emailIdx]?.trim()  : undefined

    if (!dni) {
      result.errors.push({ row: i + 1, message: 'DNI vacío.' })
      continue
    }

    let isNew = false
    let student = await prisma.student.findUnique({ where: { dni } })

    if (!student) {
      if (!name) {
        result.errors.push({ row: i + 1, message: `DNI ${dni}: estudiante no existe y no se proporcionó nombre.` })
        continue
      }
      student = await prisma.student.create({ data: { name, dni, email: email || null } })
      isNew = true
    }

    await prisma.studentEnrollment.upsert({
      where: { studentId_institutionId: { studentId: student.id, institutionId: institutionId! } },
      create: { studentId: student.id, institutionId: institutionId!, careerId: null },
      update: {},
    })

    const existingP = await prisma.processParticipant.findUnique({
      where: { processId_studentId: { processId, studentId: student.id } },
    })

    if (existingP) {
      result.skipped++
    } else {
      await prisma.processParticipant.create({ data: { processId, studentId: student.id } })
      if (isNew) result.created++
      else result.linked++
    }
  }

  revalidatePath(`/dashboard/processes/${processId}`)
  return { result }
}

// ── Generar Certificados ──────────────────────────────────────────────────────

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
  }

  revalidatePath(`/dashboard/processes/${processId}`)
}
```

---

## Task 5: Lista de procesos

**Files:**
- Create: `app/(dashboard)/dashboard/processes/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/process-table.tsx`

- [ ] **Paso 1: Crear page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/page.tsx
import Link from 'next/link'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { ClipboardList, Plus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import ProcessTable from './process-table'

export const metadata = { title: `${PROJECT_NAME} — Procesos` }

export default async function ProcessesPage() {
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const processes = await prisma.certificateProcess.findMany({
    where: institutionId ? { institutionId } : undefined,
    select: {
      id: true,
      name: true,
      date: true,
      isActive: true,
      institution:     { select: { name: true, code: true } },
      certificateType: { select: { name: true } },
      _count: { select: { participants: true, certificates: true } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Procesos de Certificación</h1>
          <p className="text-secondary mt-2">
            {isAdmin ? 'Todos los procesos registrados.' : 'Procesos de tu institución.'}
          </p>
        </div>
        {!isAdmin && (
          <Link href="/dashboard/processes/new"
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm">
            <Plus size={18} strokeWidth={1.75} />
            Nuevo Proceso
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{processes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{processes.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Este año</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {processes.filter(p => new Date(p.date).getFullYear() === new Date().getFullYear()).length}
          </p>
        </div>
      </div>

      {processes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
          <ClipboardList size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay procesos registrados.</p>
          {!isAdmin && <p className="text-xs mt-1">Crea un proceso para comenzar a emitir certificados.</p>}
        </div>
      ) : (
        <ProcessTable processes={processes} showInstitution={isAdmin} isAdmin={isAdmin} />
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Crear process-table.tsx**

```tsx
// app/(dashboard)/dashboard/processes/process-table.tsx
'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleProcessStatus, deleteProcess } from '@/app/actions/processes'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

type Process = {
  id: string
  name: string
  date: Date
  isActive: boolean
  institution: { name: string; code: string }
  certificateType: { name: string }
  _count: { participants: number; certificates: number }
}

function RowActions({ proc, isAdmin }: { proc: Process; isAdmin: boolean }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  if (isAdmin) return null

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/dashboard/processes/${proc.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all" title="Editar">
        <Pencil size={16} strokeWidth={1.75} />
      </Link>
      <button onClick={() => startToggle(() => toggleProcessStatus(proc.id))} disabled={pendingToggle}
        title={proc.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40">
        {pendingToggle ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> :
          proc.isActive
            ? <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
            : <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />}
      </button>
      <button
        onClick={() => {
          if (proc._count.certificates > 0) return alert('No se puede eliminar un proceso con certificados generados.')
          if (confirm(`¿Eliminar "${proc.name}"?`)) startDelete(() => deleteProcess(proc.id))
        }}
        disabled={pendingDelete}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40">
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function ProcessTable({
  processes,
  showInstitution,
  isAdmin,
}: {
  processes: Process[]
  showInstitution: boolean
  isAdmin: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Proceso</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Tipo</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha</th>
            {showInstitution && <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>}
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Participantes</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {processes.map((p) => (
            <tr key={p.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/processes/${p.id}`}
                  className="font-semibold text-on-surface hover:text-primary-container transition-colors"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-block px-2.5 py-1 bg-primary-container/10 text-primary-container rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {p.certificateType.name}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                {new Date(p.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </td>
              {showInstitution && (
                <td className="px-6 py-4 hidden lg:table-cell">
                  <p className="text-sm font-medium">{p.institution.code}</p>
                </td>
              )}
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-flex items-center gap-1.5 text-sm text-secondary">
                  <Users size={14} strokeWidth={1.75} />
                  {p._count.participants}
                  {p._count.certificates > 0 && (
                    <span className="text-emerald-600 font-medium ml-1">({p._count.certificates} certs)</span>
                  )}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {p.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions proc={p} isAdmin={isAdmin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Task 6: Crear y editar proceso

**Files:**
- Create: `app/(dashboard)/dashboard/processes/new/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/new/process-form.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx`

- [ ] **Paso 1: Crear processes/new/page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/new/page.tsx
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import ProcessForm from './process-form'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Proceso` }

export default async function NewProcessPage() {
  const { session } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const certTypes = await prisma.certificateType.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Nuevo Proceso</h1>
        <p className="text-secondary mt-2 text-sm">Crea un proceso de certificación y agrega los estudiantes participantes.</p>
      </div>
      <ProcessForm certTypes={certTypes} />
    </div>
  )
}
```

- [ ] **Paso 2: Crear processes/new/process-form.tsx**

```tsx
// app/(dashboard)/dashboard/processes/new/process-form.tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createProcess } from '@/app/actions/processes'
import { CalendarDays, BadgeCheck, FileText, Loader2, Save } from 'lucide-react'

type CertType = { id: string; name: string }

export default function ProcessForm({ certTypes }: { certTypes: CertType[] }) {
  const [state, action, pending] = useActionState(createProcess, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Proceso *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required placeholder="Ej: Graduación 2026 — Ingeniería"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {certTypes.length > 0 ? (
              <select name="certificateTypeId" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona un tipo...</option>
                {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                No hay tipos activos — el administrador debe crear uno primero.
              </div>
            )}
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
          <div className="relative">
            <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input name="date" type="date" required
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} placeholder="Descripción opcional"
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all resize-none" />
        </div>

        {state?.message && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/processes" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending || certTypes.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Proceso</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Paso 3: Crear processes/[id]/edit/page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/edit/page.tsx
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditProcessForm from './edit-process-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Proceso` }

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const { id } = await params
  const [proc, certTypes] = await Promise.all([
    prisma.certificateProcess.findUnique({ where: { id } }),
    prisma.certificateType.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!proc) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Proceso</h1>
        <p className="text-secondary mt-2 text-sm">{proc.name}</p>
      </div>
      <EditProcessForm
        processId={proc.id}
        defaultName={proc.name}
        defaultDescription={proc.description}
        defaultDate={proc.date.toISOString().split('T')[0]}
        defaultCertificateTypeId={proc.certificateTypeId}
        certTypes={certTypes}
      />
    </div>
  )
}
```

- [ ] **Paso 4: Crear processes/[id]/edit/edit-process-form.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { updateProcess } from '@/app/actions/processes'
import { CalendarDays, BadgeCheck, FileText, Loader2, Save, CheckCircle2 } from 'lucide-react'

type CertType = { id: string; name: string }
type Props = {
  processId: string
  defaultName: string
  defaultDescription: string | null
  defaultDate: string
  defaultCertificateTypeId: string
  certTypes: CertType[]
}

export default function EditProcessForm({ processId, defaultName, defaultDescription, defaultDate, defaultCertificateTypeId, certTypes }: Props) {
  const updateWithId = updateProcess.bind(null, processId)
  const [state, action, pending] = useActionState(updateWithId, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Proceso *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required defaultValue={defaultName}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select name="certificateTypeId" required defaultValue={defaultCertificateTypeId}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
              {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
          <div className="relative">
            <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input name="date" type="date" required defaultValue={defaultDate}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} defaultValue={defaultDescription ?? ''}
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all resize-none" />
        </div>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}
        {state?.success && <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2"><CheckCircle2 size={16} strokeWidth={2} />Proceso actualizado.</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href={`/dashboard/processes/${processId}`} className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## Task 7: Detalle del proceso

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/participant-table.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx`

- [ ] **Paso 1: Crear processes/[id]/page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { CalendarDays, BadgeCheck, Plus, ArrowLeft, Upload } from 'lucide-react'
import ParticipantTable from './participant-table'
import CertificateTable from './certificate-table'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proc = await prisma.certificateProcess.findUnique({ where: { id }, select: { name: true } })
  return { title: `${PROJECT_NAME} — ${proc?.name ?? 'Proceso'}` }
}

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const proc = await prisma.certificateProcess.findUnique({
    where: { id },
    include: {
      institution:     { select: { name: true } },
      certificateType: { select: { name: true } },
      participants: {
        include: { student: { select: { name: true, dni: true } } },
        orderBy: { createdAt: 'asc' },
      },
      certificates: {
        include: {
          student: { select: { name: true, dni: true } },
          career:  { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const pendingCount = proc.participants.filter(p =>
    !proc.certificates.some(c => c.studentId === p.studentId)
  ).length

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard/processes" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Volver a Procesos
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
              {proc.institution.name}
            </span>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} strokeWidth={1.75} />
                {proc.certificateType.name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} strokeWidth={1.75} />
                {new Date(proc.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {proc.description && <p className="text-sm text-secondary mt-2">{proc.description}</p>}
          </div>

          {!isAdmin && (
            <div className="flex gap-3">
              <Link href={`/dashboard/processes/${id}/participants/import`}
                className="inline-flex items-center gap-2 border border-primary-container text-primary-container hover:bg-primary-container/5 font-bold py-3 px-5 rounded-lg transition-all text-sm">
                <Upload size={16} strokeWidth={1.75} />
                Importar CSV
              </Link>
              <Link href={`/dashboard/processes/${id}/participants/new`}
                className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-5 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm">
                <Plus size={16} strokeWidth={1.75} />
                Agregar Estudiante
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Participantes</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{proc.participants.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tighter">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Certificados</p>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tighter">{proc.certificates.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">En Blockchain</p>
          <p className="text-3xl font-extrabold text-blue-600 tracking-tighter">{proc.certificates.filter(c => c.status === 'REGISTERED').length}</p>
        </div>
      </div>

      <div className="space-y-8">
        <ParticipantTable
          participants={proc.participants}
          processId={id}
          isAdmin={isAdmin}
          certifiedIds={proc.certificates.map(c => c.studentId)}
          pendingCount={pendingCount}
        />
        {proc.certificates.length > 0 && (
          <CertificateTable certificates={proc.certificates} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Crear processes/[id]/participant-table.tsx**

`certifiedIds` es un array de `studentId` (no de `participantId`). La página pasa `proc.certificates.map(c => c.studentId)` y la tabla compara contra `p.studentId`.

```tsx
// app/(dashboard)/dashboard/processes/[id]/participant-table.tsx
'use client'

import { useTransition } from 'react'
import { removeParticipant, generateCertificates } from '@/app/actions/processes'
import { Users, Trash2, Loader2, Award } from 'lucide-react'

type Participant = {
  id: string
  studentId: string
  student: { name: string; dni: string }
}

function RowActions({ participant, isCertified, isAdmin }: { participant: Participant; isCertified: boolean; isAdmin: boolean }) {
  const [pending, startDelete] = useTransition()
  if (isAdmin || isCertified) return null

  return (
    <button
      onClick={() => {
        if (confirm(`¿Quitar a "${participant.student.name}" del proceso?`))
          startDelete(() => removeParticipant(participant.id))
      }}
      disabled={pending}
      className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
      title="Quitar"
    >
      {pending ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
    </button>
  )
}

export default function ParticipantTable({
  participants,
  processId,
  isAdmin,
  certifiedIds,
  pendingCount,
}: {
  participants: Participant[]
  processId: string
  isAdmin: boolean
  certifiedIds: string[]
  pendingCount: number
}) {
  const [pendingGen, startGen] = useTransition()
  const certifiedSet = new Set(certifiedIds)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2">
          <Users size={20} strokeWidth={1.75} />
          Participantes
        </h2>
        {!isAdmin && pendingCount > 0 && (
          <button
            onClick={() => startGen(() => generateCertificates(processId))}
            disabled={pendingGen}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg transition-all text-sm disabled:opacity-60"
          >
            {pendingGen
              ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Generando...</>
              : <><Award size={16} strokeWidth={1.75} />Generar {pendingCount} Certificado{pendingCount !== 1 ? 's' : ''}</>}
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
          <Users size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay participantes en este proceso.</p>
          {!isAdmin && <p className="text-xs mt-1">Agrega estudiantes con el botón "Agregar Estudiante" o importa un CSV.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-lowest">
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">DNI</th>
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Certificado</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {participants.map((p) => {
                const hasCert = certifiedSet.has(p.studentId)
                return (
                  <tr key={p.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-on-surface">{p.student.name}</td>
                    <td className="px-6 py-4 text-secondary hidden md:table-cell">{p.student.dni}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${hasCert ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {hasCert ? 'Generado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <RowActions participant={p} isCertified={hasCert} isAdmin={isAdmin} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Paso 3: Crear processes/[id]/certificate-table.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx
'use client'

import { FileText, Download } from 'lucide-react'

type Certificate = {
  id: string
  status: 'PENDING' | 'ISSUED' | 'REGISTERED'
  issuedAt: Date | null
  student: { name: string; dni: string }
  career: { name: string } | null
}

const statusStyles: Record<Certificate['status'], string> = {
  PENDING:    'bg-amber-50 text-amber-700',
  ISSUED:     'bg-emerald-50 text-emerald-700',
  REGISTERED: 'bg-blue-50 text-blue-700',
}
const statusLabels: Record<Certificate['status'], string> = {
  PENDING:    'Pendiente',
  ISSUED:     'Emitido',
  REGISTERED: 'En Blockchain',
}

export default function CertificateTable({
  certificates,
  isAdmin,
}: {
  certificates: Certificate[]
  isAdmin: boolean
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2 mb-4">
        <FileText size={20} strokeWidth={1.75} />
        Certificados Generados
      </h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-lowest">
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha emisión</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {certificates.map((c) => (
              <tr key={c.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-on-surface">{c.student.name}</p>
                  <p className="text-xs text-secondary mt-0.5">{c.student.dni}</p>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden md:table-cell">
                  {c.career?.name ?? <span className="text-outline/60 italic">Sin carrera</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyles[c.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusLabels[c.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                  {c.issuedAt
                    ? new Date(c.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/api/certificates/${c.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all inline-flex"
                    title="Descargar PDF"
                  >
                    <Download size={16} strokeWidth={1.75} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Task 8: Agregar participante (uno por uno)

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/new/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/new/participant-form.tsx`

- [ ] **Paso 1: Crear participants/new/page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/participants/new/page.tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import ParticipantForm from './participant-form'

export const metadata = { title: `${PROJECT_NAME} — Agregar Estudiante` }

export default async function NewParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { id: true, name: true, institutionId: true },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const existingParticipants = await prisma.processParticipant.findMany({
    where: { processId },
    select: { studentId: true },
  })
  const participantIds = new Set(existingParticipants.map(p => p.studentId))

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { institutionId: proc.institutionId },
    include: {
      student: { select: { id: true, name: true, dni: true, isActive: true } },
      career:  { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const available = enrollments
    .filter(e => e.student.isActive && !participantIds.has(e.student.id))
    .map(e => ({
      id:     e.student.id,
      name:   e.student.name,
      dni:    e.student.dni,
      career: e.career?.name ?? null,
    }))

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Agregar Participante</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>
      <ParticipantForm processId={processId} students={available} />
    </div>
  )
}
```

- [ ] **Paso 2: Crear participants/new/participant-form.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/participants/new/participant-form.tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { addParticipant } from '@/app/actions/processes'
import { GraduationCap, Loader2, UserPlus } from 'lucide-react'

type Student = { id: string; name: string; dni: string; career: string | null }

export default function ParticipantForm({ processId, students }: { processId: string; students: Student[] }) {
  const boundAction = addParticipant.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante *</label>
          <div className="relative">
            <GraduationCap size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {students.length > 0 ? (
              <select name="studentId" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona un estudiante...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.dni}{s.career ? ` (${s.career})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                Todos los estudiantes matriculados ya están en este proceso.
              </div>
            )}
          </div>
          {state?.errors?.studentId && <p className="text-xs text-error">{state.errors.studentId[0]}</p>}
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href={`/dashboard/processes/${processId}`}
            className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={pending || students.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending
              ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Agregando...</>
              : <><UserPlus size={16} strokeWidth={1.75} />Agregar al Proceso</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## Task 9: Importar participantes (CSV)

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/import/page.tsx`
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/import/import-form.tsx`

- [ ] **Paso 1: Crear participants/import/page.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/participants/import/page.tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import ImportForm from './import-form'

export const metadata = { title: `${PROJECT_NAME} — Importar Participantes` }

export default async function ImportParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { id: true, name: true, institutionId: true },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Importar Participantes</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>
      <ImportForm processId={processId} />
    </div>
  )
}
```

- [ ] **Paso 2: Crear participants/import/import-form.tsx**

```tsx
// app/(dashboard)/dashboard/processes/[id]/participants/import/import-form.tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { importParticipants } from '@/app/actions/processes'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ImportForm({ processId }: { processId: string }) {
  const boundAction = importParticipants.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
        <form action={action} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Archivo CSV o Excel *</label>
            <input
              type="file"
              name="file"
              accept=".csv,.txt"
              required
              className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg text-sm text-on-surface file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
            />
            <p className="text-xs text-secondary">
              Columnas requeridas: <code className="font-mono bg-surface-container px-1 rounded">DNI</code> y <code className="font-mono bg-surface-container px-1 rounded">Nombre</code> (si el estudiante no existe).
              Opcional: <code className="font-mono bg-surface-container px-1 rounded">Email</code>.
            </p>
          </div>

          {state?.message && (
            <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg flex items-center gap-2">
              <AlertCircle size={16} strokeWidth={2} />
              {state.message}
            </div>
          )}

          <div className="flex justify-end items-center gap-4 pt-2">
            <Link href={`/dashboard/processes/${processId}`}
              className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={pending}
              className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
              {pending
                ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Importando...</>
                : <><Upload size={16} strokeWidth={1.75} />Importar</>}
            </button>
          </div>
        </form>
      </div>

      {state?.result && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-surface-container space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 size={18} strokeWidth={2} />
            Importación completada
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-2xl font-extrabold text-emerald-700">{state.result.created}</p>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1">Creados</p>
            </div>
            <div className="bg-primary-container/10 rounded-lg p-4">
              <p className="text-2xl font-extrabold text-primary-container">{state.result.linked}</p>
              <p className="text-xs text-primary-container font-bold uppercase tracking-wider mt-1">Vinculados</p>
            </div>
            <div className="bg-surface-container rounded-lg p-4">
              <p className="text-2xl font-extrabold text-secondary">{state.result.skipped}</p>
              <p className="text-xs text-secondary font-bold uppercase tracking-wider mt-1">Ya existían</p>
            </div>
          </div>
          {state.result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold text-error mb-2">Errores ({state.result.errors.length}):</p>
              <div className="space-y-1">
                {state.result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-error bg-error-container/10 px-3 py-1.5 rounded">
                    Fila {e.row}: {e.message}
                  </p>
                ))}
              </div>
            </div>
          )}
          <Link href={`/dashboard/processes/${processId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-container hover:underline mt-2">
            ← Ver el proceso
          </Link>
        </div>
      )}
    </div>
  )
}
```

---

## Task 10: Actualizar navegación y proxy

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `proxy.ts`

- [ ] **Paso 1: Actualizar layout.tsx — reemplazar Eventos por Procesos**

En `app/(dashboard)/layout.tsx`, realizar estos cambios:

Reemplazar en el import de lucide-react: `CalendarDays` → `ClipboardList`

Reemplazar en `mainLinks`:
```tsx
{ href: '/dashboard/events', icon: CalendarDays, label: 'Eventos', universityOnly: true },
```
por:
```tsx
{ href: '/dashboard/processes', icon: ClipboardList, label: 'Procesos', universityOnly: true },
```

- [ ] **Paso 2: Actualizar proxy.ts — reemplazar rutas de events por processes**

En `proxy.ts`, reemplazar:
```ts
const universityRoutes = ['/dashboard/careers', '/dashboard/students/new', '/dashboard/events/new']
```
por:
```ts
const universityRoutes = [
  '/dashboard/careers',
  '/dashboard/students/new',
  '/dashboard/processes/new',
  '/dashboard/processes/',
]
```

> Nota: `/dashboard/processes/` con barra final cubre `/dashboard/processes/[id]/participants/new` y `/dashboard/processes/[id]/participants/import` y `/dashboard/processes/[id]/edit` ya que `startsWith` lo matchea.

---

## Verificación final

- [ ] **Reiniciar el servidor de desarrollo**

```bash
pnpm dev
```

- [ ] **Verificar flujo como UNIVERSITY**

1. Login con `utpl@universidad.edu.ec` / `University123!`
2. Sidebar muestra "Procesos" (no "Eventos")
3. `/dashboard/processes` → lista vacía con botón "Nuevo Proceso"
4. Crear un proceso → aparece en la lista
5. Click en nombre del proceso → detalle con tabla vacía de participantes
6. Agregar estudiante → aparece en la tabla como "Pendiente"
7. Botón "Generar Certificados" → cambia a "Generado", aparece tabla de certificados
8. Descargar PDF → archivo válido
9. Importar CSV → resultado con creados/vinculados/errores

- [ ] **Verificar que `/dashboard/events` devuelve 404**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/events
```

Salida esperada: `307` (redirect a login por falta de sesión, correcto — la ruta ya no existe como página)
