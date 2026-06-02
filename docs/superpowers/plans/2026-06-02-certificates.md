# Certificados (Fase 3) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir emisión de certificados digitales dentro de eventos: un certificado vincula un estudiante a un evento, genera un `dataHash` SHA-256 para uso futuro en blockchain, y produce un PDF descargable.

**Architecture:** El modelo `Certificate` vive entre `Event` y `Student`. Al crearlo se calcula inmediatamente el `dataHash` y se marca como `ISSUED`. La generación de PDF ocurre bajo demanda via route handler usando `pdf-lib`. Las páginas nuevas siguen el patrón Server Component + Client Table existente en el proyecto.

**Tech Stack:** Next.js 16 App Router, Prisma 7, `pdf-lib`, `crypto` (nativo Node.js), Tailwind CSS 4, Zod 4, TypeScript.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` |
| Crear | `prisma/migrations/<timestamp>_add_certificates/migration.sql` (auto) |
| Crear | `app/lib/certificate-hash.ts` |
| Crear | `app/lib/pdf.ts` |
| Crear | `app/actions/certificates.ts` |
| Crear | `app/api/certificates/[id]/pdf/route.ts` |
| Crear | `app/(dashboard)/dashboard/events/[id]/page.tsx` |
| Crear | `app/(dashboard)/dashboard/events/[id]/certificate-table.tsx` |
| Crear | `app/(dashboard)/dashboard/events/[id]/certificates/new/page.tsx` |
| Crear | `app/(dashboard)/dashboard/events/[id]/certificates/new/certificate-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/events/event-table.tsx` |

---

## Task 1: Schema Prisma + Migración

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Paso 1: Añadir enum y modelo Certificate al schema**

Agregar al final de `prisma/schema.prisma`, antes del modelo `User`:

```prisma
enum CertificateStatus {
  PENDING
  ISSUED
  REGISTERED
}

model Certificate {
  id        String            @id @default(uuid())
  status    CertificateStatus @default(PENDING)
  dataHash  String            @unique
  issuedAt  DateTime?
  createdAt DateTime          @default(now())

  eventId    String
  event      Event            @relation(fields: [eventId], references: [id])

  studentId  String
  student    Student          @relation(fields: [studentId], references: [id])

  careerId   String?
  career     Career?          @relation(fields: [careerId], references: [id])

  issuedById String
  issuedBy   User             @relation(fields: [issuedById], references: [id])

  @@unique([eventId, studentId])
}
```

- [ ] **Paso 2: Actualizar relaciones inversas en modelos existentes**

En el modelo `Event` (después de `certificateTypeId`):
```prisma
  certificates      Certificate[]
```

En el modelo `Student` (después de `enrollments`):
```prisma
  certificates      Certificate[]
```

En el modelo `Career` (después de `enrollments`):
```prisma
  certificates      Certificate[]
```

En el modelo `User` (al final, antes del cierre `}`):
```prisma
  issuedCertificates Certificate[]
```

- [ ] **Paso 3: Ejecutar migración**

```bash
pnpm prisma migrate dev --name add_certificates
```

Salida esperada:
```
✔ Generated Prisma Client
```

- [ ] **Paso 4: Verificar que el cliente Prisma se generó correctamente**

```bash
node -e "const { PrismaClient } = require('./app/generated/prisma'); const p = new PrismaClient(); console.log(typeof p.certificate);"
```

Salida esperada: `function`

- [ ] **Paso 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Certificate model and CertificateStatus enum"
```

---

## Task 2: Utilidad dataHash

**Files:**
- Create: `app/lib/certificate-hash.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// app/lib/certificate-hash.ts
import { createHash } from 'crypto'

export interface CertHashInput {
  id: string
  studentName: string
  studentDni: string
  careerName: string | null
  eventName: string
  eventDate: Date
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
    input.eventName,
    input.eventDate.toISOString(),
    input.issuedAt.toISOString(),
    input.institutionName,
    input.certificateTypeName,
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}
```

- [ ] **Paso 2: Verificar que produce un hash estable**

```bash
node -e "
const { createHash } = require('crypto');
const parts = ['id1','Juan Pérez','1234567','Sistemas','Graduación 2026',new Date('2026-06-01').toISOString(),new Date('2026-06-02').toISOString(),'UTPL','Título de Grado'];
const h1 = createHash('sha256').update(parts.join('|')).digest('hex');
const h2 = createHash('sha256').update(parts.join('|')).digest('hex');
console.log(h1 === h2 ? 'OK: hash estable' : 'ERROR');
"
```

Salida esperada: `OK: hash estable`

- [ ] **Paso 3: Commit**

```bash
git add app/lib/certificate-hash.ts
git commit -m "feat: add certificate dataHash utility"
```

---

## Task 3: Server Actions

**Files:**
- Create: `app/actions/certificates.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// app/actions/certificates.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { computeDataHash } from '@/app/lib/certificate-hash'

const Schema = z.object({
  studentId: z.string().min(1, { error: 'Selecciona un estudiante.' }),
})

type FormState =
  | { errors?: { studentId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createCertificate(
  eventId: string,
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') return { message: 'Solo universidades pueden emitir certificados.' }

  const validated = Schema.safeParse({ studentId: formData.get('studentId') })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { studentId?: string[] } }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      institution: { select: { name: true } },
      certificateType: { select: { name: true } },
    },
  })
  if (!event || event.institutionId !== institutionId) return { message: 'Evento no encontrado.' }

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: {
      studentId_institutionId: {
        studentId: validated.data.studentId,
        institutionId: institutionId!,
      },
    },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
    },
  })
  if (!enrollment) return { message: 'Estudiante no matriculado en esta institución.' }

  const existing = await prisma.certificate.findUnique({
    where: { eventId_studentId: { eventId, studentId: validated.data.studentId } },
  })
  if (existing) return { message: 'El estudiante ya tiene un certificado en este evento.' }

  const issuedAt = new Date()
  const id = crypto.randomUUID()

  const dataHash = computeDataHash({
    id,
    studentName: enrollment.student.name,
    studentDni: enrollment.student.dni,
    careerName: enrollment.career?.name ?? null,
    eventName: event.name,
    eventDate: event.date,
    issuedAt,
    institutionName: event.institution.name,
    certificateTypeName: event.certificateType.name,
  })

  await prisma.certificate.create({
    data: {
      id,
      status: 'ISSUED',
      dataHash,
      issuedAt,
      eventId,
      studentId: validated.data.studentId,
      careerId: enrollment.careerId ?? null,
      issuedById: session.userId,
    },
  })

  revalidatePath(`/dashboard/events/${eventId}`)
  redirect(`/dashboard/events/${eventId}`)
}

export async function deleteCertificate(id: string) {
  await requireInstitution()
  const cert = await prisma.certificate.findUnique({
    where: { id },
    select: { status: true, eventId: true },
  })
  if (!cert || cert.status === 'REGISTERED') return
  await prisma.certificate.delete({ where: { id } })
  revalidatePath(`/dashboard/events/${cert.eventId}`)
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/actions/certificates.ts
git commit -m "feat: add certificate server actions"
```

---

## Task 4: Generación de PDF

**Files:**
- Create: `app/lib/pdf.ts`
- Create: `app/api/certificates/[id]/pdf/route.ts`

- [ ] **Paso 1: Instalar pdf-lib**

```bash
pnpm add pdf-lib
```

Verificar que aparece en `package.json` bajo `dependencies`.

- [ ] **Paso 2: Crear app/lib/pdf.ts**

```ts
// app/lib/pdf.ts
import 'server-only'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

const BRAND  = rgb(0.10, 0.20, 0.60)
const DARK   = rgb(0.08, 0.08, 0.12)
const GRAY   = rgb(0.45, 0.45, 0.52)
const ACCENT = rgb(0.95, 0.70, 0.10)
const WHITE  = rgb(1, 1, 1)

export interface CertificatePdfData {
  id: string
  studentName: string
  studentDni: string
  careerName: string | null
  eventName: string
  eventDate: Date
  institutionName: string
  certificateTypeName: string
  issuedAt: Date
}

export async function generateCertificatePdf(cert: CertificatePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  // A4 landscape: 841.89 x 595.28 pt
  const page = doc.addPage([841.89, 595.28])
  const { width, height } = page.getSize()

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  // Fondo blanco
  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE })

  // Banda lateral izquierda
  page.drawRectangle({ x: 0, y: 0, width: 180, height, color: BRAND })

  // Borde superior derecho
  page.drawRectangle({ x: 180, y: height - 8, width: width - 180, height: 8, color: ACCENT })

  // Borde inferior derecho
  page.drawRectangle({ x: 180, y: 0, width: width - 180, height: 6, color: BRAND })

  // Marca de agua
  page.drawText('CERTIFICADO', {
    x: 280, y: 200, size: 72, font: fontBold,
    color: rgb(0.92, 0.93, 0.97), rotate: degrees(-28), opacity: 0.3,
  })

  // Sidebar: nombre institución vertical
  page.drawText(cert.institutionName.toUpperCase(), {
    x: 28, y: height / 2, size: 9, font: fontBold,
    color: WHITE, rotate: degrees(90),
    maxWidth: height - 80,
  })

  // Tipo de certificado en sidebar
  page.drawText(cert.certificateTypeName.toUpperCase(), {
    x: 50, y: 80, size: 8, font: fontRegular,
    color: rgb(0.8, 0.85, 1),
    maxWidth: 120,
  })

  // Contenido principal
  const cx = 220

  // Institución
  page.drawText(cert.institutionName.toUpperCase(), {
    x: cx, y: height - 80, size: 9, font: fontBold,
    color: GRAY, characterSpacing: 2,
  })

  // Título
  page.drawText('Certificado', {
    x: cx, y: height - 130, size: 42, font: fontBold, color: BRAND,
  })

  // Tipo
  page.drawText(cert.certificateTypeName, {
    x: cx, y: height - 165, size: 13, font: fontOblique, color: GRAY,
  })

  // Línea separadora
  page.drawLine({ start: { x: cx, y: height - 185 }, end: { x: cx + 400, y: height - 185 }, thickness: 1, color: rgb(0.85, 0.87, 0.92) })

  // Se certifica que
  page.drawText('Se certifica que', {
    x: cx, y: height - 220, size: 11, font: fontRegular, color: GRAY,
  })

  // Nombre estudiante
  page.drawText(cert.studentName, {
    x: cx, y: height - 265, size: 30, font: fontBold, color: DARK, maxWidth: 560,
  })

  // DNI
  page.drawText(`DNI: ${cert.studentDni}`, {
    x: cx, y: height - 295, size: 10, font: fontRegular, color: GRAY,
  })

  // Carrera
  if (cert.careerName) {
    page.drawText(cert.careerName, {
      x: cx, y: height - 315, size: 11, font: fontRegular, color: DARK,
    })
  }

  // Evento
  const eventLine = `participó en "${cert.eventName}"`
  page.drawText(eventLine, {
    x: cx, y: height - 350, size: 11, font: fontRegular, color: DARK, maxWidth: 560,
  })

  // Fecha del evento
  const eventDateStr = new Date(cert.eventDate).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  page.drawText(eventDateStr, {
    x: cx, y: height - 370, size: 10, font: fontRegular, color: GRAY,
  })

  // Línea separadora inferior
  page.drawLine({ start: { x: cx, y: height - 415 }, end: { x: cx + 400, y: height - 415 }, thickness: 1, color: rgb(0.85, 0.87, 0.92) })

  // Fecha de emisión y ID
  const issuedDateStr = new Date(cert.issuedAt).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  page.drawText(`Emitido el ${issuedDateStr}`, {
    x: cx, y: height - 438, size: 8, font: fontRegular, color: GRAY,
  })
  page.drawText(`ID: ${cert.id}`, {
    x: cx, y: height - 453, size: 7, font: fontRegular, color: rgb(0.7, 0.7, 0.75),
  })

  return doc.save()
}
```

- [ ] **Paso 3: Crear app/api/certificates/[id]/pdf/route.ts**

```ts
// app/api/certificates/[id]/pdf/route.ts
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
      event: {
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
    eventName: cert.event.name,
    eventDate: cert.event.date,
    institutionName: cert.event.institution.name,
    certificateTypeName: cert.event.certificateType.name,
    issuedAt: cert.issuedAt ?? cert.createdAt,
  })

  const filename = `certificado-${cert.student.name.toLowerCase().replace(/\s+/g, '-')}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Paso 4: Commit**

```bash
git add app/lib/pdf.ts "app/api/certificates/[id]/pdf/route.ts" package.json pnpm-lock.yaml
git commit -m "feat: add PDF generation for certificates"
```

---

## Task 5: Página detalle del evento + tabla de certificados

**Files:**
- Create: `app/(dashboard)/dashboard/events/[id]/page.tsx`
- Create: `app/(dashboard)/dashboard/events/[id]/certificate-table.tsx`

- [ ] **Paso 1: Crear app/(dashboard)/dashboard/events/[id]/page.tsx**

```tsx
// app/(dashboard)/dashboard/events/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { CalendarDays, MapPin, BadgeCheck, Plus, ArrowLeft } from 'lucide-react'
import CertificateTable from './certificate-table'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id }, select: { name: true } })
  return { title: `${PROJECT_NAME} — ${event?.name ?? 'Evento'}` }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      institution: { select: { name: true } },
      certificateType: { select: { name: true } },
      certificates: {
        include: {
          student: { select: { name: true, dni: true } },
          career: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!event) notFound()
  if (institutionId && event.institutionId !== institutionId) notFound()

  const issued     = event.certificates.filter(c => c.status === 'ISSUED').length
  const registered = event.certificates.filter(c => c.status === 'REGISTERED').length

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Volver a Eventos
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
              {event.institution.name}
            </span>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{event.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} strokeWidth={1.75} />
                {event.certificateType.name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} strokeWidth={1.75} />
                {new Date(event.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={1.75} />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {!isAdmin && (
            <Link
              href={`/dashboard/events/${id}/certificates/new`}
              className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
            >
              <Plus size={18} strokeWidth={1.75} />
              Emitir Certificado
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{event.certificates.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Emitidos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{issued}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">En Blockchain</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{registered}</p>
        </div>
      </div>

      <CertificateTable certificates={event.certificates} eventId={id} isAdmin={isAdmin} />
    </div>
  )
}
```

- [ ] **Paso 2: Crear app/(dashboard)/dashboard/events/[id]/certificate-table.tsx**

```tsx
// app/(dashboard)/dashboard/events/[id]/certificate-table.tsx
'use client'

import { useTransition } from 'react'
import { deleteCertificate } from '@/app/actions/certificates'
import { FileText, Trash2, Download, Loader2 } from 'lucide-react'

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

function RowActions({ cert, isAdmin }: { cert: Certificate; isAdmin: boolean }) {
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <a
        href={`/api/certificates/${cert.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Descargar PDF"
      >
        <Download size={16} strokeWidth={1.75} />
      </a>
      {!isAdmin && cert.status !== 'REGISTERED' && (
        <button
          onClick={() => {
            if (confirm(`¿Eliminar certificado de "${cert.student.name}"?`))
              startDelete(() => deleteCertificate(cert.id))
          }}
          disabled={pendingDelete}
          className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
          title="Eliminar"
        >
          {pendingDelete
            ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            : <Trash2 size={16} strokeWidth={1.75} />}
        </button>
      )}
    </div>
  )
}

export default function CertificateTable({
  certificates,
  eventId,
  isAdmin,
}: {
  certificates: Certificate[]
  eventId: string
  isAdmin: boolean
}) {
  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <FileText size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">No hay certificados emitidos aún.</p>
        {!isAdmin && <p className="text-xs mt-1">Usa el botón "Emitir Certificado" para añadir estudiantes.</p>}
      </div>
    )
  }

  return (
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
                <RowActions cert={c} isAdmin={isAdmin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Paso 3: Commit**

```bash
git add "app/(dashboard)/dashboard/events/[id]/page.tsx" "app/(dashboard)/dashboard/events/[id]/certificate-table.tsx"
git commit -m "feat: add event detail page with certificate list"
```

---

## Task 6: Formulario de emisión de certificado

**Files:**
- Create: `app/(dashboard)/dashboard/events/[id]/certificates/new/page.tsx`
- Create: `app/(dashboard)/dashboard/events/[id]/certificates/new/certificate-form.tsx`

- [ ] **Paso 1: Crear el directorio y la page**

```tsx
// app/(dashboard)/dashboard/events/[id]/certificates/new/page.tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import CertificateForm from './certificate-form'

export const metadata = { title: `${PROJECT_NAME} — Emitir Certificado` }

export default async function NewCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/events/${eventId}`)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, institutionId: true },
  })
  if (!event) notFound()
  if (institutionId && event.institutionId !== institutionId) notFound()

  const existingCerts = await prisma.certificate.findMany({
    where: { eventId },
    select: { studentId: true },
  })
  const certifiedIds = new Set(existingCerts.map(c => c.studentId))

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { institutionId: event.institutionId },
    include: {
      student: { select: { id: true, name: true, dni: true, isActive: true } },
      career: { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const available = enrollments
    .filter(e => e.student.isActive && !certifiedIds.has(e.student.id))
    .map(e => ({
      id: e.student.id,
      name: e.student.name,
      dni: e.student.dni,
      career: e.career?.name ?? null,
    }))

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          ← Volver al evento
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Emitir Certificado</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{event.name}</h1>
      </div>
      <CertificateForm eventId={eventId} students={available} />
    </div>
  )
}
```

- [ ] **Paso 2: Crear el form**

```tsx
// app/(dashboard)/dashboard/events/[id]/certificates/new/certificate-form.tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createCertificate } from '@/app/actions/certificates'
import { GraduationCap, Loader2, Award } from 'lucide-react'

type Student = { id: string; name: string; dni: string; career: string | null }

export default function CertificateForm({
  eventId,
  students,
}: {
  eventId: string
  students: Student[]
}) {
  const boundAction = createCertificate.bind(null, eventId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Estudiante *
          </label>
          <div className="relative">
            <GraduationCap size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {students.length > 0 ? (
              <select
                name="studentId"
                required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecciona un estudiante...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.dni}{s.career ? ` (${s.career})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                Todos los estudiantes matriculados ya tienen certificado en este evento.
              </div>
            )}
          </div>
          {state?.errors?.studentId && (
            <p className="text-xs text-error">{state.errors.studentId[0]}</p>
          )}
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="text-sm font-bold text-secondary hover:text-on-surface transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pending || students.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm"
          >
            {pending
              ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Emitiendo...</>
              : <><Award size={16} strokeWidth={1.75} />Emitir Certificado</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Paso 3: Commit**

```bash
git add "app/(dashboard)/dashboard/events/[id]/certificates/"
git commit -m "feat: add certificate emission form"
```

---

## Task 7: Enlace a detalle desde la tabla de eventos

**Files:**
- Modify: `app/(dashboard)/dashboard/events/event-table.tsx`

- [ ] **Paso 1: Hacer el nombre del evento un link al detalle**

En `event-table.tsx`, reemplazar la celda del nombre del evento:

```tsx
// Reemplazar:
<td className="px-6 py-4">
  <p className="font-semibold text-on-surface">{e.name}</p>
  {e.location && <p className="text-xs text-secondary mt-0.5">{e.location}</p>}
</td>

// Por:
<td className="px-6 py-4">
  <Link
    href={`/dashboard/events/${e.id}`}
    className="font-semibold text-on-surface hover:text-primary-container transition-colors"
  >
    {e.name}
  </Link>
  {e.location && <p className="text-xs text-secondary mt-0.5">{e.location}</p>}
</td>
```

Asegurarse de que `Link` está importado en la parte superior del archivo:
```tsx
import Link from 'next/link'
```

- [ ] **Paso 2: Commit**

```bash
git add "app/(dashboard)/dashboard/events/event-table.tsx"
git commit -m "feat: link event name to detail page"
```

---

## Task 8: Verificación final

- [ ] **Paso 1: Levantar el servidor de desarrollo**

```bash
pnpm dev
```

- [ ] **Paso 2: Verificar flujo completo como UNIVERSITY**

1. Login con `utpl@universidad.edu.ec` / `University123!`
2. Ir a `/dashboard/events` → debe verse la lista de eventos
3. Hacer click en el nombre de un evento → debe ir a `/dashboard/events/[id]`
4. Click en "Emitir Certificado" → seleccionar un estudiante → submit
5. El certificado debe aparecer en la tabla con estado `EMITIDO`
6. Click en el ícono de descarga → debe descargarse un PDF con los datos del certificado

- [ ] **Paso 3: Verificar restricciones como ADMIN**

1. Login con `admin@chaskicert.com` / `Admin123!`
2. Ir a `/dashboard/events/[cualquier-id]` → debe ver la tabla de certificados
3. NO debe ver el botón "Emitir Certificado" ni el botón de eliminar

- [ ] **Paso 4: Commit final del feature**

```bash
git add .
git commit -m "Fase 3 - Emisión de Certificados."
```
